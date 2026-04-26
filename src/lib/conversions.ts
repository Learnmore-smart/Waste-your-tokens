export interface ModelPricing {
  inputPerMillion: number
  outputPerMillion: number
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5.5': { inputPerMillion: 5, outputPerMillion: 30 },
  'gpt-5.4': { inputPerMillion: 2.5, outputPerMillion: 15 },
  'gpt-5.4-mini': { inputPerMillion: 0.75, outputPerMillion: 4.5 },
  'gpt-5.4-nano': { inputPerMillion: 0.2, outputPerMillion: 1.25 },
  'gpt-5.2': { inputPerMillion: 1.75, outputPerMillion: 14 },
  'gpt-5': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gpt-5-mini': { inputPerMillion: 0.25, outputPerMillion: 2 },
  'o3': { inputPerMillion: 2, outputPerMillion: 8 },
  'o4-mini': { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  'claude-opus-4-7': { inputPerMillion: 5, outputPerMillion: 25 },
  'claude-opus-4-6': { inputPerMillion: 5, outputPerMillion: 25 },
  'claude-sonnet-4-6': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 1, outputPerMillion: 5 },
  'gemini-3.1-pro-preview': { inputPerMillion: 2, outputPerMillion: 12 },
  'gemini-3-flash-preview': { inputPerMillion: 0.5, outputPerMillion: 3 },
  'gemini-3.1-flash-lite-preview': { inputPerMillion: 0.25, outputPerMillion: 1.5 },
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'deepseek-v4-pro': { inputPerMillion: 1.74, outputPerMillion: 3.48 },
  'deepseek-v4-flash': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-chat': { inputPerMillion: 0.27, outputPerMillion: 1.1 },
  'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  'grok-4.20': { inputPerMillion: 2, outputPerMillion: 6 },
  'grok-4.20-multi-agent': { inputPerMillion: 2, outputPerMillion: 6 },
  'grok-4.1-fast': { inputPerMillion: 0.2, outputPerMillion: 0.5 },
  'grok-4': { inputPerMillion: 3, outputPerMillion: 15 },
  'grok-3': { inputPerMillion: 3, outputPerMillion: 15 },
  'mistral-large-latest': { inputPerMillion: 0.5, outputPerMillion: 1.5 },
  'devstral-latest': { inputPerMillion: 2, outputPerMillion: 6 },
  'codestral-latest': { inputPerMillion: 0.3, outputPerMillion: 0.9 },
  'mistral-small-latest': { inputPerMillion: 0.1, outputPerMillion: 0.3 },
  'ministral-8b-latest': { inputPerMillion: 0.1, outputPerMillion: 0.1 },
  'llama-3.3-70b-versatile': { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  'llama-3.1-8b-instant': { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  'llama-4-scout-17b-16e-instruct': { inputPerMillion: 0.11, outputPerMillion: 0.34 },
  'gpt-oss-120b': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'qwen3-32b': { inputPerMillion: 0.29, outputPerMillion: 0.59 },
  'command-a-03-2025': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'command-a-reasoning-08-2025': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'command-r7b-12-2024': { inputPerMillion: 0.0375, outputPerMillion: 0.0375 },
  'sonar-pro': { inputPerMillion: 3, outputPerMillion: 15 },
  'sonar-reasoning-pro': { inputPerMillion: 2, outputPerMillion: 8 },
  'sonar-deep-research': { inputPerMillion: 2, outputPerMillion: 8 },
  'sonar-reasoning': { inputPerMillion: 1, outputPerMillion: 5 },
  'sonar': { inputPerMillion: 1, outputPerMillion: 1 },
  'DeepSeek-V4-Pro': { inputPerMillion: 2.1, outputPerMillion: 4.4 },
  'Qwen3.5-397B-A17B': { inputPerMillion: 0.6, outputPerMillion: 3.6 },
  'DeepSeek-V3.1': { inputPerMillion: 0.6, outputPerMillion: 1.7 },
  'Llama-3.3-70B-Instruct-Turbo': { inputPerMillion: 0.88, outputPerMillion: 0.88 },
  'Kimi-K2.6': { inputPerMillion: 1.2, outputPerMillion: 4.5 },
  'deepseek-v3.2': { inputPerMillion: 0.9, outputPerMillion: 2.7 },
  'kimi-k2p5': { inputPerMillion: 1.5, outputPerMillion: 5 },
}

const DEFAULT_PRICING: ModelPricing = { inputPerMillion: 3, outputPerMillion: 15 }

export function getModelPricing(model: string): ModelPricing {
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model === key || model.endsWith('/' + key) || model.includes(key)) {
      return pricing
    }
  }
  return DEFAULT_PRICING
}

export function tokensToCost(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = getModelPricing(model)
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion
  return inputCost + outputCost
}

export function tokensToCostFlat(tokens: number): number {
  return tokens * 0.00001
}

export function tokensToCarbonGrams(tokens: number): number {
  return tokens * 0.0002
}

export function carbonToMiles(carbonGrams: number): number {
  return carbonGrams * 0.006
}

export function carbonToTrees(carbonGrams: number): number {
  return carbonGrams / 21000
}

export function carbonToSmartphones(carbonGrams: number): number {
  return carbonGrams / 8.22
}

export function carbonToSearches(carbonGrams: number): number {
  return carbonGrams / 0.2
}

export function carbonToStreamingHours(carbonGrams: number): number {
  return carbonGrams / 36
}
