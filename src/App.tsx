import { useEffect, useMemo, useRef, useState } from 'react'
import { burnOnce, type BurnerSettings } from './lib/burner'
import { estimateEnvImpact, formatCompact, formatInt } from './lib/envImpact'
import { startFire } from './lib/fire'
import { readJson, writeJson } from './lib/storage'

type Toast = { message: string; kind: 'error' | 'info'; id: string }

const SETTINGS_KEY = 'wyt.settings.v1'
const TOTAL_KEY = 'wyt.totalTokens.v1'

const defaultSettings: BurnerSettings = {
  mode: 'simulated',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxTokens: 2048,
  requestEveryMs: 1200,
  concurrency: 1,
  acknowledgeCosts: false
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function useAnimatedNumber(value: number, smoothing = 0.16) {
  const [display, setDisplay] = useState(value)
  const vRef = useRef(value)
  vRef.current = value

  useEffect(() => {
    let raf = 0
    const step = () => {
      setDisplay((d) => {
        const target = vRef.current
        const delta = target - d
        if (Math.abs(delta) < 0.5) return target
        return d + delta * smoothing
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [smoothing])

  return display
}

export default function App() {
  const [settings, setSettings] = useState<BurnerSettings>(() => readJson(SETTINGS_KEY, defaultSettings))
  const [totalTokens, setTotalTokens] = useState<number>(() => readJson(TOTAL_KEY, 0))
  const animatedTotal = useAnimatedNumber(totalTokens)

  const [isBurning, setIsBurning] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const burnAbortRef = useRef<AbortController | null>(null)
  const burnLoopRunning = useRef(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const burnBtnRef = useRef<HTMLButtonElement | null>(null)
  const [intensity, setIntensity] = useState(0)
  const intensityRef = useRef(0)

  const impact = useMemo(() => estimateEnvImpact(animatedTotal), [animatedTotal])

  useEffect(() => {
    writeJson(SETTINGS_KEY, settings)
  }, [settings])

  useEffect(() => {
    const id = window.setTimeout(() => writeJson(TOTAL_KEY, totalTokens), 120)
    return () => window.clearTimeout(id)
  }, [totalTokens])

  useEffect(() => {
    intensityRef.current = intensity
  }, [intensity])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const fire = startFire(
      c,
      () => {
        const btn = burnBtnRef.current
        if (!btn) return null
        const r = btn.getBoundingClientRect()
        const root = c.getBoundingClientRect()
        const x = r.left - root.left + r.width / 2
        const y = r.top - root.top + r.height / 2 + 10
        return { x, y, r: Math.max(14, Math.min(70, r.width * 0.12)) }
      },
      () => intensityRef.current
    )
    return () => fire.stop()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(null), toast.kind === 'error' ? 4500 : 2600)
      return () => window.clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    if (!isBurning) setIntensity((v) => Math.max(0, v - 0.08))
  }, [isBurning])

  const start = () => {
    if (isBurning) return
    setToast(null)
    setIsBurning(true)
  }

  const stop = () => {
    setIsBurning(false)
    burnAbortRef.current?.abort()
    burnAbortRef.current = null
  }

  useEffect(() => {
    if (!isBurning) {
      burnLoopRunning.current = false
      return
    }

    if (settings.mode === 'simulated') {
      const tick = window.setInterval(() => {
        const bump = 120 + Math.floor(Math.random() * 260)
        setTotalTokens((t) => t + bump)
        setIntensity((v) => clamp(v + 0.08 + Math.random() * 0.06, 0, 1))
      }, 72)
      return () => window.clearInterval(tick)
    }

    burnAbortRef.current?.abort()
    const ac = new AbortController()
    burnAbortRef.current = ac

    burnLoopRunning.current = true
    const worker = async () => {
      while (burnLoopRunning.current && !ac.signal.aborted) {
        const r = await burnOnce(settings, ac.signal)
        if (!burnLoopRunning.current || ac.signal.aborted) break
        if (r.ok) {
          if (r.tokens > 0) {
            setTotalTokens((t) => t + r.tokens)
            setIntensity((v) => clamp(v + 0.14 + Math.random() * 0.08, 0, 1))
          }
        } else {
          setToast({ message: r.error || 'Burn failed', kind: 'error', id: crypto.randomUUID() })
          setIntensity((v) => Math.max(0, v - 0.2))
        }

        const jitter = 0.86 + Math.random() * 0.34
        const wait = Math.max(120, Math.round(settings.requestEveryMs * jitter))
        await new Promise<void>((resolve) => window.setTimeout(resolve, wait))
      }
    }

    const workers = Array.from({ length: clamp(settings.concurrency, 1, 4) }, () => worker())
    void Promise.allSettled(workers).finally(() => {})

    return () => {
      burnLoopRunning.current = false
      ac.abort()
    }
  }, [isBurning, settings])

  const ctaLabel = isBurning ? 'Stop Burning' : 'Burn Tokens'

  return (
    <div className="app">
      <canvas ref={canvasRef} className="fire" aria-hidden="true" />

      <header className="top">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            WY T
          </div>
          <div className="brandText">
            <div className="brandTitle">Waste Your Tokens</div>
            <div className="brandSub">A minimalist incinerator for maximalist API spend.</div>
          </div>
        </div>

        <button className="gear" type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <span aria-hidden="true">⚙</span>
        </button>
      </header>

      <section className="hud" aria-label="Live metrics">
        <div className="hudRow">
          <div className="hudKicker">Total Tokens Wasted</div>
          <div className="hudValue">{formatInt(animatedTotal)}</div>
        </div>

        <div className="hudRow thin">
          <div className="hudKicker">Guilt, approximately</div>
          <div className="hudTriplet" aria-label="Environmental impact estimates">
            <div className="hudChip">
              <div className="chipValue">{formatCompact(impact.gramsCO2e)}g</div>
              <div className="chipLabel">CO₂e</div>
            </div>
            <div className="hudChip">
              <div className="chipValue">{formatCompact(impact.milesDriven)}</div>
              <div className="chipLabel">miles</div>
            </div>
            <div className="hudChip">
              <div className="chipValue">{formatCompact(impact.treesPerYear)}</div>
              <div className="chipLabel">trees/yr</div>
            </div>
          </div>
        </div>
      </section>

      <main className="stage">
        <div className="ctaWrap">
          <button
            ref={burnBtnRef}
            className={`cta ${isBurning ? 'on' : ''}`}
            type="button"
            onClick={() => (isBurning ? stop() : start())}
            aria-pressed={isBurning}
          >
            <span className="ctaGlow" aria-hidden="true" />
            <span className="ctaInner">
              <span className="ctaLabel">{ctaLabel}</span>
              <span className="ctaHint">{settings.mode === 'live' ? 'Live API mode' : 'Simulated burn'}</span>
            </span>
          </button>

          <div className={`status ${isBurning ? 'on' : ''}`} aria-live="polite">
            {isBurning ? 'Incinerating…' : 'Idle. Waiting for poor decisions.'}
          </div>
        </div>
      </main>

      {toast ? (
        <div className={`toast ${toast.kind}`} role="status" aria-live="polite" key={toast.id}>
          {toast.message}
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="modalOverlay" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Settings" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">Settings</div>
              <button className="modalClose" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                ×
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <label className="field">
                  <div className="label">Mode</div>
                  <div className="seg">
                    <button
                      type="button"
                      className={settings.mode === 'simulated' ? 'active' : ''}
                      onClick={() => setSettings((s) => ({ ...s, mode: 'simulated' }))}
                    >
                      Simulated
                    </button>
                    <button
                      type="button"
                      className={settings.mode === 'live' ? 'active' : ''}
                      onClick={() => setSettings((s) => ({ ...s, mode: 'live' }))}
                    >
                      Live API
                    </button>
                  </div>
                </label>

                <label className="field span2">
                  <div className="label">Model</div>
                  <input
                    value={settings.model}
                    onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                    placeholder="e.g. gpt-4o-mini"
                    autoComplete="off"
                  />
                </label>

                <label className="field span2">
                  <div className="label">Endpoint</div>
                  <input
                    value={settings.endpoint}
                    onChange={(e) => setSettings((s) => ({ ...s, endpoint: e.target.value }))}
                    placeholder="https://…/v1/chat/completions"
                    autoComplete="off"
                  />
                </label>

                <label className="field span2">
                  <div className="label">API key</div>
                  <input
                    value={settings.apiKey}
                    onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                    type="password"
                    placeholder="Stored locally in your browser"
                    autoComplete="off"
                  />
                </label>

                <label className="field">
                  <div className="label">Max tokens/request</div>
                  <input
                    value={settings.maxTokens}
                    onChange={(e) => setSettings((s) => ({ ...s, maxTokens: clamp(Number(e.target.value) || 0, 64, 8192) }))}
                    type="number"
                    min={64}
                    max={8192}
                  />
                </label>

                <label className="field">
                  <div className="label">Every (ms)</div>
                  <input
                    value={settings.requestEveryMs}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, requestEveryMs: clamp(Number(e.target.value) || 0, 200, 20_000) }))
                    }
                    type="number"
                    min={200}
                    max={20000}
                  />
                </label>

                <label className="field">
                  <div className="label">Concurrency</div>
                  <input
                    value={settings.concurrency}
                    onChange={(e) => setSettings((s) => ({ ...s, concurrency: clamp(Number(e.target.value) || 0, 1, 4) }))}
                    type="number"
                    min={1}
                    max={4}
                  />
                </label>

                <label className="field span2 check">
                  <input
                    checked={settings.acknowledgeCosts}
                    onChange={(e) => setSettings((s) => ({ ...s, acknowledgeCosts: e.target.checked }))}
                    type="checkbox"
                  />
                  <div>
                    <div className="label">I understand this can cost real money.</div>
                    <div className="helper">Required to enable Live API burning.</div>
                  </div>
                </label>
              </div>

              <div className="divider" />

              <div className="actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    stop()
                    setTotalTokens(0)
                    setToast({ message: 'Counters reset.', kind: 'info', id: crypto.randomUUID() })
                  }}
                >
                  Reset counters
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setSettingsOpen(false)
                    setToast({ message: 'Saved.', kind: 'info', id: crypto.randomUUID() })
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
