import { NextRequest, NextResponse } from "next/server";
import { resolveOpenAiChatCompletionsUrl, stripChatCompletionsSuffix } from "@/lib/openaiApiUrl";
import { buildOpenAiStyleChatBody } from "@/lib/openAiBurnRequest";
import { THINKING_LEVELS, type ThinkingLevel } from "@/lib/thinkingLevel";

function parseThinkingLevel(raw: unknown): ThinkingLevel {
  if (typeof raw === "string" && (THINKING_LEVELS as readonly string[]).includes(raw)) {
    return raw as ThinkingLevel;
  }
  return "off";
}

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
    temperature?: number;
    thinkingLevel?: unknown;
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
    temperature = 1.0,
    prompt = DEFAULT_PROMPT,
  } = body;
  const thinkingLevel = parseThinkingLevel(body.thinkingLevel);

  if (!apiKey || !rawBaseUrl || !model) {
    return NextResponse.json(
      { error: "Missing required fields: apiKey, baseUrl, model" },
      { status: 400 }
    );
  }

  const cleanedBase = stripChatCompletionsSuffix(rawBaseUrl);

  try {
    new URL(cleanedBase);
  } catch {
    return NextResponse.json(
      { error: "Invalid baseUrl. Must be a valid URL (e.g. https://api.openai.com/v1)" },
      { status: 400 }
    );
  }

  const apiUrl = resolveOpenAiChatCompletionsUrl(cleanedBase);

  const tryStream = async (requestBody: Record<string, unknown>): Promise<Response> =>
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

  /** Order matters: keep `stream_options.include_usage` until we know the gateway rejects it. */
  const bodies: Record<string, unknown>[] = [];
  const pushUniqueBody = (body: Record<string, unknown>) => {
    const key = JSON.stringify(body);
    if (bodies.some((b) => JSON.stringify(b) === key)) return;
    bodies.push(body);
  };

  pushUniqueBody(
    buildOpenAiStyleChatBody(cleanedBase, {
      model,
      prompt,
      temperature,
      thinkingLevel,
      stream: true,
      includeUsage: true,
    })
  );
  if (thinkingLevel !== "off") {
    pushUniqueBody(
      buildOpenAiStyleChatBody(cleanedBase, {
        model,
        prompt,
        temperature,
        thinkingLevel: "off",
        stream: true,
        includeUsage: true,
      })
    );
  }
  pushUniqueBody(
    buildOpenAiStyleChatBody(cleanedBase, {
      model,
      prompt,
      temperature,
      thinkingLevel,
      stream: true,
      includeUsage: false,
    })
  );
  pushUniqueBody(
    buildOpenAiStyleChatBody(cleanedBase, {
      model,
      prompt,
      temperature,
      thinkingLevel: "off",
      stream: true,
      includeUsage: false,
    })
  );
  pushUniqueBody(
    buildOpenAiStyleChatBody(cleanedBase, {
      model,
      prompt,
      temperature,
      thinkingLevel: "off",
      stream: true,
      includeUsage: false,
      maxOutputCap: 4096,
    })
  );

  let upstream: Response | null = null;
  let last400Body = "";

  for (const requestBody of bodies) {
    const res = await tryStream(requestBody);
    if (res.ok) {
      upstream = res;
      break;
    }
    if (res.status === 400) {
      last400Body = await res.text();
      continue;
    }
    upstream = res;
    break;
  }

  if (!upstream) {
    const raw = last400Body;
    let errorMessage = "API returned status 400";
    if (raw) {
      try {
        const err = JSON.parse(raw) as {
          error?: { message?: string; code?: number } | string;
          message?: string;
        };
        const e = err.error;
        if (typeof e === "string") {
          errorMessage = e;
        } else if (e && typeof e === "object" && typeof e.message === "string") {
          errorMessage = e.message;
        } else if (typeof err.message === "string") {
          errorMessage = err.message;
        } else {
          errorMessage = raw.slice(0, 400);
        }
      } catch {
        errorMessage = raw.slice(0, 400);
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  if (!upstream.ok) {
    const raw = await upstream.text();
    let errorMessage = `API returned status ${upstream.status}`;
    if (raw) {
      try {
        const err = JSON.parse(raw) as {
          error?: { message?: string; code?: number } | string;
          message?: string;
        };
        const e = err.error;
        if (typeof e === "string") {
          errorMessage = e;
        } else if (e && typeof e === "object" && typeof e.message === "string") {
          errorMessage = e.message;
        } else if (typeof err.message === "string") {
          errorMessage = err.message;
        } else {
          errorMessage = raw.slice(0, 400);
        }
      } catch {
        errorMessage = raw.slice(0, 400);
      }
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: upstream.status }
    );
  }

  if (!upstream.body) {
    return NextResponse.json(
      { error: "Provider returned empty stream body" },
      { status: 502 }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
