import { createPortal } from 'react-dom'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { Settings } from '../lib/types'

type Props = {
  open: boolean
  settings: Settings
  onChange: (next: Settings) => void
  onClose: () => void
}

export function SettingsModal({ open, settings, onChange, onClose }: Props) {
  const [showKey, setShowKey] = useState(false)

  const close = useCallback(() => {
    setShowKey(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, open])

  const node = useMemo(() => {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onMouseDown={close}
          role="presentation"
        />
        <div className="absolute inset-0 flex items-end justify-center p-3 sm:items-center">
          <div
            className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/10 bg-ash-900/80 shadow-ember"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-display text-xl tracking-tight text-ash-50">Settings</div>
                <div className="text-sm text-ash-300/80">Hide the messy stuff. Burn in peace.</div>
              </div>
              <button
                type="button"
                onClick={close}
                className="focus-ring rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-ash-100/90 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-[72vh] overflow-auto px-5 pb-6 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Burn Mode">
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton
                      active={settings.mode === 'simulate'}
                      onClick={() => onChange({ ...settings, mode: 'simulate' })}
                      label="Simulated"
                      sub="Instant"
                    />
                    <ToggleButton
                      active={settings.mode === 'openai'}
                      onClick={() => onChange({ ...settings, mode: 'openai' })}
                      label="Real API"
                      sub="Costly"
                    />
                  </div>
                </Field>

                <Field label="Tokens / Second">
                  <NumberInput
                    value={settings.tokensPerSecond}
                    min={1}
                    max={250000}
                    step={50}
                    onChange={(v) => onChange({ ...settings, tokensPerSecond: v })}
                    suffix="t/s"
                  />
                </Field>

                <Field label="API Key">
                  <div className="flex gap-2">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={settings.apiKey}
                      onChange={(e) => onChange({ ...settings, apiKey: e.target.value })}
                      placeholder="sk-…"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-ash-50 outline-none ring-0 focus:border-ember-400/60"
                      autoComplete="off"
                      spellCheck={false}
                      inputMode="text"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="focus-ring rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-ash-100/90 transition hover:bg-white/10"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </Field>

                <Field label="Base URL">
                  <input
                    type="text"
                    value={settings.baseUrl}
                    onChange={(e) => onChange({ ...settings, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-ash-50 outline-none ring-0 focus:border-ember-400/60"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="url"
                  />
                </Field>

                <Field label="Model">
                  <input
                    type="text"
                    value={settings.model}
                    onChange={(e) => onChange({ ...settings, model: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-ash-50 outline-none ring-0 focus:border-ember-400/60"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="text"
                  />
                </Field>

                <Field label="Max Tokens / Request">
                  <NumberInput
                    value={settings.burstMaxTokens}
                    min={1}
                    max={8192}
                    step={50}
                    onChange={(v) => onChange({ ...settings, burstMaxTokens: v })}
                    suffix="max"
                  />
                </Field>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="font-display text-base tracking-tight text-ash-50">Environmental Math</div>
                <div className="text-xs text-ash-300/80">Satire-grade estimates</div>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field label="gCO₂ / token">
                  <NumberInput
                    value={settings.gramsCO2PerToken}
                    min={0}
                    max={10}
                    step={0.0001}
                    precision={6}
                    onChange={(v) => onChange({ ...settings, gramsCO2PerToken: v })}
                  />
                </Field>
                <Field label="gCO₂ / mile">
                  <NumberInput
                    value={settings.gramsCO2PerMile}
                    min={1}
                    max={5000}
                    step={1}
                    onChange={(v) => onChange({ ...settings, gramsCO2PerMile: v })}
                  />
                </Field>
                <Field label="gCO₂ / tree·year">
                  <NumberInput
                    value={settings.gramsCO2PerTreeYear}
                    min={1}
                    max={200000}
                    step={100}
                    onChange={(v) => onChange({ ...settings, gramsCO2PerTreeYear: v })}
                  />
                </Field>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-ash-100/90">
                  Tip: leave mode on Simulated for the purest, fastest, least-accountable token
                  incineration experience.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }, [close, onChange, open, settings, showKey])

  if (!node) return null
  return createPortal(node, document.body)
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-[0.16em] text-ash-300/80">{label}</div>
      {children}
    </label>
  )
}

function ToggleButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'focus-ring group rounded-2xl border px-4 py-3 text-left transition',
        active
          ? 'border-ember-400/40 bg-gradient-to-b from-ember-500/15 to-white/5'
          : 'border-white/10 bg-white/5 hover:bg-white/10',
      ].join(' ')}
    >
      <div className="text-sm font-medium text-ash-50">{label}</div>
      <div className="text-xs text-ash-300/90">{sub}</div>
    </button>
  )
}

function NumberInput({
  value,
  min,
  max,
  step,
  precision,
  suffix,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  precision?: number
  suffix?: string
  onChange: (next: number) => void
}) {
  const display = precision != null ? value.toFixed(precision) : String(value)
  return (
    <div className="relative">
      <input
        type="number"
        value={display}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isFinite(next)) return
          onChange(Math.min(max, Math.max(min, next)))
        }}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 pr-12 text-sm text-ash-50 outline-none ring-0 focus:border-ember-400/60"
      />
      {suffix ? (
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ash-300/80">
          {suffix}
        </div>
      ) : null}
    </div>
  )
}
