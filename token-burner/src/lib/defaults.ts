import type { Settings } from './types'

export const defaultSettings: Settings = {
  mode: 'simulate',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  tokensPerSecond: 1800,
  burstMaxTokens: 1200,
  gramsCO2PerToken: 0.0004,
  gramsCO2PerMile: 404,
  gramsCO2PerTreeYear: 21000,
}

