export interface ProviderPreset {
  id: string
  label: string
  baseUrl: string
  baseUrlAliases?: string[]
  models: string[]
}

export function normBase(s: string): string {
  return s.replace(/\/+$/, "")
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    baseUrlAliases: ["https://api.openai.com"],
    models: [
      "gpt-5.5",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.2",
      "gpt-5",
      "gpt-5-mini",
      "o3",
      "o4-mini",
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    baseUrlAliases: ["https://api.anthropic.com"],
    models: [
      "claude-opus-4-7",
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    baseUrlAliases: ["https://generativelanguage.googleapis.com"],
    models: [
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemma-4-31b-it",
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    baseUrlAliases: ["https://api.deepseek.com"],
    models: ["deepseek-v4-pro", "deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "xai",
    label: "xAI",
    baseUrl: "https://api.x.ai/v1",
    baseUrlAliases: ["https://api.x.ai"],
    models: ["grok-4.20", "grok-4.20-multi-agent", "grok-4.1-fast", "grok-4", "grok-3"],
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    baseUrlAliases: ["https://api.mistral.ai"],
    models: [
      "mistral-large-latest",
      "devstral-latest",
      "codestral-latest",
      "mistral-small-latest",
      "ministral-8b-latest",
    ],
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    baseUrlAliases: ["https://api.groq.com"],
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "qwen/qwen3-32b",
      "openai/gpt-oss-120b",
    ],
  },
  {
    id: "cohere",
    label: "Cohere",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    baseUrlAliases: [
      "https://api.cohere.com/compatibility/v1",
      "https://api.cohere.com",
      "https://api.cohere.ai",
    ],
    models: ["command-a-03-2025", "command-a-reasoning-08-2025", "command-r7b-12-2024"],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    baseUrl: "https://api.perplexity.ai/v1",
    baseUrlAliases: ["https://api.perplexity.ai"],
    models: [
      "sonar-pro",
      "sonar-reasoning-pro",
      "sonar-deep-research",
      "sonar-reasoning",
      "sonar",
    ],
  },
  {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    baseUrlAliases: ["https://api.together.xyz"],
    models: [
      "deepseek-ai/DeepSeek-V4-Pro",
      "Qwen/Qwen3.5-397B-A17B",
      "deepseek-ai/DeepSeek-V3.1",
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "moonshotai/Kimi-K2.6",
    ],
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    baseUrlAliases: ["https://api.fireworks.ai"],
    models: [
      "accounts/fireworks/models/deepseek-v3.2",
      "accounts/fireworks/models/qwen3-235b-a22b",
      "accounts/fireworks/models/llama4-maverick-instruct-basic",
      "accounts/fireworks/models/kimi-k2p5",
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    baseUrlAliases: ["https://openrouter.ai"],
    models: [
      "openai/gpt-5.5",
      "anthropic/claude-opus-4-7",
      "google/gemini-3.1-pro-preview",
      "x-ai/grok-4.20",
      "deepseek/deepseek-v4-pro",
    ],
  },
  { id: "custom", label: "Custom", baseUrl: "", models: [] },
]
