/**
 * Prefix for client-side URL paths when the app is served under `next.config` `basePath`
 * (e.g. /waste-your-tokens on rateministere.com).
 */
export function withBasePath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
