import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { SettingsModal } from './components/SettingsModal'
import { computeImpact } from './lib/impact'
import { format1, format2, formatInt } from './lib/format'
import { burnOpenAIOnce } from './lib/openai'
import { defaultSettings } from './lib/defaults'
import { loadSettings, loadTotalTokens, saveSettings, saveTotalTokens } from './lib/storage'
import type { Settings } from './lib/types'
import { useAnimatedNumber } from './lib/useAnimatedNumber'
import { useRaf } from './lib/useRaf'

type Ember = {
  id: string
  x: number
  y: number
  dx: number
  dy: number
  size: number
}

type EmberStyle = CSSProperties & { '--dx': string; '--dy': string }

function emberStyle(e: Ember): EmberStyle {
  return {
    transform: `translate3d(${e.x}px, ${e.y}px, 0)`,
    width: `${e.size}px`,
    height: `${e.size}px`,
    '--dx': `${e.dx}px`,
    '--dy': `${e.dy}px`,
  }
}

function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [burning, setBurning] = useState(false)
  const [totalTokens, setTotalTokens] = useState(() => loadTotalTokens())
  const [error, setError] = useState<string | null>(null)
  const [embers, setEmbers] = useState<Ember[]>([])
  const [flash, setFlash] = useState(0)

  const totalRef = useRef<number>(totalTokens)
  const floatRef = useRef<number>(totalTokens)
  const saveAt = useRef<number>(0)
  const burningRef = useRef(false)

  useEffect(() => {
    burningRef.current = burning
  }, [burning])

  const seedEmbers = (force?: boolean) => {
    if (!force && !burningRef.current) return
    const now = Date.now()
    const next: Ember[] = Array.from({ length: 6 }).map((_, i) => {
      const a = Math.random() * Math.PI * 2
      const r = 14 + Math.random() * 22
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      const dx = Math.cos(a) * (80 + Math.random() * 80)
      const dy = 120 + Math.random() * 160
      const size = 2 + Math.random() * 3.5
      return { id: `${now}-${i}-${Math.random()}`, x, y, dx, dy, size }
    })
    setEmbers((list) => [...list.slice(-36), ...next])
  }

  useEffect(() => {
    totalRef.current = totalTokens
    const now = Date.now()
    if (now >= saveAt.current) {
      saveAt.current = now + 900
      saveTotalTokens(totalTokens)
    }
  }, [totalTokens])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useRaf(burning && settings.mode === 'simulate', (dtMs) => {
    const inc = (settings.tokensPerSecond * dtMs) / 1000
    floatRef.current += inc
    const next = Math.floor(floatRef.current)
    if (next !== totalRef.current) {
      totalRef.current = next
      setTotalTokens(next)
    }
  })

  useEffect(() => {
    if (!burning || settings.mode !== 'openai') return

    const ctrl = new AbortController()
    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        try {
          const { totalTokens: used } = await burnOpenAIOnce(settings, ctrl.signal)
          floatRef.current += used
          const next = Math.floor(floatRef.current)
          totalRef.current = next
          setTotalTokens(next)
          setFlash((x) => x + 1)
          seedEmbers()
        } catch (e) {
          if (cancelled) return
          const msg = e instanceof Error ? e.message : 'Request failed'
          setError(msg)
          setBurning(false)
          return
        }
      }
    }

    loop()
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [burning, settings])

  useEffect(() => {
    if (!burning) return
    const id = window.setInterval(() => seedEmbers(), 260)
    return () => window.clearInterval(id)
  }, [burning])

  useEffect(() => {
    if (!burning) return
    seedEmbers()
  }, [burning])

  const animatedTotal = useAnimatedNumber(totalTokens, { stiffness: 0.14 })

  const impact = useMemo(() => computeImpact(totalTokens, settings), [settings, totalTokens])

  const modeLabel =
    settings.mode === 'simulate'
      ? `Simulated · ${formatInt(settings.tokensPerSecond)} t/s`
      : `Real API · ${settings.model}`

  const canBurn = settings.mode !== 'openai' || !!settings.apiKey.trim()

  const onBurnPress = () => {
    setError(null)
    setFlash((x) => x + 1)
    seedEmbers(true)
    setBurning((v) => !v)
  }

  const onReset = () => {
    setError(null)
    setBurning(false)
    floatRef.current = 0
    totalRef.current = 0
    setTotalTokens(0)
    saveTotalTokens(0)
  }

  return (
    <div className="relative h-full">
      <div className="grain" />

      <header className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between px-4 pt-4 sm:px-8 sm:pt-7">
        <div className="select-none">
          <div className="font-display text-lg tracking-tight text-ash-50">Token Furnace</div>
          <div className="mt-1 text-xs text-ash-300/85">{modeLabel}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ash-100/90 transition hover:bg-white/10"
            aria-label="Open settings"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      <main className="relative grid h-full place-items-center px-4 pb-28 pt-24 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="w-full max-w-[980px]">
          <div className="mx-auto flex max-w-[720px] flex-col items-center">
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.22em] text-ash-300/80">
                Total Tokens Wasted
              </div>
              <div className="mt-3 font-display text-5xl tracking-tight text-ash-50 sm:text-6xl">
                <span className="tabular-nums">{formatInt(animatedTotal)}</span>
              </div>
            </div>

            <div className="relative mt-10">
              <div
                className={[
                  'pointer-events-none absolute -inset-10 rounded-full opacity-0 transition-opacity',
                  burning ? 'opacity-100' : '',
                ].join(' ')}
                aria-hidden="true"
              >
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(255,92,0,0.55),transparent_62%)] blur-2xl" />
                <div className="absolute inset-0 animate-heatPulse rounded-full bg-[radial-gradient(circle_at_50%_55%,rgba(255,45,45,0.35),transparent_60%)] blur-2xl" />
              </div>

              <button
                type="button"
                onClick={onBurnPress}
                disabled={!canBurn}
                aria-pressed={burning}
                className={[
                  'focus-ring group relative grid h-48 w-48 place-items-center rounded-full border',
                  'transition duration-300 active:scale-[0.985] sm:h-56 sm:w-56',
                  canBurn
                    ? 'border-white/10 bg-gradient-to-b from-white/10 to-black/40 hover:border-ember-400/35'
                    : 'cursor-not-allowed border-white/10 bg-white/5 opacity-60',
                ].join(' ')}
              >
                <div
                  key={flash}
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                  aria-hidden="true"
                >
                  <div className="absolute -inset-10 rotate-12 bg-[radial-gradient(circle_at_30%_30%,rgba(255,184,107,0.12),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(255,92,0,0.18),transparent_60%)] opacity-0 group-active:opacity-100" />
                  <div className="absolute inset-0 animate-tickShine bg-[linear-gradient(110deg,transparent,rgba(255,184,107,0.22),transparent)] opacity-0 group-active:opacity-100" />
                </div>

                <div
                  className={[
                    'pointer-events-none absolute inset-3 rounded-full opacity-0 blur-xl transition-opacity',
                    burning ? 'opacity-100' : '',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 animate-flameWobble rounded-full bg-[radial-gradient(circle_at_50%_70%,rgba(255,92,0,0.45),transparent_60%)]" />
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(255,45,45,0.28),transparent_62%)]" />
                </div>

                <div className="relative text-center">
                  <div className="font-display text-2xl tracking-tight text-ash-50 sm:text-[28px]">
                    {burning ? 'Stop' : 'Burn'}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.24em] text-ash-300/80">
                    Tokens
                  </div>
                </div>
              </button>

              {embers.map((e) => (
                <div
                  key={e.id}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 animate-emberFloat rounded-full bg-ember-400 shadow-[0_0_0_1px_rgba(255,184,107,0.15)]"
                  style={emberStyle(e)}
                  onAnimationEnd={() => setEmbers((list) => list.filter((x) => x.id !== e.id))}
                />
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-ash-300/85">
              {settings.mode === 'openai' && !settings.apiKey.trim()
                ? 'Add an API key in Settings, or switch to Simulated.'
                : 'One click. Infinite regret.'}
            </div>

            {error ? (
              <div className="mt-4 w-full max-w-[540px] rounded-2xl border border-ember-400/25 bg-ember-500/10 px-4 py-3 text-sm text-ash-50">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 sm:px-8 sm:pb-6">
        <div className="mx-auto flex max-w-[980px] flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <Metric label="Carbon (gCO₂)" value={format1(impact.gramsCO2)} />
            <Metric label="Miles Driven" value={format2(impact.milesDriven)} />
            <Metric label="Trees / year" value={format2(impact.treesToOffsetOneYear)} />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setSettings(defaultSettings)
                setError(null)
              }}
              className="focus-ring rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-ash-100/90 transition hover:bg-white/10"
            >
              Defaults
            </button>
            <button
              type="button"
              onClick={onReset}
              className="focus-ring rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-ash-100/90 transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>
      </footer>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] uppercase tracking-[0.22em] text-ash-300/80">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-ash-50">
        <span className="tabular-nums">{value}</span>
      </div>
    </div>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19.5 12a7.52 7.52 0 0 0-.08-1.07l1.67-1.3-1.7-2.95-2.02.83a7.6 7.6 0 0 0-1.85-1.07l-.3-2.15H9.78l-.3 2.15c-.66.24-1.29.6-1.85 1.07l-2.02-.83-1.7 2.95 1.67 1.3c-.05.35-.08.7-.08 1.07s.03.72.08 1.07l-1.67 1.3 1.7 2.95 2.02-.83c.56.47 1.19.83 1.85 1.07l.3 2.15h4.44l.3-2.15c.66-.24 1.29-.6 1.85-1.07l2.02.83 1.7-2.95-1.67-1.3c.05-.35.08-.7.08-1.07Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default App
