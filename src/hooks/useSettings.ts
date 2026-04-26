'use client'

import { useState, useCallback, useEffect } from 'react'
import { encryptApiKey, decryptApiKey, isEncrypted } from '@/lib/crypto'

export interface Settings {
  apiKey: string
  model: string
  baseUrl: string
  customModel: string
  maxTokens: number
  temperature: number
  thinkingBudget: number
  prompt: string
}

const STORAGE_KEY = 'waste-tokens-settings'
const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'gpt-5.4',
  baseUrl: 'https://api.openai.com',
  customModel: '',
  maxTokens: 4096,
  temperature: 1.0,
  thinkingBudget: 0,
  prompt: '',
}

function loadRawSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: Partial<Settings> = JSON.parse(stored)
      return { ...DEFAULT_SETTINGS, ...parsed }
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
        const parsed: Partial<Settings> = JSON.parse(stored)
        const apiKey: string = parsed.apiKey || ''
        const decryptedApiKey = isEncrypted(apiKey) ? await decryptApiKey(apiKey) : apiKey
        return { ...DEFAULT_SETTINGS, ...parsed, apiKey: decryptedApiKey }
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
