import { defaultSettings } from './defaults'
import type { Settings } from './types'

const SETTINGS_KEY = 'token-furnace.settings.v1'
const TOTAL_KEY = 'token-furnace.totalTokens.v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...defaultSettings,
      ...parsed,
      tokensPerSecond: clampNumber(parsed.tokensPerSecond, defaultSettings.tokensPerSecond, 1, 250000),
      burstMaxTokens: clampNumber(parsed.burstMaxTokens, defaultSettings.burstMaxTokens, 1, 8192),
      gramsCO2PerToken: clampNumber(parsed.gramsCO2PerToken, defaultSettings.gramsCO2PerToken, 0, 10),
      gramsCO2PerMile: clampNumber(parsed.gramsCO2PerMile, defaultSettings.gramsCO2PerMile, 1, 5000),
      gramsCO2PerTreeYear: clampNumber(parsed.gramsCO2PerTreeYear, defaultSettings.gramsCO2PerTreeYear, 1, 200000),
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl ? parsed.baseUrl : defaultSettings.baseUrl,
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : defaultSettings.model,
      mode: parsed.mode === 'openai' ? 'openai' : 'simulate',
    }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadTotalTokens(): number {
  try {
    const raw = localStorage.getItem(TOTAL_KEY)
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function saveTotalTokens(totalTokens: number) {
  const safe = Number.isFinite(totalTokens) && totalTokens >= 0 ? totalTokens : 0
  localStorage.setItem(TOTAL_KEY, String(Math.floor(safe)))
}

function clampNumber(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

