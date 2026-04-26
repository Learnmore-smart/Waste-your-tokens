'use client'

import { useState } from 'react'
import type { Settings } from '@/hooks/useSettings'
import { useI18n } from '@/i18n/LanguageContext'
import {
  PROVIDER_PRESETS,
  findProviderIdByBaseUrl,
  resolveInitialProviderId,
} from '@/config/providers'
import { THINKING_LEVELS, type ThinkingLevel } from '@/lib/thinkingLevel'
import SmoothSelect from '@/components/SmoothSelect'

interface SettingsSidebarProps {
  isOpen: boolean
  currentSettings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
}

const CUSTOM_MODEL_CACHE_KEY = 'waste-tokens-custom-model-cache'

function loadCustomModelCache(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(CUSTOM_MODEL_CACHE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return {}
}

function saveCustomModelToCache(providerId: string, customModelName: string) {
  try {
    const cache = loadCustomModelCache()
    cache[providerId] = customModelName
    localStorage.setItem(CUSTOM_MODEL_CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

function getCustomModelFromCache(providerId: string): string {
  return loadCustomModelCache()[providerId] || ''
}

function resolveInitialModelState(settings: Settings, providerId: string): { model: string; customModel: string } {
  const preset = PROVIDER_PRESETS.find((p) => p.id === providerId)
  if (!preset || preset.models.length === 0) {
    return { model: 'custom', customModel: settings.model }
  }
  if (preset.models.includes(settings.model)) {
    return { model: settings.model, customModel: settings.customModel }
  }
  const cached = getCustomModelFromCache(providerId)
  return { model: 'custom', customModel: cached || settings.model }
}

export default function SettingsPanel({ currentSettings, onClose, onSave }: SettingsSidebarProps) {
  const { t } = useI18n()

  const [apiKey, setApiKey] = useState(currentSettings.apiKey)
  const [provider, setProvider] = useState(() => resolveInitialProviderId(currentSettings))
  const [model, setModel] = useState(() => resolveInitialModelState(currentSettings, resolveInitialProviderId(currentSettings)).model)
  const [customModel, setCustomModel] = useState(() => resolveInitialModelState(currentSettings, resolveInitialProviderId(currentSettings)).customModel)
  const [baseUrl, setBaseUrl] = useState(currentSettings.baseUrl)
  const [temperature, setTemperature] = useState(currentSettings.temperature)
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(currentSettings.thinkingLevel)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleProviderChange = (newProvider: string) => {
    if (model === 'custom' && customModel.trim()) {
      saveCustomModelToCache(provider, customModel)
    }

    setProvider(newProvider)
    const preset = PROVIDER_PRESETS.find((p) => p.id === newProvider)
    if (preset) {
      setBaseUrl(preset.baseUrl)
      if (preset.models.length > 0) {
        const cached = getCustomModelFromCache(newProvider)
        if (cached) {
          setModel('custom')
          setCustomModel(cached)
        } else {
          setModel(preset.models[0])
          setCustomModel('')
        }
      } else {
        setModel('custom')
        const cached = getCustomModelFromCache(newProvider)
        setCustomModel(cached)
      }
    }
  }

  const isCustomModel = model === 'custom'

  const handleSave = () => {
    const finalModel = isCustomModel ? customModel : model
    if (!finalModel.trim()) return

    if (isCustomModel && customModel.trim()) {
      saveCustomModelToCache(provider, customModel)
    }

    onSave({
      apiKey,
      model: finalModel,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      customModel,
      thinkingLevel,
      temperature,
      prompt: '',
      selectedProvider: provider,
    })
    onClose()
  }

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === provider)

  const inputClass = 'w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-accent transition-colors placeholder:text-text-tertiary'
  const labelClass = 'text-text-secondary text-xs font-medium tracking-wide uppercase mb-1.5 block'

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">{t('settings.title')}</h2>
          <p className="text-text-tertiary text-sm">{t('settings.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className={labelClass}>{t('settings.provider')}</label>
            <SmoothSelect
              aria-label={t('settings.provider')}
              value={provider}
              onChange={handleProviderChange}
              options={PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>

          <div>
            <label className={labelClass}>{t('settings.apiKey')}</label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2.5 bg-surface border border-border rounded-lg text-text-tertiary hover:text-foreground hover:border-border-strong transition-colors text-xs font-medium cursor-pointer"
              >
                {showApiKey ? t('settings.hide') : t('settings.show')}
              </button>
            </div>
            <p className="text-text-tertiary text-xs mt-1.5">
              {t('settings.apiKeyHint')}
            </p>
          </div>

          <div>
            <label className={labelClass}>{t('settings.model')}</label>
            {currentPreset && currentPreset.models.length > 0 ? (
              <SmoothSelect
                aria-label={t('settings.model')}
                value={isCustomModel ? 'custom' : model}
                onChange={(v) => {
                  if (v === 'custom') {
                    setModel('custom')
                  } else {
                    setModel(v)
                    setCustomModel('')
                  }
                }}
                options={[
                  ...currentPreset.models.map((m) => ({ value: m, label: m })),
                  { value: 'custom', label: t('settings.customModelOption') },
                ]}
              />
            ) : (
              <input
                type="text"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value)
                  setModel('custom')
                }}
                placeholder="e.g. my-model-name"
                className={inputClass}
              />
            )}
            {isCustomModel && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder={t('settings.customModelPlaceholder')}
                className={`${inputClass} mt-2`}
              />
            )}
          </div>

          <div>
            <label className={labelClass}>{t('settings.baseUrl')}</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                const v = e.target.value
                setBaseUrl(v)
                const fromUrl = findProviderIdByBaseUrl(v)
                setProvider(fromUrl ?? 'custom')
              }}
              placeholder={t('settings.baseUrlPlaceholder')}
              className={inputClass}
            />
            <p className="text-text-tertiary text-xs mt-1.5">
              {t('settings.baseUrlHint')}
            </p>
          </div>

          <div>
            <label className={labelClass}>{t('settings.thinking')}</label>
            <SmoothSelect
              aria-label={t('settings.thinking')}
              value={thinkingLevel}
              onChange={(v) => setThinkingLevel(v as ThinkingLevel)}
              options={THINKING_LEVELS.map((lvl) => ({
                value: lvl,
                label: t(`settings.thinkingLevel.${lvl}`),
              }))}
            />
            <p className="text-text-tertiary text-xs mt-1.5">
              {t('settings.thinkingHint')}
            </p>
          </div>

          <p className="text-text-tertiary text-xs leading-relaxed border border-border/60 rounded-lg px-3 py-2.5 bg-surface/50">
            {t('settings.maxOutputNote')}
          </p>

          <div>
            <label className={labelClass}>{t('settings.temperature')}: {temperature.toFixed(1)}</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-text-tertiary text-xs mt-1">
              <span>{t('settings.precise')}</span>
              <span>{t('settings.creative')}</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-lg font-medium text-sm cursor-pointer border-none bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
