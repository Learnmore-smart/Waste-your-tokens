import { useEffect, useMemo, useRef } from 'react'
import type { Settings } from '../lib/settings'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function asNumber(v: string, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function SettingsDrawer(props: {
  open: boolean
  settings: Settings
  onChange: (next: Settings) => void
  onClose: () => void
  onResetTotals: () => void
}) {
  const { open, settings, onChange, onClose, onResetTotals } = props
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  const isApi = settings.burnMode === 'api'

  const maskedKeyPreview = useMemo(() => {
    const k = settings.apiKey.trim()
    if (!k) return ''
    if (k.length <= 10) return '•'.repeat(k.length)
    return `${k.slice(0, 3)}…${k.slice(-4)}`
  }, [settings.apiKey])

  return (
    <div className={open ? 'drawerRoot drawerOpen' : 'drawerRoot'} aria-hidden={!open}>
      <button className="drawerOverlay" type="button" onClick={onClose} aria-label="Close settings" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="drawerHeader">
          <div>
            <div className="drawerTitle">Settings</div>
            <div className="drawerSub">Tuck the chaos away. Keep the button pure.</div>
          </div>
          <button className="iconBtn" type="button" onClick={onClose} aria-label="Close settings">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="drawerBody">
          <div className="fieldGroup">
            <div className="groupTitle">Burn Mode</div>
            <div className="seg">
              <button
                type="button"
                className={settings.burnMode === 'simulate' ? 'segBtn segOn' : 'segBtn'}
                onClick={() => onChange({ ...settings, burnMode: 'simulate' })}
              >
                Simulated
              </button>
              <button
                type="button"
                className={settings.burnMode === 'api' ? 'segBtn segOn' : 'segBtn'}
                onClick={() => onChange({ ...settings, burnMode: 'api' })}
              >
                Real API
              </button>
            </div>
          </div>

          {isApi ? (
            <div className="fieldGroup">
              <div className="groupTitle">API</div>

              <label className="field">
                <div className="fieldLabel">API Key</div>
                <input
                  ref={firstFieldRef}
                  value={settings.apiKey}
                  type="password"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Paste it. Don’t screenshot it."
                  onChange={(e) => onChange({ ...settings, apiKey: e.target.value })}
                />
                {maskedKeyPreview ? <div className="fieldHint">Stored locally as: {maskedKeyPreview}</div> : null}
              </label>

              <label className="field">
                <div className="fieldLabel">Base URL</div>
                <input
                  value={settings.baseUrl}
                  type="url"
                  inputMode="url"
                  placeholder="https://api.openai.com"
                  onChange={(e) => onChange({ ...settings, baseUrl: e.target.value })}
                />
              </label>

              <label className="field">
                <div className="fieldLabel">Model</div>
                <input
                  value={settings.model}
                  type="text"
                  inputMode="text"
                  placeholder="gpt-4o-mini"
                  onChange={(e) => onChange({ ...settings, model: e.target.value })}
                />
              </label>

              <label className="field">
                <div className="fieldLabel">Max output tokens</div>
                <input
                  value={settings.maxOutputTokens}
                  type="number"
                  min={64}
                  max={8192}
                  step={64}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      maxOutputTokens: clamp(asNumber(e.target.value, settings.maxOutputTokens), 64, 8192),
                    })
                  }
                />
                <div className="fieldHint">Higher = faster burn, bigger bills.</div>
              </label>
            </div>
          ) : (
            <div className="fieldGroup">
              <div className="groupTitle">Simulation</div>
              <label className="field">
                <div className="fieldLabel">Tokens per second</div>
                <input
                  ref={firstFieldRef}
                  value={settings.simulateTokensPerSecond}
                  type="number"
                  min={60}
                  max={25000}
                  step={60}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      simulateTokensPerSecond: clamp(
                        asNumber(e.target.value, settings.simulateTokensPerSecond),
                        60,
                        25000,
                      ),
                    })
                  }
                />
              </label>
            </div>
          )}

          <div className="fieldGroup">
            <div className="groupTitle">Environmental Guilt</div>
            <label className="field">
              <div className="fieldLabel">g CO₂e per 1K tokens</div>
              <input
                value={settings.gramsCO2Per1kTokens}
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.05}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    gramsCO2Per1kTokens: clamp(
                      asNumber(e.target.value, settings.gramsCO2Per1kTokens),
                      0,
                      10,
                    ),
                  })
                }
              />
              <div className="fieldHint">A playful estimate, not a scientific claim.</div>
            </label>
          </div>

          <div className="drawerActions">
            <button className="btnDanger" type="button" onClick={onResetTotals}>
              Reset totals
            </button>
            <button className="btnGhost" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

