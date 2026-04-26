'use client'

import { useState, useCallback, useEffect } from 'react'
import { encryptApiKey, decryptApiKey, isEncrypted } from '@/lib/crypto'
import { THINKING_LEVELS, type ThinkingLevel } from '@/lib/thinkingLevel'

export type { ThinkingLevel }

export interface Settings {
  apiKey: string
  model: string
  baseUrl: string
  customModel: string
  thinkingLevel: ThinkingLevel
  temperature: number
  prompt: string
  /** Stable dropdown; Base URL still wins for matching. */
  selectedProvider?: string
}

const STORAGE_KEY = 'waste-tokens-settings'
const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'gpt-5.4',
  baseUrl: 'https://api.openai.com/v1',
  customModel: '',
  thinkingLevel: 'off',
  temperature: 1.0,
  prompt: '',
  selectedProvider: '',
}

function migrateToThinkingLevel(parsed: Record<string, unknown>): ThinkingLevel {
  if (
    typeof parsed.thinkingLevel === 'string' &&
    (THINKING_LEVELS as readonly string[]).includes(parsed.thinkingLevel)
  ) {
    return parsed.thinkingLevel as ThinkingLevel
  }
  const b = parsed.thinkingBudget
  if (typeof b === 'number') {
    if (b <= 0) return 'off'
    if (b < 12_000) return 'high'
    if (b < 50_000) return 'xhigh'
    return 'max'
  }
  return 'off'
}

/** Normalizes raw localStorage JSON (handles legacy `maxTokens` / `thinkingBudget`). */
export function normalizeStoredSettings(parsed: Record<string, unknown>): Settings {
  const { maxTokens: _a, thinkingBudget: _b, ...rest } = parsed
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    thinkingLevel: migrateToThinkingLevel({ ...DEFAULT_SETTINGS, ...parsed }),
  } as Settings
}

function loadRawSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: Record<string, unknown> = JSON.parse(stored)
      return normalizeStoredSettings(parsed)
    }
  } catch {}
  return DEFAULT_SETTINGS
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const raw = loadRawSettings()
    if (raw.apiKey && isEncrypted(raw.apiKey)) {
      return { ...raw, apiKey: '' }
    }
    return raw
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isKeyReady, setIsKeyReady] = useState(false)

  useEffect(() => {
    const raw = loadRawSettings()
    if (raw.apiKey && isEncrypted(raw.apiKey)) {
      decryptApiKey(raw.apiKey).then((decrypted) => {
        setSettings((prev) => ({ ...prev, apiKey: decrypted }))
        setIsKeyReady(true)
      })
    } else {
      setIsKeyReady(true)
    }
  }, [])

  const saveSettings = useCallback(async (newSettings: Settings) => {
    const encryptedApiKey = await encryptApiKey(newSettings.apiKey)
    const toStore = { ...newSettings, apiKey: encryptedApiKey }
    setSettings(newSettings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  }, [])

  const getDecryptedApiKey = useCallback(async (): Promise<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const apiKey: string = parsed.apiKey || ''
        if (isEncrypted(apiKey)) {
          return await decryptApiKey(apiKey)
        }
        return apiKey
      }
    } catch {}
    return ''
  }, [])

  const loadDecryptedSettings = useCallback(async (): Promise<Settings> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Record<string, unknown> = JSON.parse(stored)
        const apiKey: string = (parsed.apiKey as string) || ''
        const decryptedApiKey = isEncrypted(apiKey) ? await decryptApiKey(apiKey) : apiKey
        return { ...normalizeStoredSettings(parsed), apiKey: decryptedApiKey }
      }
    } catch {}
    return DEFAULT_SETTINGS
  }, [])

  const openSettings = useCallback(() => setIsSettingsOpen(true), [])
  const closeSettings = useCallback(() => setIsSettingsOpen(false), [])

  return {
    settings,
    isSettingsOpen,
    isKeyReady,
    openSettings,
    closeSettings,
    saveSettings,
    getDecryptedApiKey,
    loadDecryptedSettings,
  }
}
