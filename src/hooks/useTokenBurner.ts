'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { tokensToCost, tokensToCarbonGrams, carbonToDrivingKm, carbonToTrees } from '@/lib/conversions'
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

/** Max concurrent burn-stream agents (parallel prompts per round). */
export const MAX_PARALLEL_AGENTS = 10
const MAX_PARALLEL = MAX_PARALLEL_AGENTS
const emptyMulti = (): StreamCachePayload[] =>
  Array.from({ length: MAX_PARALLEL }, () => emptyStream())

type StreamCacheV3 = { v: 3; single: StreamCachePayload; multi: StreamCachePayload[] }

function parseSlot(o: unknown): StreamCachePayload {
  if (!o || typeof o !== 'object') return emptyStream()
  const r = o as Record<string, unknown>
  return {
    text: typeof r.text === 'string' ? r.text : '',
    thought: typeof r.thought === 'string' ? r.thought : '',
  }
}

function loadStreamCacheV3(): StreamCacheV3 {
  if (typeof window === 'undefined') {
    return { v: 3, single: emptyStream(), multi: emptyMulti() }
  }
  try {
    const raw = localStorage.getItem(STREAM_CACHE_KEY)
    if (!raw) return { v: 3, single: emptyStream(), multi: emptyMulti() }
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object') {
      return { v: 3, single: emptyStream(), multi: emptyMulti() }
    }
    const o = p as Record<string, unknown>
    if (o.v === 3 && o.single && Array.isArray(o.multi)) {
      const s = o.single as Record<string, unknown>
      const arr = o.multi as unknown[]
      const multi = emptyMulti()
      for (let i = 0; i < Math.min(MAX_PARALLEL, arr.length); i++) {
        multi[i] = parseSlot(arr[i])
      }
      return {
        v: 3,
        single: {
          text: typeof s.text === 'string' ? s.text : '',
          thought: typeof s.thought === 'string' ? s.thought : '',
        },
        multi,
      }
    }
    // v2: duo pair
    if (o.v === 2 && o.single && o.duo && Array.isArray(o.duo) && o.duo.length === 2) {
      const s = o.single as Record<string, unknown>
      const a = o.duo[0] as Record<string, unknown>
      const b = o.duo[1] as Record<string, unknown>
      const multi = emptyMulti()
      multi[0] = {
        text: typeof a.text === 'string' ? a.text : '',
        thought: typeof a.thought === 'string' ? a.thought : '',
      }
      multi[1] = {
        text: typeof b.text === 'string' ? b.text : '',
        thought: typeof b.thought === 'string' ? b.thought : '',
      }
      return {
        v: 3,
        single: {
          text: typeof s.text === 'string' ? s.text : '',
          thought: typeof s.thought === 'string' ? s.thought : '',
        },
        multi,
      }
    }
    // legacy v1: { text, thought }
    return {
      v: 3,
      single: {
        text: typeof o.text === 'string' ? o.text : '',
        thought: typeof o.thought === 'string' ? o.thought : '',
      },
      multi: emptyMulti(),
    }
  } catch {
    return { v: 3, single: emptyStream(), multi: emptyMulti() }
  }
}

interface BurnState {
  totalTokens: number
  totalCalls: number
  promptTokens: number
  completionTokens: number
  estimatedCost: number
  carbonGrams: number
  drivingKm: number
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
    drivingKm: 0,
    treesNeeded: 0,
  }
  if (typeof window === 'undefined') return defaults
  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<BurnState>
      const merged = { ...defaults, ...parsed }
      merged.drivingKm = carbonToDrivingKm(merged.carbonGrams)
      merged.treesNeeded = carbonToTrees(merged.carbonGrams)
      return merged
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
      drivingKm: merged.drivingKm,
      treesNeeded: merged.treesNeeded,
    })
  )
}

type AwaitState =
  | { mode: 'single'; v: boolean }
  | { mode: 'multi'; pending: boolean[] }

export function useTokenBurner(parallelCount: number) {
  const nParallel = Math.min(MAX_PARALLEL, Math.max(1, Math.floor(parallelCount)))

  const [state, setState] = useState<BurnState>(() => loadInitialState())
  const [isBurning, setIsBurning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<StreamCachePayload>(() => loadStreamCacheV3().single)
  const [multiStream, setMultiStream] = useState<StreamCachePayload[]>(() => loadStreamCacheV3().multi)
  const [awaiting, setAwaiting] = useState<AwaitState>({ mode: 'single', v: false })

  const loopActiveRef = useRef(false)
  const abortRef = useRef<AbortController[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        STREAM_CACHE_KEY,
        JSON.stringify({
          v: 3,
          single: stream,
          multi: multiStream,
        } satisfies StreamCacheV3)
      )
    } catch {
      // ignore quota / private mode
    }
  }, [stream, multiStream])

  useEffect(() => {
    if (isBurning) return
    if (nParallel === 1) {
      setAwaiting({ mode: 'single', v: false })
    } else {
      setAwaiting({ mode: 'multi', pending: Array(nParallel).fill(false) })
    }
  }, [nParallel, isBurning])

  /** Extracted token delta from one stream; shared by single + multi. */
  function usageFieldsFromSnapshot(
    model: string,
    snap: SseStreamSnapshot,
    promptText: string
  ): { model: string; promptDelta: number; completionDelta: number; totalDelta: number } {
    const u = snap.usage
    let pt = Number(u?.prompt_tokens ?? u?.input_tokens ?? 0) || 0
    let ct = Number(u?.completion_tokens ?? u?.output_tokens ?? 0) || 0
    let tt = Number(u?.total_tokens ?? 0) || 0

    if (tt === 0 && (pt > 0 || ct > 0)) tt = pt + ct
    // Some providers only send total_tokens; without split, cost/impact (cost uses prompt+completion) stay at 0.
    if (tt > 0 && pt === 0 && ct === 0) {
      pt = Math.floor(tt / 2)
      ct = tt - pt
    }

    // ── Sanity-check: many providers only report prompt_tokens in SSE streaming
    //    and send completion_tokens as 0.  When we have actual streamed content
    //    but the reported count is suspiciously low, use text-based estimation.
    const outputTextLen = snap.text.length + snap.thought.length
    if (outputTextLen > 0) {
      const est = estimateTokensFromText(promptText, snap.text, snap.thought)

      // Provider didn't report completion usage → use estimation.
      if (ct === 0) {
        ct = est.completion_tokens
      } else if (ct > 0 && outputTextLen > ct * 20) {
        // Reported completion_tokens is absurdly small relative to actual output
        // (< 1 token per 20 chars is impossible) → boost with estimation.
        ct = Math.max(ct, est.completion_tokens)
      }

      if (pt === 0) {
        pt = est.prompt_tokens
      }

      tt = pt + ct
    }

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
        const newDrivingKm = carbonToDrivingKm(newCarbon)
        const newTrees = carbonToTrees(newCarbon)
        const merged: BurnState = {
          totalTokens: newTotalTokens,
          totalCalls: newTotalCalls,
          promptTokens: newPromptTokens,
          completionTokens: newCompletionTokens,
          estimatedCost: newCost,
          carbonGrams: newCarbon,
          drivingKm: newDrivingKm,
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

  /** One stream for squad/duo slot; runs independently of other agents (no Promise.all between slots). */
  const runSlotStreamRound = useCallback(
    async (slot: number, nSlots: number, signal: AbortSignal): Promise<RoundOutcome> => {
      setAwaiting((prev) => {
        if (prev.mode !== 'multi' || prev.pending.length !== nSlots) {
          return { mode: 'multi', pending: Array(nSlots).fill(false) }
        }
        const nextP = [...prev.pending]
        if (slot < nextP.length) nextP[slot] = true
        return { mode: 'multi', pending: nextP }
      })

      const built = await readSettingsForRound()
      if (!built.ok) {
        setAwaiting((prev) => {
          if (prev.mode !== 'multi' || prev.pending.length !== nSlots) return prev
          const nextP = [...prev.pending]
          if (slot < nextP.length) nextP[slot] = false
          return { mode: 'multi', pending: nextP }
        })
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
        setAwaiting((prev) => {
          if (prev.mode !== 'multi' || prev.pending.length !== nSlots) return prev
          const nextP = [...prev.pending]
          if (slot < nextP.length) nextP[slot] = false
          return { mode: 'multi', pending: nextP }
        })
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
          setAwaiting((prev) => {
            if (prev.mode !== 'multi' || prev.pending.length !== nSlots) return prev
            if (slot >= prev.pending.length) return prev
            if (!prev.pending[slot]) return prev
            const nextP = [...prev.pending]
            nextP[slot] = false
            return { mode: 'multi', pending: nextP }
          })
          setMultiStream((prev) => {
            const next = [...prev]
            if (slot < next.length) next[slot] = { text: u.text, thought: u.thought }
            return next
          })
        },
        signal
      )

      setAwaiting((prev) => {
        if (prev.mode !== 'multi' || prev.pending.length !== nSlots) return prev
        const nextP = [...prev.pending]
        if (slot < nextP.length) nextP[slot] = false
        return { mode: 'multi', pending: nextP }
      })
      const m = snap.model || model
      applyUsageToState({ model: m, snap, promptText: prompt })
      return { kind: 'ok' }
    },
    [applyUsageToState, readSettingsForRound]
  )

  const startBurning = useCallback(() => {
    if (loopActiveRef.current) return
    loopActiveRef.current = true
    setError(null)
    setIsBurning(true)

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const run = async () => {
      const n = nParallel
      const abortAll = () => {
        for (const c of abortRef.current) {
          c.abort()
        }
      }

      const runSoloMainLoop = async () => {
        let backoffAttempt = 0
        while (loopActiveRef.current) {
          const c = new AbortController()
          abortRef.current = [c]
          try {
            const outcome = await runOneStreamRound(c.signal)
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
              setAwaiting({ mode: 'single', v: false })
              break
            }
            setAwaiting({ mode: 'single', v: false })
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
      }

      const runSlotWorker = async (slot: number) => {
        let backoffAttempt = 0
        while (loopActiveRef.current) {
          const c = new AbortController()
          if (abortRef.current.length !== n) {
            abortRef.current = Array.from({ length: n }, () => new AbortController())
          }
          abortRef.current[slot] = c
          try {
            const outcome = await runSlotStreamRound(slot, n, c.signal)
            if (!loopActiveRef.current) break
            if (outcome.kind === 'fatal') {
              setError(outcome.message)
              loopActiveRef.current = false
              abortAll()
              break
            }
            if (outcome.kind === 'retry') {
              backoffAttempt += 1
              const extra = Math.min(30_000, 800 * 2 ** Math.min(backoffAttempt, 6))
              const wait = outcome.delayMs + extra
              const line = `Agent ${slot + 1}: ${outcome.message} — ${backoffAttempt > 0 ? 'Will retry' : 'Retrying'} in ${(wait / 1000).toFixed(1)}s.`
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
              setAwaiting({ mode: 'multi', pending: Array(n).fill(false) })
              break
            }
            setAwaiting({ mode: 'multi', pending: Array(n).fill(false) })
            backoffAttempt += 1
            const wait = Math.min(20_000, 1500 * 2 ** Math.min(backoffAttempt, 5))
            const line = `Agent ${slot + 1}: ${err instanceof Error ? err.message : 'Network error'} — Retrying in ${(wait / 1000).toFixed(1)}s…`
            setError(null)
            toast.warning(line, {
              duration: Math.min(25_000, wait + 3_000),
            })
            await sleep(wait)
          }
        }
      }

      if (n === 1) {
        await runSoloMainLoop()
      } else {
        abortRef.current = Array.from({ length: n }, () => new AbortController())
        await Promise.all(Array.from({ length: n }, (_, slot) => runSlotWorker(slot)))
      }

      loopActiveRef.current = false
      setIsBurning(false)
      abortRef.current = []
    }
    void run()
  }, [runOneStreamRound, runSlotStreamRound, nParallel])

  const stopBurn = useCallback(() => {
    loopActiveRef.current = false
    for (const c of abortRef.current) {
      c.abort()
    }
    abortRef.current = []
    setAwaiting(
      nParallel > 1
        ? { mode: 'multi', pending: Array(nParallel).fill(false) }
        : { mode: 'single', v: false }
    )
    setIsBurning(false)
  }, [nParallel])

  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  const resetStreamCache = useCallback(() => {
    setStream(emptyStream())
    setMultiStream(emptyMulti())
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STREAM_CACHE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const isAwaitingStream = awaiting.mode === 'single' ? awaiting.v : false
  const isAwaitingParallel: boolean[] | null =
    awaiting.mode === 'multi' ? awaiting.pending : null

  return {
    totalTokens: state.totalTokens,
    totalCalls: state.totalCalls,
    promptTokens: state.promptTokens,
    completionTokens: state.completionTokens,
    estimatedCost: state.estimatedCost,
    carbonGrams: state.carbonGrams,
    drivingKm: state.drivingKm,
    treesNeeded: state.treesNeeded,
    isBurning,
    error,
    streamText: stream.text,
    streamThought: stream.thought,
    streamMulti: multiStream,
    isAwaitingStream,
    isAwaitingParallel,
    resetStreamCache,
    startBurning,
    stopBurn,
    dismissError,
  }
}
