import type { Settings } from './types'

export type Impact = {
  gramsCO2: number
  milesDriven: number
  treesToOffsetOneYear: number
}

export function computeImpact(totalTokens: number, settings: Settings): Impact {
  const gramsCO2 = Math.max(0, totalTokens) * Math.max(0, settings.gramsCO2PerToken)
  const milesDriven = settings.gramsCO2PerMile > 0 ? gramsCO2 / settings.gramsCO2PerMile : 0
  const treesToOffsetOneYear =
    settings.gramsCO2PerTreeYear > 0 ? gramsCO2 / settings.gramsCO2PerTreeYear : 0
  return { gramsCO2, milesDriven, treesToOffsetOneYear }
}

