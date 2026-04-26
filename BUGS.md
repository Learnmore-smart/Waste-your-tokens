# Waste Your Tokens — Bug & Issue Report

> Comprehensive audit of the codebase. Covers critical bugs, security issues, UI/UX problems, API design flaws, and code quality issues.

---

## Critical Bugs

### 1. Auto-Burn Loop Has Race Conditions & Unreliable Stop

The `startAutoBurn` function in `useTokenBurner.ts` uses a recursive `setTimeout` loop with a boolean ref (`autoBurnStopRef`) to signal stopping. This pattern is fragile:

- If `stopAutoBurn()` is called **after** `burn()` starts but **before** it finishes, `autoBurnStopRef.current = true` is set, but the loop may still schedule another `setTimeout` because the `success` check happens before the stop-ref check in some paths.
- The `burn()` function catches `AbortError` and returns `false`, but the loop checks `autoBurnStopRef.current` **after** `await burn()`. If the user clicks stop during the `burn()` call, the abort happens, `burn()` returns `false`, and then the loop sees `autoBurnStopRef.current === true` and exits — but only after the failed burn has already set `isBurning = false` and potentially shown an error.
- More critically: if `burn()` throws an unexpected error (not `AbortError`), it sets `setError(err.message)` and `setIsBurning(false)`, but the loop checks `if (!success)` and exits. However, `isAutoBurning` is left as `true` because `setIsAutoBurning(false)` only happens inside the loop, not in `burn()`.

**Impact:** Auto-burn may continue after user clicks stop, or may get stuck in `isAutoBurning = true` state after an error.

### 2. `burn()` Does Not Reset `isBurning` on Early Return

In `useTokenBurner.ts` line 114-117, if `!settings.apiKey`, the function sets `setError('No API key configured')` and `setIsBurning(false)` then returns `false`. This is correct. But in the API route handler, if `res.ok` is false, the function sets `setError(...)` and returns `false` **without** setting `setIsBurning(false)`. Wait — actually it does in the `finally` block. Let me re-check...

Actually, `setIsBurning(false)` is in the `finally` block (line 203), so it does get reset. However, `abortControllerRef.current = null` is also in `finally`, which is correct.

But there is a subtle bug: if `burn()` is called and the settings have no API key, `abortControllerRef.current = new AbortController()` is never created, but `setIsBurning(false)` is set. That's fine.

**Re-evaluated Impact:** The `finally` block handles most cases, but the error state is not cleared when starting a new burn, so stale errors persist.

### 3. API Key Stored in Plain Text in localStorage

The API key is stored unencrypted in `localStorage` under the key `waste-tokens-settings`. Anyone with access to the browser devtools can read it. The key is also sent from client → server on every burn request in the POST body.

**Impact:** Security risk — API key exposure.

### 4. API Key Sent from Client to Server in Request Body

In `useTokenBurner.ts` line 126, the API key is sent as part of the POST body to `/api/burn`. This means the key traverses the network. While it's over HTTPS in production, the key is still exposed in the request payload. A more secure pattern would be to store the key server-side (env var) or use a session-based approach.

**Impact:** Unnecessary key transmission on every request.

---

## Provider & Model Issues

### 5. Anthropic Provider Uses Wrong API Format

The `PROVIDER_PRESETS` includes Anthropic with `baseUrl: 'https://api.anthropic.com'` and models like `claude-sonnet-4-20250514`. However, the API route (`route.ts`) constructs the URL as `${baseUrl.origin}/v1/chat/completions` and sends an OpenAI-compatible request body.

Anthropic's API is **NOT** OpenAI-compatible. It uses:
- Base URL: `https://api.anthropic.com/v1/messages`
- Different request/response format (no `messages` array with `role: "user"`, uses `model`, `max_tokens`, `messages` but with different schema)
- Different auth header format

**Impact:** All Anthropic requests will fail with 404 or 400 errors.

### 6. OpenRouter Models May Not Work Due to Missing Headers

OpenRouter requires additional headers like `HTTP-Referer` and `X-Title` for some models. The current code only sends `Authorization` and `Content-Type`.

**Impact:** Some OpenRouter models may reject requests.

### 7. Hardcoded `/v1/chat/completions` Path

In `route.ts` line 79, the API path is hardcoded: `${baseUrl.origin}/v1/chat/completions`. Some providers use different paths:
- Azure OpenAI: `/openai/deployments/{model}/chat/completions`
- Some local providers: `/chat/completions` without `/v1`
- Anthropic: `/v1/messages`

**Impact:** Incompatible with Azure OpenAI, Anthropic, and some local providers.

### 8. `getModelPricing` Uses Dangerous `includes` Matching

In `conversions.ts` line 27:
```ts
if (model === key || model.endsWith('/' + key) || model.includes(key)) {
```

The `model.includes(key)` check is dangerous. For example, if a custom model is named `"my-gpt-4o-custom"`, it will match `gpt-4o` pricing even if it's a completely different model with different pricing.

**Impact:** Incorrect cost calculations for custom or similarly-named models.

### 9. Missing Models in Pricing Table

The pricing table is missing many popular models:
- `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
- `claude-3-5-haiku-20241022`
- `claude-3-7-sonnet-20250219`
- `gemini-2.5-pro`, `gemini-2.0-flash`
- `llama-3.3-70b`, `llama-3.1-8b`
- `qwen2.5-72b`
- Many OpenRouter-specific model IDs

**Impact:** Cost estimates default to `$3/$15` per million, which is wrong for cheap models.

---

## UI/UX Issues

### 10. Settings Sidebar Shows "Custom" as Model When Using Custom Model

When a user selects "Custom" provider and enters a custom model name, saves, then reopens settings, the `detectProvider` function returns `'custom'`, but the model dropdown shows `model === 'custom'` which triggers the custom input. However, if the saved model is not `'custom'` but a custom string, the UI may not correctly restore the custom model input state.

Actually, looking more carefully: `detectProvider` checks `p.models.includes(settings.model)`. If the user entered a custom model like `deepseek-chat`, and that model happens to be in one of the preset lists (it is, in DeepSeek preset), then `detectProvider` will return `'deepseek'` even if the user originally selected `'custom'` provider. This causes the provider dropdown to jump to DeepSeek when reopening settings.

**Impact:** Settings don't round-trip correctly — provider selection changes unexpectedly on reopen.

### 11. No Visual Feedback for "Cancel Request"

The "Cancel Request" button appears when `isBurning && !isAutoBurning`, but clicking it calls `cancelCurrentBurn()` which aborts the fetch. However, there's no visual feedback that cancellation is in progress. The button just disappears when `isBurning` becomes false.

**Impact:** User may click cancel multiple times or be unsure if it worked.

### 12. `AnimatedNumber` Shows `0` on First Render Before Spring Animation

In `AnimatedNumber.tsx` line 31:
```tsx
return <span ref={ref}>{prefix}{decimals > 0 ? (0).toFixed(decimals) : '0'}{suffix}</span>
```

The initial render shows `0` (or `$0.00`), then the spring animation updates it. For large numbers, this causes a flash from `0` to the actual value.

**Impact:** Visual flash of incorrect value on mount.

### 13. Fire Effect Particles Accumulate in State

In `FireEffect.tsx` line 34:
```ts
setParticles((prev) => [...prev.slice(-30), particle])
```

While this caps at 30 particles, each particle also schedules its own `setTimeout` to remove itself (line 35-37). If the component unmounts while particles are active, the `setTimeout` callbacks will try to call `setParticles` on an unmounted component, causing React warnings.

**Impact:** React memory leak warnings on unmount.

### 14. `ErrorBoundary` Only Catches Render Errors, Not Event Handler Errors

The `ErrorBoundary` component in `ErrorBoundary.tsx` is a class component that catches render-phase errors. However, errors in async event handlers (like `burn()`, `handleAutoBurn()`) are **not** caught by error boundaries. If `burn()` throws an uncaught error, the app won't show the error boundary fallback.

**Impact:** Async errors can crash the app or leave it in an inconsistent state.

### 15. No Keyboard Shortcuts

For a tool designed for rapid interaction, there are no keyboard shortcuts. The user must click the burn button every time.

**Impact:** Slower interaction for power users.

### 16. No Dark/Light Mode Toggle

The app is hardcoded to a dark theme (`bg-zinc-950`). There's no option for light mode or system preference detection.

**Impact:** Accessibility and user preference issue.

---

## Logic & Data Issues

### 17. Cost Calculation Doesn't Distinguish Input vs Output Tokens

`tokensToCost()` in `conversions.ts` line 34:
```ts
export function tokensToCost(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = getModelPricing(model)
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion
  return inputCost + outputCost
}
```

Wait, this actually **does** distinguish input vs output. Let me re-read the old BUGS.md... Ah, the old report said it used a flat rate, but looking at the current code, it does use per-model pricing with input/output differentiation. However, the `getModelPricing` function's fuzzy matching (issue #8) means the wrong pricing may be used.

**Re-evaluated Impact:** The calculation logic is correct, but model matching is unreliable.

### 18. Carbon Calculations Are Rough Estimates with No Source

The conversion factors in `conversions.ts` have no documented source in the UI:
- `0.0002 g CO₂ per token` — where does this come from?
- `0.006 miles per gram CO₂` — what vehicle/efficiency assumption?
- `21000 g CO₂ per tree per year` — what tree species? What timeframe?

**Impact:** Misleading environmental impact numbers with no way for users to verify.

### 19. `loadInitialState` Called Once (Not Multiple Times)

The old BUGS.md claimed `loadInitialState()` was called 6 times. Looking at the current code, `useState(() => loadInitialState())` is called **once** because `useState` with a lazy initializer only calls the function once on mount. The old report was incorrect.

**Re-evaluated Impact:** Not a bug — lazy initialization works correctly.

### 20. History Is Limited to 100 Entries But No UI Indication

In `useTokenBurner.ts` line 166 and 190, history is trimmed to 100 entries. However, the `BurnHistory` component shows `history.slice(0, 50)` (line 33). So only 50 are shown, but 100 are stored. There's no UI to view older entries or indication that data is being truncated.

**Impact:** User may think data is lost when it exceeds 50 visible entries.

### 21. `BurnRecord` Cost Is Calculated Per-Call, Not Using Running Totals

In `useTokenBurner.ts` line 163:
```ts
cost: tokensToCost(data.prompt_tokens, data.completion_tokens, model)
```

This calculates the cost for that individual call. But in the state update (line 151), the total cost is recalculated from scratch:
```ts
const newCost = tokensToCost(newPromptTokens, newCompletionTokens, model)
```

This uses the **latest model** for all historical tokens. If the user switches models between burns, the total cost will be wrong because it applies the newest model's pricing to all previous tokens.

**Impact:** Total cost is inaccurate when using multiple models.

### 22. No Input Validation on `maxTokens`, `temperature`, `thinkingBudget`

In the settings sidebar, `maxTokens` can be set to negative numbers, `0`, or values exceeding `128000`. `temperature` can be set outside `0-2`. `thinkingBudget` can be set to negative values. The API route does clamp some values (lines 89-91), but the UI allows invalid inputs.

**Impact:** Users can enter nonsensical values.

### 23. `temperature` Is Sent for O1/O3 Models Even Though It's Deleted

In `route.ts` lines 93-104, if `thinkingBudget > 0` and the model starts with `o1` or `o3`, the code sets `delete requestBody.temperature`. But this happens **after** `temperature` was already added to `requestBody` on line 90. The delete works, but it's fragile. If the order changes, temperature would leak through.

**Impact:** Minor — correct behavior but fragile code.

---

## API Route Issues

### 24. Rate Limiter Is Per-Process, Not Per-User

In `route.ts` lines 3-18, the rate limiter uses a module-level `requestTimestamps` array. This is shared across **all users** of the app, not per-IP or per-session. If one user spams the endpoint, all other users get rate limited.

**Impact:** One malicious user can deny service to everyone.

### 25. Rate Limiter Memory Leak

The `requestTimestamps` array in `route.ts` grows unbounded over time. While old entries are shifted out when they fall outside the window, if the server receives no requests for a long time, stale entries are never cleaned up. In a long-running process, this could accumulate memory.

Actually, looking again: the `while` loop on line 10 does clean up old entries on every request. But if there are no requests, old entries sit in memory. This is minor since the array is capped at 30 entries per active window.

**Re-evaluated Impact:** Very minor — array is effectively capped at 30 entries.

### 26. No Request Timeout on Server-Side Fetch

In `route.ts` line 110, the `fetch` call has no timeout. If the LLM API hangs, the Next.js serverless function will wait until the platform kills it (e.g., Vercel's 10s/60s limit). The client-side abort controller in `useTokenBurner.ts` can cancel the client→server request, but if the server→LLM request is already in flight, it continues consuming resources.

**Impact:** Server resources wasted on hung requests; user sees generic timeout error.

### 27. Error Response Leaks API Provider Error Details

In `route.ts` line 122-127:
```ts
const errorData = await response.json().catch(() => null);
const errorMessage = errorData?.error?.message || errorData?.message || `API returned status ${response.status}`;
```

If the LLM provider returns a detailed error (e.g., "Invalid API key" or "Quota exceeded"), this message is forwarded directly to the client. This leaks information about the backend provider.

**Impact:** Information leakage about backend API status.

### 28. No Validation of `apiKey` Format

The API route checks `if (!apiKey)` but doesn't validate the format. An empty string, whitespace, or garbage value is accepted and forwarded to the provider, resulting in a delayed error from the provider.

**Impact:** Poor UX — validation should happen early.

### 29. `prompt` Field Has No Length Limit

The user can send an arbitrarily large prompt in the request body. While `max_tokens` limits the response, a massive prompt could cause issues.

**Impact:** Potential for abuse or unexpectedly large requests.

---

## Missing Features

### 30. No Burn History Export

There's no way to export burn history to CSV, JSON, or share it.

### 31. No Per-Model Statistics

The dashboard shows aggregate stats but not breakdowns by model (e.g., "You burned 500K tokens on GPT-4o and 200K on Claude").

### 32. No Sound Volume Control

The `useBurnSounds` hook generates sounds at fixed volume levels (`gain.gain.setValueAtTime(0.08, ...)`). There's no mute or volume slider.

### 33. No Burn Speed / Token-Per-Second Display

No metric showing how fast tokens are being burned (tokens/second or $/minute).

### 34. No Session Persistence Across Tabs

`localStorage` is used, but changes in one tab don't sync to another tab. If the user has the app open in two tabs, they can burn independently and the stats won't merge.

### 35. No Confirmation for Reset Stats

The "Reset Stats" button immediately clears all data with no confirmation dialog.

**Impact:** Accidental data loss.

---

## Code Quality Issues

### 36. `useBurnSounds` Creates AudioContext Without Checking Support

In `useBurnSounds.ts` line 10:
```ts
audioContextRef.current = new AudioContext()
```

There's no check for `window.AudioContext` support. In older browsers or environments without Web Audio API, this will throw.

**Impact:** App crash in unsupported browsers.

### 37. `FireEffect` Uses `setTimeout` Instead of `useEffect` Cleanup

In `FireEffect.tsx` line 35-37:
```ts
setTimeout(() => {
  setParticles((prev) => prev.filter((p) => p.id !== id))
}, duration * 1000 + 50)
```

These timeouts are not tracked or cleared in a cleanup function. If the component unmounts, the timeouts fire and call `setParticles` on an unmounted component.

**Impact:** Memory leaks and React warnings.

### 38. `BurnButton` Receives `onStop` Prop But Also Uses `onClick` for Stop

In `BurnButton.tsx` line 31:
```tsx
onClick={isAutoBurning ? onStop : onClick}
```

The component receives both `onClick` and `onStop` props, but when `isAutoBurning`, it calls `onStop` through the `onClick` handler. This is confusing — the parent (`page.tsx`) passes `handleStopAutoBurn` to both `onClick` and `onStop`. The `onStop` prop is effectively unused.

**Impact:** Confusing prop API — `onStop` is redundant.

### 39. `useTokenBurner` Hook Is Too Large

The hook is ~295 lines and manages state, side effects, persistence, API calls, and auto-burn logic. It violates the single responsibility principle.

**Impact:** Hard to test, maintain, and reason about.

### 40. No Unit Tests

There are no test files in the project. No Jest, Vitest, or Playwright tests.

**Impact:** No safety net for regressions.

---

## Summary Table

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | Auto-burn race conditions | **Critical** | `useTokenBurner.ts` |
| 2 | Stale error persistence | Medium | `useTokenBurner.ts`, `page.tsx` |
| 3 | API key in plain localStorage | **Critical** | `useSettings.ts` |
| 4 | API key sent in request body | **Critical** | `useTokenBurner.ts`, `route.ts` |
| 5 | Anthropic provider broken | **Critical** | `SettingsSidebar.tsx`, `route.ts` |
| 6 | OpenRouter missing headers | Medium | `route.ts` |
| 7 | Hardcoded API path | Medium | `route.ts` |
| 8 | Dangerous `includes` matching | Medium | `conversions.ts` |
| 9 | Missing model pricing | Low | `conversions.ts` |
| 10 | Settings round-trip bug | Medium | `SettingsSidebar.tsx` |
| 11 | No cancel feedback | Low | `page.tsx` |
| 12 | AnimatedNumber flash | Low | `AnimatedNumber.tsx` |
| 13 | FireEffect memory leak | Medium | `FireEffect.tsx` |
| 14 | ErrorBoundary doesn't catch async | Medium | `ErrorBoundary.tsx` |
| 15 | No keyboard shortcuts | Low | `page.tsx` |
| 16 | No theme toggle | Low | `globals.css`, `layout.tsx` |
| 17 | Cost calc uses wrong model for totals | **Critical** | `useTokenBurner.ts` |
| 18 | Carbon estimates unsourced | Low | `conversions.ts` |
| 19 | (Not a bug — false positive) | — | — |
| 20 | History truncation invisible | Low | `BurnHistory.tsx`, `useTokenBurner.ts` |
| 21 | Total cost wrong with multi-model | **Critical** | `useTokenBurner.ts` |
| 22 | No input validation in settings | Medium | `SettingsSidebar.tsx` |
| 23 | Fragile temperature deletion | Low | `route.ts` |
| 24 | Rate limiter is global | **Critical** | `route.ts` |
| 25 | (Minor — false positive) | — | — |
| 26 | No server-side timeout | Medium | `route.ts` |
| 27 | Error detail leakage | Medium | `route.ts` |
| 28 | No API key format validation | Low | `route.ts` |
| 29 | No prompt length limit | Low | `route.ts` |
| 30 | No export feature | Low | — |
| 31 | No per-model stats | Low | — |
| 32 | No volume control | Low | `useBurnSounds.ts` |
| 33 | No burn speed metric | Low | — |
| 34 | No cross-tab sync | Low | `useTokenBurner.ts` |
| 35 | No reset confirmation | Medium | `page.tsx` |
| 36 | No AudioContext feature check | Low | `useBurnSounds.ts` |
| 37 | FireEffect timeout leak | Medium | `FireEffect.tsx` |
| 38 | Confusing onStop prop | Low | `BurnButton.tsx`, `page.tsx` |
| 39 | Hook too large | Low | `useTokenBurner.ts` |
| 40 | No tests | Medium | — |
