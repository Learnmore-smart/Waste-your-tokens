import './App.css'
import { useEffect, useMemo, useState } from 'react'
import FireCanvas from './components/FireCanvas'
import MetricsHud from './components/MetricsHud'
import SettingsDrawer from './components/SettingsDrawer'
import { estimateImpact } from './lib/impact'
import { defaultSettings, STORAGE_KEYS, type Settings } from './lib/settings'
import { useLocalStorageState } from './lib/useLocalStorageState'
import { useRafNumber } from './lib/useRafNumber'

function App() {
  const [settings, setSettings] = useLocalStorageState<Settings>(STORAGE_KEYS.settings, defaultSettings)
  const [totalTokens, setTotalTokens] = useLocalStorageState<number>(STORAGE_KEYS.totalTokens, 0)
  const [burning, setBurning] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [seed, setSeed] = useState(0)
  const [lastError, setLastError] = useState<string | undefined>(undefined)

  const displayedTotal = useRafNumber(totalTokens, { smoothing: burning ? 0.22 : 0.12 })

  const impact = useMemo(() => {
    return estimateImpact(totalTokens, settings.gramsCO2Per1kTokens)
  }, [settings.gramsCO2Per1kTokens, totalTokens])

  useEffect(() => {
    if (!burning) return
    setLastError(undefined)

    let cancelled = false

    const burnSimulated = () => {
      let raf = 0
      let last = performance.now()

      const tick = (now: number) => {
        if (cancelled) return
        const dt = Math.min(48, now - last)
        last = now
        const jitter = 0.85 + Math.random() * 0.35
        const add = (settings.simulateTokensPerSecond * jitter * dt) / 1000
        setTotalTokens((t) => t + add)
        if (Math.random() < 0.22) setSeed((s) => s + 1)
        raf = requestAnimationFrame(tick)
      }

      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }

    const burnApi = async () => {
      const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '')
      const apiKey = settings.apiKey.trim()
      const model = settings.model.trim()

      if (!baseUrl || !apiKey || !model) {
        setLastError('Missing API settings.')
        setBurning(false)
        return
      }

      while (!cancelled) {
        try {
          const r = await fetch('/api/burn', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              baseUrl,
              apiKey,
              model,
              maxOutputTokens: settings.maxOutputTokens,
            }),
          })

          if (!r.ok) {
            const t = await r.text().catch(() => '')
            throw new Error(t || `HTTP ${r.status}`)
          }

          const data = (await r.json()) as { totalTokens?: number }
          const add = Number(data.totalTokens ?? 0)
          if (!Number.isFinite(add) || add <= 0) throw new Error('No token usage returned.')

          setTotalTokens((t) => t + add)
          setSeed((s) => s + 1)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Request failed.'
          setLastError(msg)
          setBurning(false)
          break
        }
      }
    }

    const cleanup = settings.burnMode === 'simulate' ? burnSimulated() : undefined
    if (!cleanup) burnApi()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [
    burning,
    settings.apiKey,
    settings.baseUrl,
    settings.burnMode,
    settings.maxOutputTokens,
    settings.model,
    settings.simulateTokensPerSecond,
    setTotalTokens,
  ])

  return (
    <div className="stage">
      <FireCanvas active={burning} intensity={burning ? 1 : 0.7} seed={seed} />

      <button className="settingsBtn" type="button" onClick={() => setDrawerOpen(true)} aria-label="Open settings">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="settingsIcon">
          <path
            d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.57.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.51.4 1.06.71 1.63.94l.36 2.54c.04.25.25.44.49.44h3.8c.24 0 .45-.19.49-.44l.36-2.54c.57-.23 1.12-.54 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <MetricsHud
        totalTokens={displayedTotal}
        impact={impact}
        burning={burning}
        mode={settings.burnMode}
        lastError={lastError}
      />

      <main className="center">
        <button
          type="button"
          className={burning ? 'burnBtn burnOn' : 'burnBtn'}
          onClick={() => {
            setBurning((b) => !b)
            setSeed((s) => s + 1)
          }}
        >
          <span className="burnChrome" aria-hidden="true" />
          <span className="burnText">Burn Tokens</span>
          <span className="burnSub">{burning ? 'Click to stop' : 'One click. No configuration. No redemption.'}</span>
        </button>
      </main>

      <SettingsDrawer
        open={drawerOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setDrawerOpen(false)}
        onResetTotals={() => setTotalTokens(0)}
      />
    </div>
  )
}

export default App
