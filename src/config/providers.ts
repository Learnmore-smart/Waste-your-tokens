import { normBase, type ProviderPreset, PROVIDER_PRESETS } from "./providerPresetsData";

export type { ProviderPreset };
export { PROVIDER_PRESETS };

export function baseUrlMatchesPreset(stored: string, preset: ProviderPreset): boolean {
  if (!preset.baseUrl) return false
  const n = normBase(stored)
  if (n === normBase(preset.baseUrl)) return true
  for (const a of preset.baseUrlAliases ?? []) {
    if (n === normBase(a)) return true
  }
  return false
}

/** If URL exactly matches a preset (or alias), return that id. Otherwise `null` (treat as custom). */
export function findProviderIdByBaseUrl(url: string): string | null {
  const n = normBase(url)
  for (const p of PROVIDER_PRESETS) {
    if (p.id === "custom" || !p.baseUrl) continue
    if (n === normBase(p.baseUrl)) return p.id
    for (const a of p.baseUrlAliases ?? []) {
      if (n === normBase(a)) return p.id
    }
  }
  return null
}

export function detectProviderFromSettings(settings: { baseUrl: string; model: string }): string {
  for (const p of PROVIDER_PRESETS) {
    if (p.id === "custom") continue
    if (baseUrlMatchesPreset(settings.baseUrl, p) || p.models.includes(settings.model)) {
      return p.id
    }
  }
  return "custom"
}

export function resolveInitialProviderId(settings: {
  baseUrl: string
  model: string
  selectedProvider?: string
}): string {
  if (settings.selectedProvider) {
    const p = PROVIDER_PRESETS.find((x) => x.id === settings.selectedProvider)
    if (p && p.id !== "custom" && baseUrlMatchesPreset(settings.baseUrl, p)) {
      return settings.selectedProvider
    }
  }
  return detectProviderFromSettings(settings)
}
