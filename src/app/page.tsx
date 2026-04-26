'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTokenBurner } from '@/hooks/useTokenBurner'
import { useSettings } from '@/hooks/useSettings'
import { useBurnSounds } from '@/hooks/useBurnSounds'
import { useI18n } from '@/i18n/LanguageContext'
import BurnButton from '@/components/BurnButton'
import GuiltTracker from '@/components/GuiltTracker'
import SettingsPanel from '@/components/SettingsSidebar'
import BurnHistory from '@/components/BurnHistory'
import TokenRain from '@/components/TokenRain'
import AnimatedNumber from '@/components/AnimatedNumber'
import LanguageToggle from '@/components/LanguageToggle'

type TabId = 'burn' | 'impact' | 'history' | 'settings'

export default function Home() {
  const {
    totalTokens,
    totalCalls,
    estimatedCost,
    carbonGrams,
    milesDriven,
    treesNeeded,
    history,
    isBurning,
    isAutoBurning,
    error,
    burn,
    startAutoBurn,
    stopBurn,
    resetStats,
    dismissError,
  } = useTokenBurner()

  const {
    settings,
    isSettingsOpen,
    isKeyReady,
    closeSettings,
    saveSettings,
  } = useSettings()

  const { t } = useI18n()

  const TABS: { id: TabId; label: string }[] = [
    { id: 'burn', label: t('tabs.burn') },
    { id: 'impact', label: t('tabs.impact') },
    { id: 'history', label: t('tabs.history') },
    { id: 'settings', label: t('tabs.settings') },
  ]

  const [activeTab, setActiveTab] = useState<TabId>('burn')
  const [autoBurnDelay, setAutoBurnDelay] = useState(2000)
  const { playBurnSound, playCashSound, playStopSound } = useBurnSounds()
  const prevCallsRef = useRef(totalCalls)

  useEffect(() => {
    if (totalCalls > prevCallsRef.current) {
      playCashSound()
    }
    prevCallsRef.current = totalCalls
  }, [totalCalls, playCashSound])

  useEffect(() => {
    if (isSettingsOpen) setActiveTab('settings')
  }, [isSettingsOpen])

  const buttonState = useMemo<'idle' | 'burning' | 'auto-burning' | 'error'>(() => {
    if (isAutoBurning) return 'auto-burning'
    if (isBurning) return 'burning'
    if (error) return 'error'
    return 'idle'
  }, [isBurning, isAutoBurning, error])

  const isActivelyBurning = isBurning || isAutoBurning

  const handleBurn = () => {
    if (!isKeyReady || !settings.apiKey) {
      setActiveTab('settings')
      return
    }
    playBurnSound()
    burn()
  }

  const handleAutoBurn = () => {
    if (!isKeyReady || !settings.apiKey) {
      setActiveTab('settings')
      return
    }
    playBurnSound()
    startAutoBurn(autoBurnDelay)
  }

  const handleStop = () => {
    playStopSound()
    stopBurn()
  }

  const handleReset = () => {
    if (isAutoBurning) stopBurn()
    resetStats()
  }

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalTokens,
      totalCalls,
      estimatedCost,
      carbonGrams,
      milesDriven,
      treesNeeded,
      history,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waste-tokens-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <TokenRain active={isActivelyBurning} totalTokens={totalTokens} />

      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <motion.div
                className="w-2 h-2 rounded-full bg-accent"
                animate={isActivelyBurning ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                {t('app.title')}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-text-tertiary">
              <span>
                <AnimatedNumber value={totalTokens} decimals={0} /> {t('header.tokens')}
              </span>
              <span className="text-border-strong">·</span>
              <span>{totalCalls} {t('header.calls')}</span>
              <span className="text-border-strong">·</span>
              <span>${estimatedCost.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id !== 'settings') closeSettings()
                }}
                className={`
                  relative px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-none bg-transparent
                  ${activeTab === tab.id
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
        <div className="max-w-5xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'burn' && (
              <motion.div
                key="burn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-8"
              >
                <BurnButton
                  onClick={isActivelyBurning ? handleStop : handleBurn}
                  onStop={handleStop}
                  disabled={false}
                  state={buttonState}
                />

                {!isActivelyBurning && (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={handleAutoBurn}
                      className="px-5 py-2 rounded-lg bg-surface border border-border hover:border-accent text-text-secondary hover:text-accent text-sm font-medium transition-all cursor-pointer"
                    >
                      {t('burn.autoBurn')}
                    </button>
                    <div className="flex items-center gap-2 text-text-tertiary text-xs">
                      <span>{t('burn.interval')}</span>
                      <select
                        value={autoBurnDelay}
                        onChange={(e) => setAutoBurnDelay(Number(e.target.value))}
                        className="bg-surface border border-border rounded-md px-2 py-1 text-text-secondary text-xs outline-none cursor-pointer appearance-none"
                      >
                        <option value={1000}>1s</option>
                        <option value={2000}>2s</option>
                        <option value={5000}>5s</option>
                        <option value={10000}>10s</option>
                      </select>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 max-w-md bg-error-light border border-error/20 rounded-lg px-4 py-3">
                    <p className="text-error text-sm flex-1">{error}</p>
                    <button
                      onClick={dismissError}
                      className="text-error/60 hover:text-error text-xs font-medium cursor-pointer bg-transparent border-none"
                    >
                      {t('burn.dismiss')}
                    </button>
                  </div>
                )}

                <div className="flex gap-3 flex-wrap justify-center">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg bg-surface border border-border hover:border-border-strong text-text-tertiary hover:text-text-secondary text-xs font-medium transition-all cursor-pointer"
                  >
                    {t('burn.reset')}
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 rounded-lg bg-surface border border-border hover:border-border-strong text-text-tertiary hover:text-text-secondary text-xs font-medium transition-all cursor-pointer"
                  >
                    {t('burn.export')}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'impact' && (
              <motion.div
                key="impact"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <GuiltTracker
                  carbonGrams={carbonGrams}
                  milesDriven={milesDriven}
                  treesNeeded={treesNeeded}
                />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <BurnHistory history={history} />
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
                  isOpen={true}
                  currentSettings={settings}
                  onClose={() => setActiveTab('burn')}
                  onSave={saveSettings}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
