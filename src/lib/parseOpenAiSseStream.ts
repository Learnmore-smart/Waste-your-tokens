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

function pickFiniteNumber(...candidates: unknown[]): number | undefined {
  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  }
  return undefined
}

/** Normalize one chunk's `usage` (snake_case, camelCase, input/output aliases). */
function normalizeUsageChunk(raw: unknown): Usage | null {
  if (!raw || typeof raw !== "object") return null
  const u = raw as Record<string, unknown>
  const pt = pickFiniteNumber(
    u.prompt_tokens,
    u.input_tokens,
    u.promptTokens,
    u.inputTokens
  )
  const ct = pickFiniteNumber(
    u.completion_tokens,
    u.output_tokens,
    u.completionTokens,
    u.outputTokens
  )
  const tt = pickFiniteNumber(u.total_tokens, u.totalTokens)
  if (pt == null && ct == null && tt == null) return null
  return {
    prompt_tokens: pt,
    completion_tokens: ct,
    total_tokens: tt,
  }
}

/** Prefer monotonic totals when gateways emit multiple usage snapshots. */
function mergeUsage(prev: Usage | null, next: Usage): Usage {
  if (!prev) return next
  const pt = Math.max(prev.prompt_tokens ?? 0, next.prompt_tokens ?? 0)
  const ct = Math.max(prev.completion_tokens ?? 0, next.completion_tokens ?? 0)
  const ttRaw = Math.max(prev.total_tokens ?? 0, next.total_tokens ?? 0)
  let tt = Math.max(ttRaw, pt + ct)
  if (tt === 0 && (pt > 0 || ct > 0)) tt = pt + ct
  return { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt }
}

function usageFromChatChunk(data: Record<string, unknown>): unknown {
  if ("usage" in data) return data.usage
  const ch = data.choices
  if (Array.isArray(ch) && ch[0] && typeof ch[0] === "object" && ch[0] !== null) {
    const u = (ch[0] as { usage?: unknown }).usage
    if (u !== undefined) return u
  }
  return undefined
}

function ingestUsageFromData(data: unknown, into: { current: Usage | null }): void {
  if (!data || typeof data !== "object") return
  const raw = usageFromChatChunk(data as Record<string, unknown>)
  const norm = normalizeUsageChunk(raw)
  if (!norm) return
  const pt = norm.prompt_tokens ?? 0
  const ct = norm.completion_tokens ?? 0
  const tt = norm.total_tokens ?? 0
  if (pt === 0 && ct === 0 && tt === 0) return
  into.current = mergeUsage(into.current, norm)
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
  const usageAcc = { current: null as Usage | null }
  let model: string | null = null

  const emit = () => {
    onUpdate({ text: acc.s, thought: acc.t, usage: usageAcc.current, model })
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
        return { text: acc.s, thought: acc.t, usage: usageAcc.current, model }
      }
      if (t.startsWith("data: ")) {
        const jsonStr = t.slice(6)
        try {
          const data: unknown = JSON.parse(jsonStr)
          if (data && typeof data === "object" && "model" in data) {
            const m = (data as { model?: string }).model
            if (typeof m === "string") model = m
          }
          ingestUsageFromData(data, usageAcc)
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
        ingestUsageFromData(data, usageAcc)
        if (data && typeof data === "object" && "choices" in data) {
          const ch = (data as { choices?: { delta?: unknown }[] }).choices
          if (ch?.[0]?.delta) appendDelta(ch[0].delta, acc)
        }
      } catch {
        // ignore
      }
    }
  }

  return { text: acc.s, thought: acc.t, usage: usageAcc.current, model }
}

/** UTF-8 byte length — better than code units for CJK-ish token-ish heuristics. */
function utf8ByteLength(s: string): number {
  if (!s) return 0
  return new TextEncoder().encode(s).length
}

/**
 * When the stream has no `usage` (common after providers 400-reject `stream_options`)
 * or totals are bogus, this bounds tokens from text. Biased slightly high vs pure-English
 * /4 rules so CJK / mixed content and custom gateways under-report less.
 */
export function estimateTokensFromText(prompt: string, completion: string, thought: string): {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
} {
  const promptT = Math.max(
    1,
    Math.ceil(Math.max(prompt.length / 4, utf8ByteLength(prompt) / 3))
  )
  const out = completion.length + thought.length
  const outBytes = utf8ByteLength(completion + thought)
  const outT = Math.max(1, Math.ceil(Math.max(out / 3, outBytes / 3)))
  return { prompt_tokens: promptT, completion_tokens: outT, total_tokens: promptT + outT }
}
