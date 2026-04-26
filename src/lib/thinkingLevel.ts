import { findProviderIdByBaseUrl } from "@/config/providers";

/** User-facing thinking intensity. Mapped per provider in `resolveThinkingTokenBudget`. */
export type ThinkingLevel = "off" | "high" | "xhigh" | "max";

export const THINKING_LEVELS: readonly ThinkingLevel[] = ["off", "high", "xhigh", "max"] as const;

/** OpenAI-style chat `max_tokens` / `max_completion_tokens` cap (clamped in burn request). */
export const MAX_BURN_OUTPUT_TOKENS = 128_000;

const GEMINI_MAX_THINKING = 24_576;

function isOpenAiReasoningLetterModel(model: string): boolean {
  return (
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("o4")
  );
}

/**
 * Resolves a numeric thinking/reasoning budget for APIs that support it.
 * Returns 0 when level is `off` or the model is OpenAI o-series (those use a separate max-completion path only).
 */
export function resolveThinkingTokenBudget(
  strippedBaseUrl: string,
  model: string,
  level: ThinkingLevel
): number {
  if (level === "off" || isOpenAiReasoningLetterModel(model)) return 0;

  const provider = findProviderIdByBaseUrl(strippedBaseUrl) ?? "custom";

  const gemini = (high: number, xhigh: number, max: number) => {
    switch (level) {
      case "high":
        return Math.min(high, GEMINI_MAX_THINKING);
      case "xhigh":
        return Math.min(xhigh, GEMINI_MAX_THINKING);
      case "max":
        return Math.min(max, GEMINI_MAX_THINKING);
      default:
        return 0;
    }
  };

  const openAiStyle = (high: number, xhigh: number, max: number) => {
    switch (level) {
      case "high":
        return high;
      case "xhigh":
        return xhigh;
      case "max":
        return max;
      default:
        return 0;
    }
  };

  switch (provider) {
    case "google":
      return gemini(4096, 12_288, GEMINI_MAX_THINKING);
    case "anthropic":
      return openAiStyle(8_192, 32_768, 100_000);
    case "openai":
    case "openrouter":
    case "custom":
    case "together":
    case "fireworks":
    case "perplexity":
    case "xai":
    case "deepseek":
    case "mistral":
    case "groq":
    case "cohere":
    default:
      return openAiStyle(8_192, 32_768, 120_000);
  }
}
