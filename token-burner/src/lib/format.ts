export function formatInt(n: number) {
  return Math.floor(Math.max(0, n)).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function format1(n: number) {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function format2(n: number) {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

