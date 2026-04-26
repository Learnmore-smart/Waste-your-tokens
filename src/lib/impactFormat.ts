/**
 * 小数值的对比指标（里程、树、充电等）需要自适应小数位，否则会全部显示为 0。
 */
export function decimalsForMagnitude(
  value: number,
  maxDecimals: number
): number {
  if (!Number.isFinite(value)) return 0
  const a = Math.abs(value)
  if (a === 0) return 0
  if (a >= 100) return Math.min(0, maxDecimals)
  /** 2–99 的整数用 0 位小数，避免 16 显示成 16.0。 */
  if (a >= 10 && Number.isInteger(value)) return Math.min(0, maxDecimals)
  if (a >= 10) return Math.min(1, maxDecimals)
  if (a >= 1) return Math.min(2, maxDecimals)
  if (a >= 0.1) return Math.min(3, maxDecimals)
  if (a >= 0.01) return Math.min(4, maxDecimals)
  return maxDecimals
}
