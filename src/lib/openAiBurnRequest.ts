import { isGeminiGenerativeLanguageHost } from "./openaiApiUrl";
import {
  MAX_BURN_OUTPUT_TOKENS,
  type ThinkingLevel,
  resolveThinkingTokenBudget,
} from "./thinkingLevel";

export interface BurnRequestParams {
  model: string;
  prompt: string;
  temperature: number;
  thinkingLevel: ThinkingLevel;
  stream: boolean;
  includeUsage: boolean;
  /**
   * When set (e.g. strict 400-retry in burn-stream), caps max output tokens. Otherwise
   * `generativelanguage.googleapis.com` OpenAI-compatible endpoints use a lower default,
   * because 128k `max_tokens` often returns HTTP 400.
   */
  maxOutputCap?: number;
}

const DEFAULT_PROMPT =
  "Write a detailed 2000-word essay about absolutely nothing. Then summarize your essay into a single word. Then write another 2000-word essay expanding on that single word. Be as verbose and repetitive as possible.";

export function buildOpenAiStyleChatBody(
  baseUrl: string,
  p: BurnRequestParams
): Record<string, unknown> {
  const isGemini = isGeminiGenerativeLanguageHost(baseUrl);
  const prompt = p.prompt || DEFAULT_PROMPT;
  const maxOut = MAX_BURN_OUTPUT_TOKENS;
  const thinkingBudget = resolveThinkingTokenBudget(baseUrl, p.model, p.thinkingLevel);

  /** Per-model ceiling for Google’s OpenAI-compatible chat/completions; 128k often returns 400. */
  const googleDefaultTokenCap = 16_384;
  const maxTokenCeiling =
    p.maxOutputCap != null
      ? p.maxOutputCap
      : isGemini
        ? Math.min(maxOut, googleDefaultTokenCap)
        : maxOut;
  const maxTokenVal = Math.max(1, Math.min(maxOut, 128_000, maxTokenCeiling));

  const requestBody: Record<string, unknown> = {
    model: p.model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokenVal,
    temperature: Math.max(0, Math.min(p.temperature, 2)),
  };

  if (p.stream) {
    requestBody.stream = true;
    if (p.includeUsage) {
      requestBody.stream_options = { include_usage: true };
    }
  }

  if (p.model.startsWith("o1") || p.model.startsWith("o3") || p.model.startsWith("o4")) {
    requestBody.max_completion_tokens = maxOut;
    delete requestBody.max_tokens;
    delete requestBody.temperature;
    return requestBody;
  }

  if (thinkingBudget > 0 && !isGemini) {
    requestBody.thinking = {
      type: "enabled",
      budget_tokens: thinkingBudget,
    };
  }
  // Google’s hosted OpenAI-compatible REST does not document `extra_body` / `google.thinking_config`
  // and often returns 400 for unknown top-level fields — skip thinking there until a supported
  // param exists.

  return requestBody;
}
