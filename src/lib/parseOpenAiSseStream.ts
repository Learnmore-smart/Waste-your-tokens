/**
 * OpenAI (and most OpenAI-compatible) text/event-stream parser for chat.completions.
 */

export type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  /** Some OpenAI-compatible gateways (e.g. xAI) use these names. */
  input_tokens?: number
  output_tokens?: number
}

export interface SseStreamSnapshot {
  text: string
  thought: string
  usage: Usage | null
  model: string | null
}

function appendDelta(
  d: unknown,
  intoText: { s: string; t: string }
): void {
  if (!d || typeof d !== "object") return
  const o = d as Record<string, unknown>
  if (typeof o.content === "string") intoText.s += o.content
  if (Array.isArray(o.content)) {
    for (const p of o.content) {
      if (p && typeof p === "object" && "text" in p && typeof (p as { text: string }).text === "string") {
        const part = p as { type?: string; text: string }
        const isThought =
          part.type === "reasoning" || part.type === "thinking" || part.type === "reasoning_text"
        if (isThought) intoText.t += part.text
        else intoText.s += part.text
      }
    }
  }
  for (const k of [
    "reasoning",
    "reasoning_content",
    "debug_reasoning",
    "thinking",
    "logprobs",
  ] as const) {
    const v = o[k]
    if (k === "logprobs") continue
    if (typeof v === "string") intoText.t += v
  }
  if (typeof o.refusal === "string") intoText.s += o.refusal
}

/**
 * Read an SSE body and invoke `onUpdate` for each parsed `data:` JSON chunk.
 */
export async function consumeOpenAiSse(
  body: ReadableStream<Uint8Array> | null,
  onUpdate: (snap: SseStreamSnapshot) => void,
  signal: AbortSignal
): Promise<SseStreamSnapshot> {
  if (!body) {
    return { text: "", thought: "", usage: null, model: null }
  }

  const reader = body.getReader()
  const dec = new TextDecoder()
  let buffer = ""
  const acc = { s: "", t: "" }
  let usage: Usage | null = null
  let model: string | null = null

  const emit = () => {
    onUpdate({ text: acc.s, thought: acc.t, usage, model })
  }

  while (!signal.aborted) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += dec.decode(value, { stream: true })
    const parts = buffer.split("\n")
    buffer = parts.pop() ?? ""
    for (const rawLine of parts) {
      const line = rawLine.replace(/\r$/, "")
      const t = line.trim()
      if (!t) continue
      if (t.startsWith(":")) continue
      if (t === "data: [DONE]") {
        emit()
        return { text: acc.s, thought: acc.t, usage, model }
      }
      if (t.startsWith("data: ")) {
        const jsonStr = t.slice(6)
        try {
          const data: unknown = JSON.parse(jsonStr)
          if (data && typeof data === "object" && "model" in data) {
            const m = (data as { model?: string }).model
            if (typeof m === "string") model = m
          }
          if (data && typeof data === "object" && "usage" in data) {
            const u = (data as { usage?: Usage }).usage
            if (u && typeof u === "object") {
              const pt = u.prompt_tokens ?? u.input_tokens
              const ct = u.completion_tokens ?? u.output_tokens
              const tt = u.total_tokens
              usage = { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt }
            }
          }
          if (data && typeof data === "object" && "choices" in data) {
            const ch = (data as { choices?: { delta?: unknown }[] }).choices
            if (ch?.[0]?.delta) appendDelta(ch[0].delta, acc)
          }
        } catch {
          // ignore non-JSON lines
        }
        emit()
      }
    }
  }

  if (buffer.trim()) {
    const line = buffer.replace(/\r$/, "")
    const t2 = line.trim()
    if (t2.startsWith("data: ") && t2 !== "data: [DONE]") {
      const jsonStr = t2.slice(6)
      try {
        const data: unknown = JSON.parse(jsonStr)
        if (data && typeof data === "object" && "model" in data) {
          const m = (data as { model?: string }).model
          if (typeof m === "string") model = m
        }
        if (data && typeof data === "object" && "usage" in data) {
          const u = (data as { usage?: Usage }).usage
          if (u && typeof u === "object") {
            const pt = u.prompt_tokens ?? u.input_tokens
            const ct = u.completion_tokens ?? u.output_tokens
            const tt = u.total_tokens
            usage = { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt }
          }
        }
        if (data && typeof data === "object" && "choices" in data) {
          const ch = (data as { choices?: { delta?: unknown }[] }).choices
          if (ch?.[0]?.delta) appendDelta(ch[0].delta, acc)
        }
      } catch {
        // ignore
      }
    }
  }

  return { text: acc.s, thought: acc.t, usage, model }
}

export function estimateTokensFromText(prompt: string, completion: string, thought: string): {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
} {
  const promptT = Math.max(1, Math.ceil(prompt.length / 4))
  const outT = Math.max(1, Math.ceil((completion.length + thought.length) / 3.5))
  return { prompt_tokens: promptT, completion_tokens: outT, total_tokens: promptT + outT }
}
