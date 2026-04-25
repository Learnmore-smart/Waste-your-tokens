export type BurnMode = 'simulate' | 'openai'

export type Settings = {
  mode: BurnMode
  apiKey: string
  baseUrl: string
  model: string
  tokensPerSecond: number
  burstMaxTokens: number
  gramsCO2PerToken: number
  gramsCO2PerMile: number
  gramsCO2PerTreeYear: number
}

