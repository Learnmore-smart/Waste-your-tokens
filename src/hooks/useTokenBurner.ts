'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { tokensToCost, tokensToCarbonGrams, carbonToMiles, carbonToTrees } from '@/lib/conversions'
import { getRandomPrompt } from '@/lib/promptPool'
import { decryptApiKey, isEncrypted } from '@/lib/crypto'
import { withBasePath } from '@/lib/basePath'
import { consumeOpenAiSse, estimateTokensFromText, type SseStreamSnapshot } from '@/lib/parseOpenAiSseStream'
import { normalizeStoredSettings, type Settings } from './useSettings'

const SETTINGS_KEY = 'waste-tokens-settings'
const STATE_STORAGE_KEY = 'waste-tokens-state'
const STREAM_CACHE_KEY = 'waste-tokens-stream-cache'

export interface StreamCachePayload {
  text: string
  thought: string
}

const emptyStream = (): StreamCachePayload => ({ text: '', thought: '' })

type StreamCacheV2 = { v: 2; single: StreamCachePayload; duo: [StreamCachePayload, StreamCachePayload] }

function loadStreamCacheV2(): StreamCacheV2 {
  if (typeof window === 'undefined') {
    return { v: 2, single: emptyStream(), duo: [emptyStream(), emptyStream()] }
  }
  try {
    const raw = localStorage.getItem(STREAM_CACHE_KEY)
    if (!raw) return { v: 2, single: emptyStream(), duo: [emptyStream(), emptyStream()] }
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object') {
      return { v: 2, single: emptyStream(), duo: [emptyStream(), emptyStream()] }
    }
    const o = p as Record<string, unknown>
    if (o.v === 2 && o.single && o.duo && Array.isArray(o.duo) && o.duo.length === 2) {
      const s = o.single as Record<string, unknown>
      const a = o.duo[0] as Record<string, unknown>
      const b = o.duo[1] as Record<string, unknown>
      return {
        v: 2,
        single: {
          text: typeof s.text === 'string' ? s.text : '',
          thought: typeof s.thought === 'string' ? s.thought : '',
        },
        duo: [
          {
            text: typeof a.text === 'string' ? a.text : '',
            thought: typeof a.thought === 'string' ? a.thought : '',
          },
          {
            text: typeof b.text === 'string' ? b.text : '',
            thought: typeof b.thought === 'string' ? b.thought : '',
          },
        ],
      }
    }
    // legacy v1: { text, thought }
    return {
      v: 2,
      single: {
        text: typeof o.text === 'string' ? o.text : '',
        thought: typeof o.thought === 'string' ? o.thought : '',
      },
      duo: [emptyStream(), emptyStream()],
    }
  } catch {
    return { v: 2, single: emptyStream(), duo: [emptyStream(), emptyStream()] }
  }
}

interface BurnState {
  totalTokens: number
  totalCalls: number
  promptTokens: number
  completionTokens: number
  estimatedCost: number
  carbonGrams: number
  milesDriven: number
  treesNeeded: number
}

function defaultSettings(): Settings {
  return {
    apiKey: '',
    model: 'gpt-5.4',
    baseUrl: 'https://api.openai.com/v1',
    customModel: '',
    thinkingLevel: 'off',
    temperature: 1.0,
    prompt: '',
    selectedProvider: '',
  }
}

function loadInitialState(): BurnState {
  const defaults: BurnState = {
    totalTokens: 0,
    totalCalls: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0,
    carbonGrams: 0,
    milesDriven: 0,
    treesNeeded: 0,
  }
  if (typeof window === 'undefined') return defaults
  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...defaults, ...parsed }
    }
  } catch {}
  return defaults
}

function persistMergedState(merged: BurnState) {
  localStorage.setItem(
    STATE_STORAGE_KEY,
    JSON.stringify({
      totalTokens: merged.totalTokens,
      totalCalls: merged.totalCalls,
      promptTokens: merged.promptTokens,
      completionTokens: merged.completionTokens,
      estimatedCost: merged.estimatedCost,
      carbonGrams: merged.carbonGrams,
      milesDriven: merged.milesDriven,
      treesNeeded: merged.treesNeeded,
    })
  )
}

type AwaitState =
  | { mode: 'single'; v: boolean }
  | { mode: 'duo'; a: boolean; b: boolean }

export function useTokenBurner(duoMode: boolean) {
  const [state, setState] = useState<BurnState>(() => loadInitialState())
  const [isBurning, setIsBurning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<StreamCachePayload>(() => loadStreamCacheV2().single)
  const [duoStream, setDuoStream] = useState<[StreamCachePayload, StreamCachePayload]>(() => {
    const d = loadStreamCacheV2().duo
    return d
  })
  const [awaiting, setAwaiting] = useState<AwaitState>({ mode: 'single', v: false })

  const loopActiveRef = useRef(false)
  const abortRef = useRef<AbortController[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        STREAM_CACHE_KEY,
        JSON.stringify({
          v: 2,
          single: stream,
          duo: duoStream,
        } satisfies StreamCacheV2)
      )
    } catch {
      // ignore quota / private mode
    }
  }, [stream, duoStream])

  useEffect(() => {
    if (isBurning) return
    setAwaiting(duoMode ? { mode: 'duo', a: false, b: false } : { mode: 'single', v: false })
  }, [duoMode, isBurning])

  /** Extracted token delta from one stream; shared by single + duo. */
  function usageFieldsFromSnapshot(
    model: string,
    snap: SseStreamSnapshot,
    promptText: string
  ): { model: string; promptDelta: number; completionDelta: number; totalDelta: number } {
    let pt = snap.usage?.prompt_tokens ?? 0
    let ct = snap.usage?.completion_tokens ?? 0
    let tt = snap.usage?.total_tokens ?? 0
    if (tt === 0 && (pt > 0 || ct > 0)) tt = pt + ct
    if (tt === 0) {
      const est = estimateTokensFromText(promptText, snap.text, snap.thought)
      pt = est.prompt_tokens
      ct = est.completion_tokens
      tt = est.total_tokens
    }
    return { model, promptDelta: pt, completionDelta: ct, totalDelta: tt }
  }

  const applyUsageToState = useCallback(
    (params: {
      model: string
      snap: SseStreamSnapshot
      promptText: string
    }) => {
      const { model, snap, promptText } = params
      const u = usageFieldsFromSnapshot(model, snap, promptText)
      setState((prev) => {
        const newTotalTokens = prev.totalTokens + u.totalDelta
        const newTotalCalls = prev.totalCalls + 1
        const newPromptTokens = prev.promptTokens + u.promptDelta
        const newCompletionTokens = prev.completionTokens + u.completionDelta
        const newCost = tokensToCost(newPromptTokens, newCompletionTokens, model)
        const newCarbon = tokensToCarbonGrams(newTotalTokens)
        const newMiles = carbonToMiles(newCarbon)
        const newTrees = carbonToTrees(newCarbon)
        const merged: BurnState = {
          totalTokens: newTotalTokens,
          totalCalls: newTotalCalls,
          promptTokens: newPromptTokens,
          completionTokens: newCompletionTokens,
          estimatedCost: newCost,
          carbonGrams: newCarbon,
          milesDriven: newMiles,
          treesNeeded: newTrees,
        }
        persistMergedState(merged)
        return merged
      })
    },
    []
  )

  /** One state update for 1–2 duo streams. Pricing model matches the old `apply` ×2 behavior (use slot B if present, else the only slot). */
  const applyDuoPairUsageToState = useCallback(
    (a: { model: string; snap: SseStreamSnapshot; promptText: string } | null, b: typeof a) => {
      if (!a && !b) return
      setState((prev) => {
        let totalTokens = prev.totalTokens
        let totalCalls = prev.totalCalls
        let promptTokens = prev.promptTokens
        let completionTokens = prev.completionTokens
        for (const item of [a, b] as const) {
          if (!item) continue
          const m = item.snap.model || item.model
          const u = usageFieldsFromSnapshot(m, item.snap, item.promptText)
          totalTokens += u.totalDelta
          totalCalls += 1
          promptTokens += u.promptDelta
          completionTokens += u.completionDelta
        }
        const second = b ?? a!
        const pricingModel = second.snap.model || second.model
        const newCost = tokensToCost(promptTokens, completionTokens, pricingModel)
        const newCarbon = tokensToCarbonGrams(totalTokens)
        const newMiles = carbonToMiles(newCarbon)
        const newTrees = carbonToTrees(newCarbon)
        const merged: BurnState = {
          totalTokens: totalTokens,
          totalCalls: totalCalls,
          promptTokens: promptTokens,
          completionTokens: completionTokens,
          estimatedCost: newCost,
          carbonGrams: newCarbon,
          milesDriven: newMiles,
          treesNeeded: newTrees,
        }
        persistMergedState(merged)
        return merged
      })
    },
    []
  )

  type RoundOutcome =
    | { kind: 'ok' }
    | { kind: 'fatal'; message: string }
    | { kind: 'retry'; message: string; delayMs: number }

  const readSettingsForRound = useCallback(async (): Promise<
    | { ok: true; settings: Settings; model: string }
    | { ok: false; message: string }
  > => {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const s: Settings = raw
      ? normalizeStoredSettings(JSON.parse(raw) as Record<string, unknown>)
      : defaultSettings()
    if (isEncrypted(s.apiKey)) s.apiKey = await decryptApiKey(s.apiKey)
    if (!s.apiKey) return { ok: false, message: 'No API key configured' }
    const model = s.model === 'custom' ? s.customModel : s.model
    if (!model?.trim()) return { ok: false, message: 'No model configured' }
    return { ok: true, settings: s, model: model.trim() }
  }, [])

  const runOneStreamRound = useCallback(
    async (signal: AbortSignal): Promise<RoundOutcome> => {
      setAwaiting({ mode: 'single', v: true })

      const built = await readSettingsForRound()
      if (!built.ok) {
        setAwaiting({ mode: 'single', v: false })
        return { kind: 'fatal', message: built.message }
      }
      const { settings: s, model } = built
      const prompt = getRandomPrompt()

      const res = await fetch(withBasePath('/api/burn-stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: s.apiKey,
          baseUrl: s.baseUrl,
          model,
          temperature: s.temperature,
          thinkingLevel: s.thinkingLevel,
          prompt,
        }),
        signal,
      })

      if (!res.ok) {
        setAwaiting({ mode: 'single', v: false })
        const errData = await res.json().catch(() => ({}))
        const msg =
          (errData as { error?: string }).error || `Request failed with status ${res.status}`
        if (res.status === 401) {
          return { kind: 'fatal', message: msg }
        }
        if (res.status === 429) {
          return { kind: 'retry', message: msg, delayMs: 5_000 }
        }
        if (res.status >= 500) {
          return { kind: 'retry', message: msg, delayMs: 2_500 }
        }
        return { kind: 'retry', message: msg, delayMs: 1_500 }
      }

      const snap = await consumeOpenAiSse(
        res.body,
        (u) => {
          setAwaiting({ mode: 'single', v: false })
          setStream({ text: u.text, thought: u.thought })
        },
        signal
      )

      setAwaiting({ mode: 'single', v: false })
      const m = snap.model || model
      applyUsageToState({ model: m, snap, promptText: prompt })
      return { kind: 'ok' }
    },
    [applyUsageToState, readSettingsForRound]
  )

  const runDuoStreamRound = useCallback(
    async (signalA: AbortSignal, signalB: AbortSignal): Promise<RoundOutcome> => {
      setAwaiting({ mode: 'duo', a: true, b: true })

      const built = await readSettingsForRound()
      if (!built.ok) {
        setAwaiting({ mode: 'duo', a: false, b: false })
        return { kind: 'fatal', message: built.message }
      }
      const { settings: s, model } = built
      const prompt0 = getRandomPrompt()
      const prompt1 = getRandomPrompt()

      const doFetch = (
        slot: 0 | 1,
        prompt: string,
        signal: AbortSignal
      ): Promise<
        | { kind: 'ok'; snap: Awaited<ReturnType<typeof consumeOpenAiSse>>; model: string; prompt: string }
        | { kind: 'http'; res: Response }
      > => {
        return (async () => {
          const res = await fetch(withBasePath('/api/burn-stream'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: s.apiKey,
              baseUrl: s.baseUrl,
              model,
              temperature: s.temperature,
              thinkingLevel: s.thinkingLevel,
              prompt,
            }),
            signal,
          })
          if (!res.ok) return { kind: 'http' as const, res }
          const snap = await consumeOpenAiSse(
            res.body,
            (u) => {
              setAwaiting((prev) => {
                if (prev.mode !== 'duo') return prev
                if (slot === 0) return prev.a ? { ...prev, a: false } : prev
                return prev.b ? { ...prev, b: false } : prev
              })
              setDuoStream((prev) => {
                const next: [StreamCachePayload, StreamCachePayload] = [...prev]
                next[slot] = { text: u.text, thought: u.thought }
                return next
              })
            },
            signal
          )
          return { kind: 'ok' as const, snap, model, prompt }
        })()
      }

      const [r0, r1] = await Promise.all([doFetch(0, prompt0, signalA), doFetch(1, prompt1, signalB)])

      const handleHttp = async (r: { kind: 'http'; res: Response }) => {
        setAwaiting({ mode: 'duo', a: false, b: false })
        const errData = await r.res.json().catch(() => ({}))
        const msg =
          (errData as { error?: string }).error || `Request failed with status ${r.res.status}`
        if (r.res.status === 401) return { kind: 'fatal' as const, message: msg }
        if (r.res.status === 429) {
          return { kind: 'retry' as const, message: msg, delayMs: 5_000 }
        }
        if (r.res.status >= 500) {
          return { kind: 'retry' as const, message: msg, delayMs: 2_500 }
        }
        return { kind: 'retry' as const, message: msg, delayMs: 1_500 }
      }

      const okPayload = (
        r: (typeof r0) & { kind: 'ok' }
      ): { model: string; snap: SseStreamSnapshot; promptText: string } => ({
        model: r.model,
        snap: r.snap,
        promptText: r.prompt,
      })

      applyDuoPairUsageToState(
        r0.kind === 'ok' ? okPayload(r0) : null,
        r1.kind === 'ok' ? okPayload(r1) : null
      )

      if (r0.kind === 'http') {
        return handleHttp(r0)
      }
      if (r1.kind === 'http') {
        return handleHttp(r1)
      }

      setAwaiting({ mode: 'duo', a: false, b: false })
      return { kind: 'ok' }
    },
    [applyDuoPairUsageToState, readSettingsForRound]
  )

  const startBurning = useCallback(() => {
    if (loopActiveRef.current) return
    loopActiveRef.current = true
    setError(null)
    setIsBurning(true)

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const run = async () => {
      let backoffAttempt = 0
      while (loopActiveRef.current) {
        const a = new AbortController()
        const b = new AbortController()
        abortRef.current = duoMode ? [a, b] : [a]
        try {
          const outcome = duoMode
            ? await runDuoStreamRound(a.signal, b.signal)
            : await runOneStreamRound(a.signal)
          if (!loopActiveRef.current) break
          if (outcome.kind === 'fatal') {
            setError(outcome.message)
            break
          }
          if (outcome.kind === 'retry') {
            backoffAttempt += 1
            const extra = Math.min(30_000, 800 * 2 ** Math.min(backoffAttempt, 6))
            const wait = outcome.delayMs + extra
            const line = `${outcome.message} — ${backoffAttempt > 0 ? 'Will retry' : 'Retrying'} in ${(wait / 1000).toFixed(1)}s (agent loop, click Stop to end).`
            setError(null)
            toast.warning(line, {
              duration: Math.min(30_000, wait + 4_000),
            })
            if (!loopActiveRef.current) break
            await sleep(wait)
            if (!loopActiveRef.current) break
            continue
          }
          backoffAttempt = 0
          setError(null)
          await sleep(350)
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            setAwaiting(duoMode ? { mode: 'duo', a: false, b: false } : { mode: 'single', v: false })
            break
          }
          setAwaiting(duoMode ? { mode: 'duo', a: false, b: false } : { mode: 'single', v: false })
          backoffAttempt += 1
          const wait = Math.min(20_000, 1500 * 2 ** Math.min(backoffAttempt, 5))
          const line = `${err instanceof Error ? err.message : 'Network error'} — Retrying in ${(wait / 1000).toFixed(1)}s…`
          setError(null)
          toast.warning(line, {
            duration: Math.min(25_000, wait + 3_000),
          })
          await sleep(wait)
        }
      }
      loopActiveRef.current = false
      setIsBurning(false)
      abortRef.current = []
    }
    void run()
  }, [runOneStreamRound, runDuoStreamRound, duoMode])

  const stopBurn = useCallback(() => {
    loopActiveRef.current = false
    for (const c of abortRef.current) {
      c.abort()
    }
    abortRef.current = []
    setAwaiting(duoMode ? { mode: 'duo', a: false, b: false } : { mode: 'single', v: false })
    setIsBurning(false)
  }, [duoMode])

  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  const resetStreamCache = useCallback(() => {
    setStream(emptyStream())
    setDuoStream([emptyStream(), emptyStream()])
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STREAM_CACHE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const isAwaitingStream = awaiting.mode === 'single' ? awaiting.v : false
  const isAwaitingDuo: [boolean, boolean] | null =
    awaiting.mode === 'duo' ? [awaiting.a, awaiting.b] : null

  return {
    totalTokens: state.totalTokens,
    totalCalls: state.totalCalls,
    promptTokens: state.promptTokens,
    completionTokens: state.completionTokens,
    estimatedCost: state.estimatedCost,
    carbonGrams: state.carbonGrams,
    milesDriven: state.milesDriven,
    treesNeeded: state.treesNeeded,
    isBurning,
    error,
    streamText: stream.text,
    streamThought: stream.thought,
    streamDuo: duoStream,
    isAwaitingStream,
    isAwaitingDuo,
    resetStreamCache,
    startBurning,
    stopBurn,
    dismissError,
  }
}
