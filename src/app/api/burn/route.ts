import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;
const requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }
  requestTimestamps.push(now);
  return false;
}

const REQUEST_TIMEOUT_MS = 120_000;

const DEFAULT_PROMPT =
  "Write a detailed 2000-word essay about absolutely nothing. Then summarize your essay into a single word. Then write another 2000-word essay expanding on that single word. Be as verbose and repetitive as possible.";

export async function POST(request: NextRequest) {
  if (isRateLimited()) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before making more requests." },
      { status: 429 }
    );
  }

  let body: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    thinkingBudget?: number;
    prompt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    apiKey,
    baseUrl: rawBaseUrl,
    model,
    maxTokens = 4096,
    temperature = 1.0,
    thinkingBudget = 0,
    prompt = DEFAULT_PROMPT,
  } = body;

  if (!apiKey || !rawBaseUrl || !model) {
    return NextResponse.json(
      { error: "Missing required fields: apiKey, baseUrl, model" },
      { status: 400 }
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBaseUrl.replace(/\/+$/, ""));
  } catch {
    return NextResponse.json(
      { error: "Invalid baseUrl. Must be a valid URL (e.g. https://api.openai.com)" },
      { status: 400 }
    );
  }

  const cleanedBaseUrl = rawBaseUrl.replace(/\/+$/, "");

  const KNOWN_PROVIDER_PATHS: Record<string, string> = {
    "generativelanguage.googleapis.com": "/v1beta/openai",
    "api.groq.com": "/openai/v1",
    "api.fireworks.ai": "/inference/v1",
    "openrouter.ai": "/api/v1",
  };

  let finalBaseUrl = cleanedBaseUrl;
  const hostname = baseUrl.hostname;
  const knownPath = KNOWN_PROVIDER_PATHS[hostname];
  if (knownPath && !baseUrl.pathname.replace(/^\/+|\/+$/g, "")) {
    finalBaseUrl = `${baseUrl.origin}${knownPath}`;
  }

  const finalUrl = new URL(finalBaseUrl);
  const pathSegments = finalUrl.pathname.replace(/^\/+|\/+$/g, "");
  const apiUrl = pathSegments
    ? `${finalBaseUrl}/chat/completions`
    : `${finalUrl.origin}/v1/chat/completions`;

  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "user",
        content: prompt || DEFAULT_PROMPT,
      },
    ],
    max_tokens: Math.max(1, Math.min(maxTokens, 128000)),
    temperature: Math.max(0, Math.min(temperature, 2)),
  };

  if (thinkingBudget > 0) {
    if (model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) {
      requestBody.max_completion_tokens = thinkingBudget;
      delete requestBody.max_tokens;
      delete requestBody.temperature;
    } else {
      requestBody.thinking = {
        type: "enabled",
        budget_tokens: thinkingBudget,
      };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.error?.message || errorData?.message || `API returned status ${response.status}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      model: data.model ?? model,
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
      total_tokens: data.usage?.total_tokens ?? 0,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The API took too long to respond." },
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
