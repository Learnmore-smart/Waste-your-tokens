'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTokenBurner } from '@/hooks/useTokenBurner'
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
  thought,
  text,
  active,
  awaiting,
  onReset,
  onDownload,
  titleOverride,
}: {
  thought: string
  text: string
  active: boolean
  awaiting: boolean
  onReset: () => void
  onDownload: () => void
  /** When set, replaces the default “Stream” label (e.g. Agent A / B in Duo). */
  titleOverride?: string
}) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  /** When false, user has scrolled up — do not yank the viewport on each chunk. */
  const stickToBottomRef = useRef(true)
  const hasContent = thought.length > 0 || text.length > 0

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
  }, [thought, text, active, awaiting])

  const thoughtLine = thought
    ? thought
    : active && !awaiting && !text
      ? '…'
      : '—'

  return (
    <div
      className="w-full max-w-4xl border border-border rounded-xl bg-surface/90 backdrop-blur-sm overflow-hidden flex flex-col min-h-0"
      style={{ minHeight: '220px', maxHeight: '38vh' }}
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
        <div className="flex flex-col min-h-0 flex-1 divide-y divide-border/50 [contain:layout]">
          <div className="px-3 py-2.5 shrink-0 min-h-0">
            <div className="text-[11px] font-medium text-text-tertiary/90 tracking-wide uppercase mb-1.5">
              {t('stream.thought')}
            </div>
            <pre className="m-0 text-sm text-text-secondary/90 font-mono whitespace-pre-wrap break-words">
              {thoughtLine}
            </pre>
          </div>
          <div className="px-3 py-2.5 flex-1 min-h-[5rem] min-w-0">
            <div className="text-[11px] font-medium text-text-tertiary/90 tracking-wide uppercase mb-1.5">
              {t('stream.reply')}
            </div>
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
    </div>
  )
}

const DUO_MODE_KEY = 'waste-tokens-duo-mode'

function loadDuoFromStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(DUO_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export default function Home() {
  const [duoMode, setDuoMode] = useState(false)

  useEffect(() => {
    setDuoMode(loadDuoFromStorage())
  }, [])

  const setDuoModePersist = useCallback((on: boolean) => {
    setDuoMode(on)
    try {
      localStorage.setItem(DUO_MODE_KEY, on ? '1' : '0')
    } catch {
      // ignore
    }
  }, [])

  const {
    totalTokens,
    totalCalls,
    estimatedCost,
    carbonGrams,
    milesDriven,
    treesNeeded,
    isBurning,
    error,
    streamText,
    streamThought,
    streamDuo,
    isAwaitingStream,
    isAwaitingDuo,
    resetStreamCache,
    startBurning,
    stopBurn,
    dismissError,
  } = useTokenBurner(duoMode)

  const { settings, isSettingsOpen, isKeyReady, closeSettings, saveSettings } = useSettings()

  const { t, locale } = useI18n()

  const handleDownloadStream = useCallback(() => {
    if (!streamText && !streamThought) return
    const lines = [
      `=== ${t('stream.thought')} ===`,
      streamThought || '—',
      '',
      `=== ${t('stream.reply')} ===`,
      streamText || '—',
      '',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waste-tokens-stream-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [streamText, streamThought, t])

  const handleDownloadDuoSlot = useCallback(
    (slot: 0 | 1) => {
      const s = streamDuo[slot]
      if (!s.text && !s.thought) return
      const label = slot === 0 ? t('duo.agentA') : t('duo.agentB')
      const lines = [
        `=== ${label} — ${t('stream.thought')} ===`,
        s.thought || '—',
        '',
        `=== ${label} — ${t('stream.reply')} ===`,
        s.text || '—',
        '',
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `waste-tokens-${slot === 0 ? 'a' : 'b'}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
      a.click()
      URL.revokeObjectURL(url)
    },
    [streamDuo, t]
  )

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
                  <div className="flex items-center gap-3 select-none" role="group" aria-label={t('duo.aria')}>
                    <span
                      className={`text-xs font-semibold tracking-tight min-w-[2.5rem] text-right transition-colors ${
                        !duoMode ? 'text-accent' : 'text-text-tertiary'
                      }`}
                    >
                      {t('duo.solo')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-label={t('duo.aria')}
                      aria-checked={duoMode}
                      disabled={isBurning}
                      onClick={() => setDuoModePersist(!duoMode)}
                      className={`
                        relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
                        ${isBurning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${
                          duoMode
                            ? 'bg-accent/25 border-accent/40'
                            : 'bg-surface border-border hover:border-border-strong'
                        }
                      `}
                    >
                      <span
                        className={`
                          inline-block size-5 rounded-full bg-surface shadow-sm border border-border/80 transition-transform
                          ${duoMode ? 'translate-x-5' : 'translate-x-1'}
                        `}
                      />
                    </button>
                    <span
                      className={`text-xs font-semibold tracking-tight min-w-[2.5rem] transition-colors ${
                        duoMode ? 'text-accent' : 'text-text-tertiary'
                      }`}
                    >
                      {t('duo.duo')}
                    </span>
                  </div>
                  {duoMode && (
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
                  <p className="text-text-tertiary text-xs text-center mb-2">
                    {duoMode ? t('stream.captionDuo') : t('stream.caption')}
                  </p>
                  {duoMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <StreamOutputPanel
                        titleOverride={t('duo.panelA')}
                        thought={streamDuo[0].thought}
                        text={streamDuo[0].text}
                        active={isBurning}
                        awaiting={isAwaitingDuo?.[0] ?? false}
                        onReset={resetStreamCache}
                        onDownload={() => handleDownloadDuoSlot(0)}
                      />
                      <StreamOutputPanel
                        titleOverride={t('duo.panelB')}
                        thought={streamDuo[1].thought}
                        text={streamDuo[1].text}
                        active={isBurning}
                        awaiting={isAwaitingDuo?.[1] ?? false}
                        onReset={resetStreamCache}
                        onDownload={() => handleDownloadDuoSlot(1)}
                      />
                    </div>
                  ) : (
                    <StreamOutputPanel
                      thought={streamThought}
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
                    milesDriven={milesDriven}
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
