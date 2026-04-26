/**
 * Normalizes a user-pasted "base URL" (OpenAI `baseURL` / root before /chat/completions)
 * and returns the full POST URL for the Chat Completions endpoint.
 */
export function stripChatCompletionsSuffix(input: string): string {
  let s = input.trim().replace(/\/+$/, "");
  s = s.replace(/\/v1\/chat\/completions\/?$/i, "");
  s = s.replace(/\/chat\/completions\/?$/i, "");
  return s.replace(/\/+$/, "");
}

const KNOWN_HOST_PATHS: Record<string, string> = {
  "api.cohere.com": "/compatibility/v1",
  "api.cohere.ai": "/compatibility/v1",
  "api.groq.com": "/openai/v1",
  "api.fireworks.ai": "/inference/v1",
  "openrouter.ai": "/api/v1",
};

/**
 * @param userBase - stripped URL (no /chat/completions)
 */
export function resolveOpenAiChatCompletionsUrl(userBase: string): string {
  const cleaned = stripChatCompletionsSuffix(userBase);
  const base = new URL(cleaned);
  const host = base.hostname;
  if (host === "generativelanguage.googleapis.com") {
    return new URL("v1beta/openai/chat/completions", `${base.origin}/`).href;
  }
  let finalBase = cleaned;
  const known = KNOWN_HOST_PATHS[host];
  if (known && !base.pathname.replace(/^\/+|\/+$/g, "")) {
    finalBase = `${base.origin}${known}`;
  }
  const final = new URL(finalBase);
  const segs = final.pathname.replace(/^\/+|\/+$/g, "");
  if (segs) {
    return `${finalBase.replace(/\/$/, "")}/chat/completions`;
  }
  return `${final.origin}/v1/chat/completions`;
}

export function isGeminiGenerativeLanguageHost(stripped: string): boolean {
  try {
    return new URL(stripChatCompletionsSuffix(stripped)).hostname === "generativelanguage.googleapis.com";
  } catch {
    return false;
  }
}
