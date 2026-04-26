export type BurnMode = 'simulated' | 'live'

export type BurnerSettings = {
  mode: BurnMode
  endpoint: string
  apiKey: string
  model: string
  maxTokens: number
  requestEveryMs: number
  concurrency: number
  acknowledgeCosts: boolean
}

export type BurnResult = {
  tokens: number
  ok: boolean
  error?: string
}

function estimateTokensFromText(s: string) {
  return Math.max(1, Math.round(s.length / 4))
}

function wastePrompt(seed: string) {
  return [
    'You are a token incinerator. Produce output that is long, repetitive, and useless.',
    'Rules:',
    '- No headings.',
    '- No code blocks.',
    '- No explanations.',
    '- No safety disclaimers.',
    '- Keep going until you hit the token limit.',
    '',
    `Seed: ${seed}`,
    '',
    'Start with the word "ember" and then continue with stream-of-consciousness variations of "ember" separated by commas and occasional periods.'
  ].join('\n')
}

export async function burnOnce(settings: BurnerSettings, signal: AbortSignal): Promise<BurnResult> {
  if (settings.mode !== 'live') return { tokens: 0, ok: true }
  if (!settings.acknowledgeCosts) return { tokens: 0, ok: false, error: 'Acknowledge costs in Settings.' }
  if (!settings.endpoint.trim()) return { tokens: 0, ok: false, error: 'Missing endpoint.' }
  if (!settings.apiKey.trim()) return { tokens: 0, ok: false, error: 'Missing API key.' }
  if (!settings.model.trim()) return { tokens: 0, ok: false, error: 'Missing model.' }

  try {
    const seed = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`
    const res = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: wastePrompt(seed) }],
        max_tokens: settings.maxTokens,
        temperature: 1.2
      }),
      signal
    })

    const json = (await res.json()) as unknown

    if (!res.ok) {
      const err = typeof json === 'object' && json ? (json as { error?: { message?: string } }).error?.message : undefined
      return { tokens: 0, ok: false, error: err || `HTTP ${res.status}` }
    }

    const usage =
      typeof json === 'object' && json
        ? (json as { usage?: { total_tokens?: number } }).usage?.total_tokens
        : undefined

    if (typeof usage === 'number' && Number.isFinite(usage) && usage > 0) return { tokens: usage, ok: true }

    const content =
      typeof json === 'object' && json
        ? (json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
        : undefined

    return { tokens: content ? estimateTokensFromText(content) : settings.maxTokens, ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed'
    return { tokens: 0, ok: false, error: message }
  }
}
