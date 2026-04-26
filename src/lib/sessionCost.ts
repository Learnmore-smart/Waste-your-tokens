/** Display-only conversion for rough CNY parity (internal costs stay USD). */
export const USD_TO_CNY_DISPLAY = 7.2

export function usdToCnyDisplay(usd: number): number {
  return usd * USD_TO_CNY_DISPLAY
}

export function formatSessionCostUsd(usd: number, locale: 'en' | 'zh'): string {
  if (locale === 'zh') {
    return `¥${usdToCnyDisplay(usd).toFixed(2)}`
  }
  return `$${usd.toFixed(2)}`
}
