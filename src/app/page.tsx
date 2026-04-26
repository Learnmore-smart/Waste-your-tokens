'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTokenBurner, MAX_PARALLEL_AGENTS } from '@/hooks/useTokenBurner'
import { useSettings } from '@/hooks/useSettings'
import { useBurnSounds } from '@/hooks/useBurnSounds'
import { useI18n } from '@/i18n/LanguageContext'
import BurnButton from '@/components/BurnButton'
import GuiltTracker from '@/components/GuiltTracker'
import SettingsPanel from '@/components/SettingsSidebar'
import TokenRain from '@/components/TokenRain'
import AnimatedNumber from '@/components/AnimatedNumber'
import LanguageToggle from '@/components/LanguageToggle'
import { usdToCnyDisplay } from '@/lib/sessionCost'
import StreamLatexContent from '@/components/StreamLatexContent'
import BurningAtmosphere from '@/components/BurningAtmosphere'

type TabId = 'burn' | 'settings'

function StreamOutputPanel({
  text,
  active,
  awaiting,
  onReset,
  onDownload,
  titleOverride,
  compact = false,
}: {
  text: string
  active: boolean
  awaiting: boolean
  onReset: () => void
  onDownload: () => void
  /** When set, replaces the default “Stream” label (e.g. Agent A / B in Duo). */
  titleOverride?: string
  /** Tighter max height for many parallel panels. */
  compact?: boolean
}) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  /** When false, user has scrolled up — do not yank the viewport on each chunk. */
  const stickToBottomRef = useRef(true)
  const hasContent = text.length > 0

  const nearBottomPx = 80
  const updateStickFromScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const slack = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = slack <= nearBottomPx
  }, [])

  useEffect(() => {
    if (!active) stickToBottomRef.current = true
  }, [active])

  useEffect(() => {
    if (!active || !stickToBottomRef.current || !scrollRef.current) return
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
    return () => {
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [text, active, awaiting])

  return (
    <div
      className="w-full max-w-4xl border border-border rounded-xl bg-surface/90 backdrop-blur-sm overflow-hidden flex flex-col min-h-0"
      style={{
        minHeight: compact ? 'min(200px, 24vh)' : '220px',
        maxHeight: compact ? 'min(280px, 24vh)' : '38vh',
      }}
    >
      <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 shrink-0 min-h-10">
        <span className="text-xs font-medium text-text-tertiary tracking-wide">
          {titleOverride ?? t('stream.title')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-text-tertiary hover:text-foreground cursor-pointer border border-border rounded-md px-2 py-1 bg-surface/80 transition-colors"
          >
            {t('stream.reset')}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!hasContent}
            className="text-xs font-medium text-text-tertiary hover:text-foreground cursor-pointer border border-border rounded-md px-2 py-1 bg-surface/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-tertiary"
          >
            {t('stream.download')}
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateStickFromScroll}
        className="overflow-y-auto flex-1 min-h-0 flex flex-col overscroll-y-contain touch-pan-y"
      >
        {awaiting && (
          <div
            className="shrink-0 flex items-center gap-2.5 px-3 py-2 border-b border-border/60 bg-accent/[0.06]"
            role="status"
            aria-live="polite"
          >
            <span
              className="inline-block size-3.5 shrink-0 border-2 border-accent/35 border-t-accent rounded-full motion-safe:animate-spin"
              aria-hidden
            />
            <span className="text-xs font-medium text-text-secondary">
              {t('stream.awaiting')}
            </span>
          </div>
        )}
        <div className="min-w-0 shrink-0 px-3 py-2.5">
          {text ? (
            active ? (
              <pre className="m-0 min-w-0 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground/95">
                {text}
              </pre>
            ) : (
              <StreamLatexContent
                className="min-w-0 whitespace-pre-wrap break-words text-[13px] leading-relaxed [&_.katex]:text-[1em] [&_.katex]:text-foreground/95 [&_.katex-d-block]:text-center"
                text={text}
              />
            )
          ) : (
            <div className="font-mono text-sm text-foreground/55">
              {active && !awaiting ? '…' : '—'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PARALLEL_PRESET_KEY = 'waste-tokens-parallel-preset'
const LEGACY_DUO_KEY = 'waste-tokens-duo-mode'
const SQUAD_MIN = 3
const DEFAULT_SQUAD_N = 6

type ParallelTier = 'solo' | 'duo' | 'squad'

type ParallelPreset = { tier: ParallelTier; squadN: number }

function clampSquadN(n: number) {
  return Math.min(MAX_PARALLEL_AGENTS, Math.max(SQUAD_MIN, Math.floor(n)))
}

function loadParallelPreset(): ParallelPreset {
  if (typeof window === 'undefined') return { tier: 'solo', squadN: DEFAULT_SQUAD_N }
  try {
    const raw = localStorage.getItem(PARALLEL_PRESET_KEY)
    if (raw) {
      const p = JSON.parse(raw) as { tier?: string; squadN?: number }
      if (p.tier === 'solo' || p.tier === 'duo' || p.tier === 'squad') {
        return {
          tier: p.tier,
          squadN: clampSquadN(typeof p.squadN === 'number' ? p.squadN : DEFAULT_SQUAD_N),
        }
      }
    }
  } catch {
    // ignore
  }
  try {
    if (localStorage.getItem(LEGACY_DUO_KEY) === '1') {
      return { tier: 'duo', squadN: DEFAULT_SQUAD_N }
    }
  } catch {
    // ignore
  }
  return { tier: 'solo', squadN: DEFAULT_SQUAD_N }
}

function parallelCountFromPreset(p: ParallelPreset): number {
  if (p.tier === 'solo') return 1
  if (p.tier === 'duo') return 2
  return p.squadN
}

export default function Home() {
  const [parallelPreset, setParallelPreset] = useState<ParallelPreset>({
    tier: 'solo',
    squadN: DEFAULT_SQUAD_N,
  })

  useEffect(() => {
    setParallelPreset(loadParallelPreset())
  }, [])

  const persistParallelPreset = useCallback((next: ParallelPreset) => {
    setParallelPreset(next)
    try {
      localStorage.setItem(PARALLEL_PRESET_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  const parallelCount = useMemo(
    () => parallelCountFromPreset(parallelPreset),
    [parallelPreset]
  )

  const {
    totalTokens,
    totalCalls,
    estimatedCost,
    carbonGrams,
    drivingKm,
    treesNeeded,
    isBurning,
    error,
    streamText,
    streamMulti,
    isAwaitingStream,
    isAwaitingParallel,
    resetStreamCache,
    startBurning,
    stopBurn,
    dismissError,
  } = useTokenBurner(parallelCount)

  const { settings, isSettingsOpen, isKeyReady, closeSettings, saveSettings } = useSettings()

  const { t, locale } = useI18n()

  const handleDownloadStream = useCallback(() => {
    if (!streamText) return
    const blob = new Blob([streamText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waste-tokens-stream-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [streamText])

  const handleDownloadMultiSlot = useCallback(
    (slot: number) => {
      const s = streamMulti[slot]
      if (!s?.text) return
      const blob = new Blob([s.text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `waste-tokens-${slot + 1}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
      a.click()
      URL.revokeObjectURL(url)
    },
    [streamMulti]
  )

  const streamHelpText = useMemo(() => {
    if (parallelCount === 1) return t('stream.caption')
    if (parallelCount === 2) return t('stream.captionDuo')
    return t('stream.captionSquadN').replace('{{n}}', String(parallelCount))
  }, [parallelCount, t])

  const TABS: { id: TabId; label: string }[] = [
    { id: 'burn', label: t('tabs.burn') },
    { id: 'settings', label: t('tabs.settings') },
  ]

  const [activeTab, setActiveTab] = useState<TabId>('burn')
  const { playBurnSound, playCashSound, playStopSound } = useBurnSounds()
  const prevCallsRef = useRef(totalCalls)
  const displayCost = locale === 'zh' ? usdToCnyDisplay(estimatedCost) : estimatedCost
  const costPrefix = locale === 'zh' ? '¥' : '$'

  useEffect(() => {
    if (totalCalls > prevCallsRef.current) {
      playCashSound()
    }
    prevCallsRef.current = totalCalls
  }, [totalCalls, playCashSound])

  useEffect(() => {
    if (isSettingsOpen) setActiveTab('settings')
  }, [isSettingsOpen])

  const buttonState = useMemo<'idle' | 'burning' | 'error'>(() => {
    if (isBurning) return 'burning'
    if (error) return 'error'
    return 'idle'
  }, [isBurning, error])

  const handleBurn = () => {
    if (!isKeyReady || !settings.apiKey) {
      setActiveTab('settings')
      return
    }
    if (isBurning) {
      playStopSound()
      stopBurn()
    } else {
      playBurnSound()
      startBurning()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative pb-4">
      <TokenRain active={isBurning} totalTokens={totalTokens} />
      <BurningAtmosphere active={isBurning} />

      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <motion.div
                className="w-2 h-2 rounded-full bg-accent"
                animate={isBurning ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                {t('app.title')}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-text-tertiary shrink-0">
              <span>
                <AnimatedNumber value={totalTokens} decimals={0} /> {t('header.tokens')}
              </span>
              <span className="text-border-strong">·</span>
              <span>
                {totalCalls} {t('header.calls')}
              </span>
              <span className="text-border-strong">·</span>
              <span>
                <AnimatedNumber
                  value={displayCost}
                  decimals={2}
                  prefix={costPrefix}
                />
              </span>
            </div>
          </div>
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id !== 'settings') closeSettings()
                }}
                className={`
                  relative px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-none bg-transparent
                  ${
                    activeTab === tab.id
                      ? 'text-foreground'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {activeTab === 'burn' && (
              <motion.div
                key="burn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="flex flex-col items-center gap-3 w-full max-w-4xl">
                  <div
                    className="flex flex-col items-stretch gap-2 w-full max-w-md"
                    role="group"
                    aria-label={t('duo.aria')}
                  >
                    <div
                      className="flex p-1 rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-sm shadow-sm"
                      style={{ boxShadow: 'inset 0 1px 0 0 oklch(0.5 0 0 / 0.06)' }}
                    >
                      {(
                        [
                          { id: 'solo' as const, label: t('duo.solo') },
                          { id: 'duo' as const, label: t('duo.duo') },
                          { id: 'squad' as const, label: t('duo.squad') },
                        ] as const
                      ).map(({ id, label }) => {
                        const active = parallelPreset.tier === id
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={isBurning}
                            onClick={() => persistParallelPreset({ ...parallelPreset, tier: id })}
                            className={`
                              relative flex-1 rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition-all
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
                              ${isBurning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              ${
                                active
                                  ? 'text-accent bg-accent/[0.12] shadow-[0_1px_0_0_oklch(0.5_0_0/0.08)]'
                                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface/80'
                              }
                            `}
                          >
                            {active && (
                              <motion.span
                                layoutId="parallel-mode-pill"
                                className="absolute inset-0 rounded-xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                              />
                            )}
                            <span className="relative z-10">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {parallelPreset.tier === 'squad' && (
                      <div className="flex items-center justify-center gap-3 px-1">
                        <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
                          {t('duo.squadStepper')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBurning || parallelPreset.squadN <= SQUAD_MIN}
                            onClick={() =>
                              persistParallelPreset({
                                ...parallelPreset,
                                squadN: clampSquadN(parallelPreset.squadN - 1),
                              })
                            }
                            className="size-8 rounded-lg border border-border/90 bg-surface/90 text-sm font-semibold text-foreground/90 hover:border-accent/40 hover:bg-accent/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label="Decrease squad size"
                          >
                            −
                          </button>
                          <div className="min-w-[2.5rem] text-center font-mono text-sm font-semibold text-foreground tabular-nums">
                            {parallelPreset.squadN}
                            <span className="text-text-tertiary font-normal">/{MAX_PARALLEL_AGENTS}</span>
                          </div>
                          <button
                            type="button"
                            disabled={isBurning || parallelPreset.squadN >= MAX_PARALLEL_AGENTS}
                            onClick={() =>
                              persistParallelPreset({
                                ...parallelPreset,
                                squadN: clampSquadN(parallelPreset.squadN + 1),
                              })
                            }
                            className="size-8 rounded-lg border border-border/90 bg-surface/90 text-sm font-semibold text-foreground/90 hover:border-accent/40 hover:bg-accent/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label="Increase squad size"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            disabled={isBurning}
                            onClick={() =>
                              persistParallelPreset({
                                ...parallelPreset,
                                squadN: MAX_PARALLEL_AGENTS,
                              })
                            }
                            className="ml-1 text-[10px] font-semibold tracking-wide text-accent/90 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border-none px-1"
                          >
                            {t('duo.squadMax')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {parallelCount > 1 && (
                    <p className="text-text-tertiary text-[11px] text-center max-w-xl leading-relaxed">
                      {t('duo.caption')}
                    </p>
                  )}
                </div>

                <BurnButton
                  onClick={handleBurn}
                  onStop={handleBurn}
                  disabled={false}
                  state={buttonState}
                />

                {error && (
                  <div className="flex items-center gap-3 max-w-md bg-error-light border border-error/20 rounded-lg px-4 py-3">
                    <p className="text-error text-sm flex-1">{error}</p>
                    <button
                      type="button"
                      onClick={dismissError}
                      className="text-error/60 hover:text-error text-xs font-medium cursor-pointer bg-transparent border-none"
                    >
                      {t('burn.dismiss')}
                    </button>
                  </div>
                )}

                <div className="w-full max-w-6xl">
                  <p className="text-text-tertiary text-xs text-center mb-2">{streamHelpText}</p>
                  {parallelCount > 1 ? (
                    <div
                      className={`
                        grid w-full gap-3
                        ${parallelCount <= 2 ? 'grid-cols-1 md:grid-cols-2' : ''}
                        ${
                          parallelCount >= 3 && parallelCount <= 6
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            : ''
                        }
                        ${
                          parallelCount >= 7
                            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                            : ''
                        }
                      `}
                    >
                      {Array.from({ length: parallelCount }, (_, i) => (
                        <StreamOutputPanel
                          key={i}
                          compact={parallelCount > 2}
                          titleOverride={`${t('duo.agent')} ${i + 1}`}
                          text={streamMulti[i]?.text ?? ''}
                          active={isBurning}
                          awaiting={isAwaitingParallel?.[i] ?? false}
                          onReset={resetStreamCache}
                          onDownload={() => handleDownloadMultiSlot(i)}
                        />
                      ))}
                    </div>
                  ) : (
                    <StreamOutputPanel
                      text={streamText}
                      active={isBurning}
                      awaiting={isAwaitingStream}
                      onReset={resetStreamCache}
                      onDownload={handleDownloadStream}
                    />
                  )}
                </div>

                <div className="w-full max-w-3xl mt-2 pt-8 border-t border-border">
                  <GuiltTracker
                    carbonGrams={carbonGrams}
                    drivingKm={drivingKm}
                    treesNeeded={treesNeeded}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsPanel
                  isOpen
                  currentSettings={settings}
                  onClose={() => setActiveTab('burn')}
                  onSave={saveSettings}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-surface/40 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-[11px] sm:text-xs text-text-tertiary leading-relaxed text-balance text-center">
            {t('legal.disclaimer')}
          </p>
        </div>
      </footer>
    </div>
  )
}
