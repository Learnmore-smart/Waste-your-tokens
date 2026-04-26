'use client'

import { useState, useCallback, useRef } from 'react'
import { tokensToCost, tokensToCarbonGrams, carbonToMiles, carbonToTrees } from '@/lib/conversions'
import { getRandomPrompt } from '@/lib/promptPool'
import { decryptApiKey, isEncrypted } from '@/lib/crypto'
import type { Settings } from './useSettings'

export interface BurnRecord {
  id: string
  timestamp: number
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
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
  history: BurnRecord[]
}

const STATE_STORAGE_KEY = 'waste-tokens-state'
const HISTORY_STORAGE_KEY = 'waste-tokens-history'
const SETTINGS_KEY = 'waste-tokens-settings'

interface BurnResponse {
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
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
    history: [],
  }

  if (typeof window === 'undefined') return defaults

  try {
    const stored = localStorage.getItem(STATE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...defaults, ...parsed }
    }
  } catch {}

  try {
    const histStored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (histStored) {
      defaults.history = JSON.parse(histStored)
    }
  } catch {}

  return defaults
}

export function useTokenBurner() {
  const [state, setState] = useState<BurnState>(() => loadInitialState())
  const [isBurning, setIsBurning] = useState<boolean>(false)
  const [isAutoBurning, setIsAutoBurning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const autoBurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoBurnStopRef = useRef<boolean>(false)

  const persistState = useCallback((newState: Partial<BurnState>) => {
    setState((prev) => {
      const merged = { ...prev, ...newState }
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({
        totalTokens: merged.totalTokens,
        totalCalls: merged.totalCalls,
        promptTokens: merged.promptTokens,
        completionTokens: merged.completionTokens,
        estimatedCost: merged.estimatedCost,
        carbonGrams: merged.carbonGrams,
        milesDriven: merged.milesDriven,
        treesNeeded: merged.treesNeeded,
      }))
      if (merged.history) {
        const trimmed = merged.history.slice(-100)
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed))
      }
      return merged
    })
  }, [])

  const burn = useCallback(async (): Promise<boolean> => {
    setIsBurning(true)
    setError(null)

    try {
      const settingsRaw = localStorage.getItem(SETTINGS_KEY)
      const settings: Settings = settingsRaw
        ? JSON.parse(settingsRaw)
        : { apiKey: '', model: 'gpt-5.4', baseUrl: 'https://api.openai.com', customModel: '', maxTokens: 4096, temperature: 1.0, thinkingBudget: 0, prompt: '' }

      if (isEncrypted(settings.apiKey)) {
        settings.apiKey = await decryptApiKey(settings.apiKey)
      }

      if (!settings.apiKey) {
        setError('No API key configured')
        setIsBurning(false)
        return false
      }

      const prompt = getRandomPrompt()

      abortControllerRef.current = new AbortController()

      const res = await fetch('/api/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          thinkingBudget: settings.thinkingBudget,
          prompt,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || `Request failed with status ${res.status}`)
        return false
      }

      const data: BurnResponse = await res.json()
      const model = data.model || settings.model

      setState((prev) => {
        const newTotalTokens = prev.totalTokens + data.total_tokens
        const newTotalCalls = prev.totalCalls + 1
        const newPromptTokens = prev.promptTokens + data.prompt_tokens
        const newCompletionTokens = prev.completionTokens + data.completion_tokens
        const newCost = tokensToCost(newPromptTokens, newCompletionTokens, model)
        const newCarbon = tokensToCarbonGrams(newTotalTokens)
        const newMiles = carbonToMiles(newCarbon)
        const newTrees = carbonToTrees(newCarbon)

        const record: BurnRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          model,
          promptTokens: data.prompt_tokens,
          completionTokens: data.completion_tokens,
          totalTokens: data.total_tokens,
          cost: tokensToCost(data.prompt_tokens, data.completion_tokens, model),
        }

        const newHistory = [record, ...prev.history].slice(-100)

        const merged = {
          totalTokens: newTotalTokens,
          totalCalls: newTotalCalls,
          promptTokens: newPromptTokens,
          completionTokens: newCompletionTokens,
          estimatedCost: newCost,
          carbonGrams: newCarbon,
          milesDriven: newMiles,
          treesNeeded: newTrees,
          history: newHistory,
        }

        localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({
          totalTokens: merged.totalTokens,
          totalCalls: merged.totalCalls,
          promptTokens: merged.promptTokens,
          completionTokens: merged.completionTokens,
          estimatedCost: merged.estimatedCost,
          carbonGrams: merged.carbonGrams,
          milesDriven: merged.milesDriven,
          treesNeeded: merged.treesNeeded,
        }))
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged.history.slice(-100)))

        return merged
      })

      return true
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false
      }
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      return false
    } finally {
      setIsBurning(false)
      abortControllerRef.current = null
    }
  }, [])

  const startAutoBurn = useCallback((delayMs: number = 2000) => {
    autoBurnStopRef.current = false
    setIsAutoBurning(true)
    setError(null)

    const loop = async () => {
      if (autoBurnStopRef.current) {
        setIsAutoBurning(false)
        return
      }

      const success = await burn()

      if (autoBurnStopRef.current) {
        setIsAutoBurning(false)
        return
      }

      if (!success) {
        setIsAutoBurning(false)
        return
      }

      autoBurnTimerRef.current = setTimeout(loop, delayMs)
    }

    loop()
  }, [burn])

  const stopBurn = useCallback(() => {
    autoBurnStopRef.current = true
    if (autoBurnTimerRef.current) {
      clearTimeout(autoBurnTimerRef.current)
      autoBurnTimerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsBurning(false)
    setIsAutoBurning(false)
  }, [])

  const resetStats = useCallback(() => {
    persistState({
      totalTokens: 0,
      totalCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0,
      carbonGrams: 0,
      milesDriven: 0,
      treesNeeded: 0,
      history: [],
    })
    setError(null)
  }, [persistState])

  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return {
    totalTokens: state.totalTokens,
    totalCalls: state.totalCalls,
    promptTokens: state.promptTokens,
    completionTokens: state.completionTokens,
    estimatedCost: state.estimatedCost,
    carbonGrams: state.carbonGrams,
    milesDriven: state.milesDriven,
    treesNeeded: state.treesNeeded,
    history: state.history,
    isBurning,
    isAutoBurning,
    error,
    burn,
    startAutoBurn,
    stopBurn,
    resetStats,
    dismissError,
  }
}
