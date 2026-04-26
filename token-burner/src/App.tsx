import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

type BurnMode = 'simulate' | 'api'

type Settings = {
  mode: BurnMode
  endpoint: string
  apiKey: string
  model: string
  maxTokens: number
  gCO2Per1kTokens: number
}

const defaults: Settings = {
  mode: 'simulate',
  endpoint: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxTokens: 1024,
  gCO2Per1kTokens: 0.2,
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function seeded(n: number) {
  const x = Math.sin(n * 999.123) * 10000
  return x - Math.floor(x)
}

function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key)
    if (!raw) return initial
    try {
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

function formatInt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function formatFloat(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

function Impact({ totalTokens, settings }: { totalTokens: number; settings: Settings }) {
  const grams = (totalTokens / 1000) * settings.gCO2Per1kTokens
  const miles = grams / 404
  const trees = grams / 21000

  return (
    <div className="guilt" aria-label="Environmental guilt tracker">
      <span className="pill">≈ {formatFloat(grams)} g CO₂</span>
      <span className="pill">≈ {formatFloat(miles)} miles</span>
      <span className="pill">≈ {formatFloat(trees)} trees/year</span>
    </div>
  )
}

function Gear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 15.1c.1-.35.17-.71.2-1.08l2.05-1.2-2-3.46-2.35.55a7.8 7.8 0 0 0-1.67-.97l-.3-2.4h-4l-.3 2.4c-.6.22-1.16.54-1.67.97l-2.35-.55-2 3.46 2.05 1.2c.03.37.1.73.2 1.08l-1.65 1.76 2 3.46 2.25-1a7.8 7.8 0 0 0 1.87.74l.6 2.26h4l.6-2.26c.66-.18 1.29-.43 1.87-.74l2.25 1 2-3.46-1.65-1.76Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Sheet({
  open,
  settings,
  setSettings,
  onClose,
  onResetTotals,
}: {
  open: boolean
  settings: Settings
  setSettings: (next: Settings) => void
  onClose: () => void
  onResetTotals: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="sheetOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <motion.aside
            className="sheet"
            initial={{ x: 26, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 26, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheetHeader">
              <div className="sheetTitle">Settings</div>
              <button className="iconButton" onClick={onClose} type="button" aria-label="Close settings">
                <span className="kbd">Esc</span>
              </button>
            </div>

            <div className="sheetBody">
              <div className="field">
                <div className="labelRow">
                  <div className="label">Mode</div>
                  <div className="hint">Simulation works instantly</div>
                </div>
                <select
                  className="select"
                  value={settings.mode}
                  onChange={(e) => setSettings({ ...settings, mode: e.target.value as BurnMode })}
                >
                  <option value="simulate">Simulate burn</option>
                  <option value="api">Use API</option>
                </select>
              </div>

              <div className="field">
                <div className="labelRow">
                  <div className="label">Endpoint</div>
                  <div className="hint">OpenAI-compatible</div>
                </div>
                <input
                  className="input"
                  value={settings.endpoint}
                  placeholder="https://…/v1/chat/completions"
                  onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
                />
              </div>

              <div className="row">
                <div className="field">
                  <div className="labelRow">
                    <div className="label">Model</div>
                    <div className="hint">Any string</div>
                  </div>
                  <input
                    className="input"
                    value={settings.model}
                    placeholder="model-name"
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  />
                </div>
                <div className="field">
                  <div className="labelRow">
                    <div className="label">Max tokens</div>
                    <div className="hint">Output</div>
                  </div>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={String(settings.maxTokens)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxTokens: clamp(Number(e.target.value || 0), 0, 8192),
                      })
                    }
                  />
                </div>
              </div>

              <div className="field">
                <div className="labelRow">
                  <div className="label">API key</div>
                  <div className="hint">Stored locally</div>
                </div>
                <input
                  className="input"
                  value={settings.apiKey}
                  type="password"
                  placeholder="sk-…"
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                />
              </div>

              <div className="field">
                <div className="labelRow">
                  <div className="label">CO₂ estimate</div>
                  <div className="hint">g per 1k tokens</div>
                </div>
                <input
                  className="input"
                  inputMode="decimal"
                  value={String(settings.gCO2Per1kTokens)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      gCO2Per1kTokens: clamp(Number(e.target.value || 0), 0, 50),
                    })
                  }
                />
              </div>

              <div className="row">
                <button type="button" className="primary" onClick={onClose}>
                  Done
                </button>
                <button type="button" className="danger" onClick={onResetTotals}>
                  Reset totals
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function Burst({ x, y, seedValue }: { x: number; y: number; seedValue: number }) {
  const dots = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => {
      const r0 = seeded(seedValue + i * 2.1)
      const r1 = seeded(seedValue + i * 3.7)
      const angle = (Math.PI * 2 * (i / 26 + r0 * 0.15)) % (Math.PI * 2)
      const dist = 140 + r1 * 90
      const dx = Math.cos(angle) * dist
      const dy = Math.sin(angle) * dist * 0.85
      const size = 4 + r0 * 8
      const hue = 18 + r1 * 42
      return { i, dx, dy, size, hue }
    })
  }, [seedValue])

  return (
    <motion.div
      style={{ position: 'fixed', left: x, top: y, width: 0, height: 0, pointerEvents: 'none', zIndex: 20 }}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {dots.map((d) => (
        <motion.span
          key={d.i}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: d.size,
            height: d.size,
            borderRadius: 999,
            background: `hsl(${d.hue} 100% 62% / 0.95)`,
            boxShadow: `0 0 18px hsl(${d.hue} 100% 62% / 0.55)`,
          }}
          initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.8 }}
          animate={{ x: d.dx, y: d.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      ))}
    </motion.div>
  )
}

export default function App() {
  const [settings, setSettings] = useLocalStorageState<Settings>('tokenIncinerator.settings.v1', defaults)
  const [totalTokens, setTotalTokens] = useLocalStorageState<number>('tokenIncinerator.totalTokens.v1', 0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [burst, setBurst] = useState<{ id: number; x: number; y: number; seedValue: number } | null>(null)
  const [busy, setBusy] = useState(false)

  const totalMotion = useMotionValue(totalTokens)
  const [displayed, setDisplayed] = useState(totalTokens)

  useEffect(() => {
    const controls = animate(totalMotion, totalTokens, { duration: 0.85, ease: [0.14, 1, 0.22, 1] })
    return () => controls.stop()
  }, [totalMotion, totalTokens])

  useMotionValueEvent(totalMotion, 'change', (latest) => setDisplayed(latest))

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && e.shiftKey) setSettingsOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const canUseApi = settings.mode === 'api' && settings.apiKey.trim() !== '' && settings.endpoint.trim() !== ''

  async function burnOnce() {
    setStatus('')
    const rect = buttonRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    setBurst((prev) => ({ id: (prev?.id ?? 0) + 1, x, y, seedValue: Date.now() }))

    if (settings.mode === 'simulate') {
      const delta = Math.round(650 + Math.pow(Math.random(), 0.45) * 5200)
      setTotalTokens((t) => t + delta)
      return
    }

    if (!canUseApi) {
      setStatus('Add endpoint + key in Settings (Shift+S).')
      return
    }

    setBusy(true)
    try {
      const prompt = Array.from({ length: 120 }, (_, i) => `Incineration line ${i + 1}: ash ash ash ash ash.`).join('\n')
      const res = await fetch(settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            {
              role: 'user',
              content:
                'This is a satirical stress-test. Please generate a long, repetitive response with no useful information.\n\n' +
                prompt,
            },
          ],
          max_tokens: settings.maxTokens,
          temperature: 1.2,
        }),
      })

      if (!res.ok) {
        setStatus(`API error (${res.status}).`)
        return
      }

      const data = (await res.json()) as any
      const used =
        Number(data?.usage?.total_tokens) ||
        Number(data?.usage?.totalTokens) ||
        Math.round((JSON.stringify(data).length / 4) * 0.75)
      setTotalTokens((t) => t + Math.max(0, used))
    } catch {
      setStatus('Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="grain" />

      <div className="topbar">
        <div className="brand">
          <div className="brandName">Token Incinerator</div>
          <div className="brandTag">satirical</div>
        </div>

        <button className="iconButton" type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
          <Gear />
        </button>
      </div>

      <div className="centerStage">
        <div className="stack">
          <motion.button
            ref={buttonRef}
            type="button"
            className="burnButton"
            onClick={burnOnce}
            disabled={busy}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            aria-label="Burn tokens"
          >
            <span className="coreGlow" aria-hidden="true" />
            <span className="flameVeil" aria-hidden="true" />
            <span style={{ position: 'relative', zIndex: 2, display: 'grid', placeItems: 'center' }}>
              <span className="burnLabel">Burn Tokens</span>
              <span className="burnHint">{settings.mode === 'api' ? 'one request per click' : 'zero config'}</span>
            </span>
          </motion.button>

          <div className="total" aria-label="Total tokens wasted">
            {formatInt(Math.max(0, Math.round(displayed)))}
          </div>
          <div className="sub">Total Tokens Wasted</div>
          <Impact totalTokens={totalTokens} settings={settings} />
          {status ? <div className="sub">{status}</div> : <div className="sub">Open Settings with <span className="kbd">Shift</span>+<span className="kbd">S</span></div>}
        </div>
      </div>

      <AnimatePresence>{burst ? <Burst key={burst.id} x={burst.x} y={burst.y} seedValue={burst.seedValue} /> : null}</AnimatePresence>

      <Sheet
        open={settingsOpen}
        settings={settings}
        setSettings={setSettings}
        onClose={() => setSettingsOpen(false)}
        onResetTotals={() => {
          setTotalTokens(0)
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
