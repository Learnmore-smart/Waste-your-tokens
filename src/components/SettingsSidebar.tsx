'use client'

import { useState } from 'react'
import type { Settings } from '@/hooks/useSettings'
import { useI18n } from '@/i18n/LanguageContext'

interface SettingsSidebarProps {
  isOpen: boolean
  currentSettings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
}

interface ProviderPreset {
  id: string
  label: string
  baseUrl: string
  models: string[]
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    models: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.2', 'gpt-5', 'gpt-5-mini', 'o3', 'o4-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'xai',
    label: 'xAI',
    baseUrl: 'https://api.x.ai',
    models: ['grok-4.20', 'grok-4.20-multi-agent', 'grok-4.1-fast', 'grok-4', 'grok-3'],
  },
  {
    id: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai',
    models: ['mistral-large-latest', 'devstral-latest', 'codestral-latest', 'mistral-small-latest', 'ministral-8b-latest'],
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b', 'openai/gpt-oss-120b'],
  },
  {
    id: 'cohere',
    label: 'Cohere',
    baseUrl: 'https://api.cohere.com',
    models: ['command-a-03-2025', 'command-a-reasoning-08-2025', 'command-r7b-12-2024'],
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    models: ['sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research', 'sonar-reasoning', 'sonar'],
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz',
    models: ['deepseek-ai/DeepSeek-V4-Pro', 'Qwen/Qwen3.5-397B-A17B', 'deepseek-ai/DeepSeek-V3.1', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'moonshotai/Kimi-K2.6'],
  },
  {
    id: 'fireworks',
    label: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    models: ['accounts/fireworks/models/deepseek-v3.2', 'accounts/fireworks/models/qwen3-235b-a22b', 'accounts/fireworks/models/llama4-maverick-instruct-basic', 'accounts/fireworks/models/kimi-k2p5'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-5.5', 'anthropic/claude-opus-4-7', 'google/gemini-3.1-pro-preview', 'x-ai/grok-4.20', 'deepseek/deepseek-v4-pro'],
  },
  {
    id: 'custom',
    label: 'Custom',
    baseUrl: '',
    models: [],
  },
]

function detectProvider(settings: Settings): string {
  for (const p of PROVIDER_PRESETS) {
    if (p.id === 'custom') continue
    if (settings.baseUrl === p.baseUrl || p.models.includes(settings.model)) {
      return p.id
    }
  }
  return 'custom'
}

function resolveInitialModelState(settings: Settings, providerId: string): { model: string; customModel: string } {
  const preset = PROVIDER_PRESETS.find((p) => p.id === providerId)
  if (!preset || preset.models.length === 0) {
    return { model: 'custom', customModel: settings.model }
  }
  if (preset.models.includes(settings.model)) {
    return { model: settings.model, customModel: settings.customModel }
  }
  return { model: 'custom', customModel: settings.model }
}

export default function SettingsPanel({ currentSettings, onClose, onSave }: SettingsSidebarProps) {
  const { t } = useI18n()

  const [apiKey, setApiKey] = useState(currentSettings.apiKey)
  const [provider, setProvider] = useState(() => detectProvider(currentSettings))
  const [model, setModel] = useState(() => resolveInitialModelState(currentSettings, detectProvider(currentSettings)).model)
  const [customModel, setCustomModel] = useState(() => resolveInitialModelState(currentSettings, detectProvider(currentSettings)).customModel)
  const [baseUrl, setBaseUrl] = useState(currentSettings.baseUrl)
  const [maxTokens, setMaxTokens] = useState(currentSettings.maxTokens)
  const [temperature, setTemperature] = useState(currentSettings.temperature)
  const [thinkingBudget, setThinkingBudget] = useState(currentSettings.thinkingBudget)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider)
    const preset = PROVIDER_PRESETS.find((p) => p.id === newProvider)
    if (preset) {
      setBaseUrl(preset.baseUrl)
      if (preset.models.length > 0) {
        setModel(preset.models[0])
        setCustomModel('')
      } else {
        setModel('custom')
      }
    }
  }

  const isCustomModel = model === 'custom'

  const handleSave = () => {
    const finalModel = isCustomModel ? customModel : model
    if (!finalModel.trim()) return

    onSave({
      apiKey,
      model: finalModel,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      customModel,
      maxTokens,
      temperature,
      thinkingBudget,
      prompt: '',
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
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none`}
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
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
              <select
                value={isCustomModel ? 'custom' : model}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setModel('custom')
                  } else {
                    setModel(e.target.value)
                    setCustomModel('')
                  }
                }}
                className={`${inputClass} cursor-pointer appearance-none`}
              >
                {currentPreset.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="custom">{t('settings.customModelOption')}</option>
              </select>
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
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
              className={inputClass}
            />
            <p className="text-text-tertiary text-xs mt-1.5">
              {t('settings.baseUrlHint')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('settings.maxTokens')}</label>
              <input
                type="number"
                min={1}
                max={128000}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.thinkingBudget')}</label>
              <input
                type="number"
                min={0}
                max={100000}
                step={1024}
                value={thinkingBudget}
                onChange={(e) => setThinkingBudget(Number(e.target.value))}
                className={inputClass}
              />
              <p className="text-text-tertiary text-xs mt-1.5">
                {t('settings.thinkingBudgetHint')}
              </p>
            </div>
          </div>

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
