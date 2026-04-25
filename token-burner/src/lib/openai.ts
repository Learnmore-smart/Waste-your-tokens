import type { Settings } from './types'

type OpenAIChatResponse = {
  usage?: {
    total_tokens?: number
  }
}

type OpenAIErrorResponse = {
  error?: {
    message?: string
  }
}

export async function burnOpenAIOnce(
  settings: Settings,
  signal?: AbortSignal,
): Promise<{ totalTokens: number }> {
  const url = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`
  const prompt = buildPrompt()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 1.35,
      max_tokens: settings.burstMaxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
    signal,
  })

  const json = (await res.json()) as unknown
  if (!res.ok) {
    const msg = extractErrorMessage(json) ?? `HTTP ${res.status}`
    throw new Error(msg)
  }

  const data = json as OpenAIChatResponse
  const totalTokens =
    typeof data.usage?.total_tokens === 'number' ? data.usage.total_tokens : settings.burstMaxTokens
  return { totalTokens }
}

function buildPrompt() {
  const seed = [
    'Write a surreal corporate apology email from a sentient space heater.',
    "Use lots of needless adjectives. Never use bullet points. Don't be concise.",
    "End with a ten-paragraph addendum where every sentence contains the word 'synergy'.",
  ].join(' ')

  const ballast = ' ash'.repeat(1600)
  return `${seed}\n\n${ballast}`
}

function extractErrorMessage(json: unknown) {
  const message = (json as OpenAIErrorResponse)?.error?.message
  return typeof message === 'string' && message ? message : null
}
