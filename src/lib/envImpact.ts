export type EnvImpact = {
  gramsCO2e: number
  milesDriven: number
  treesPerYear: number
}

const GRAMS_CO2E_PER_1K_TOKENS = 0.2
const GRAMS_CO2E_PER_MILE = 404
const GRAMS_CO2E_ABSORBED_PER_TREE_PER_YEAR = 21772

export function estimateEnvImpact(totalTokens: number): EnvImpact {
  const gramsCO2e = (totalTokens / 1000) * GRAMS_CO2E_PER_1K_TOKENS
  const milesDriven = gramsCO2e / GRAMS_CO2E_PER_MILE
  const treesPerYear = gramsCO2e / GRAMS_CO2E_ABSORBED_PER_TREE_PER_YEAR
  return { gramsCO2e, milesDriven, treesPerYear }
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(n)
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}
