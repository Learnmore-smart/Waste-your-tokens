export type BurnMode = 'simulate' | 'api'

export type Settings = {
  burnMode: BurnMode
  apiKey: string
  baseUrl: string
  model: string
  maxOutputTokens: number
  simulateTokensPerSecond: number
  gramsCO2Per1kTokens: number
}

export const defaultSettings: Settings = {
  burnMode: 'simulate',
  apiKey: '',
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o-mini',
  maxOutputTokens: 1024,
  simulateTokensPerSecond: 1800,
  gramsCO2Per1kTokens: 0.2,
}

export const STORAGE_KEYS = {
  settings: 'tokenBurner_settings_v1',
  totalTokens: 'tokenBurner_totalTokens_v1',
} as const

