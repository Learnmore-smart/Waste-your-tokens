export type Impact = {
  gramsCO2: number
  milesDriven: number
  treesToOffset: number
}

export function estimateImpact(totalTokens: number, gramsCO2Per1kTokens: number): Impact {
  const gramsCO2 = (totalTokens / 1000) * gramsCO2Per1kTokens
  const milesDriven = gramsCO2 / 404
  const treesToOffset = gramsCO2 / 21000

  return { gramsCO2, milesDriven, treesToOffset }
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatFixed(n: number, digits: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n)
}

