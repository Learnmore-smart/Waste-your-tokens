'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'
import { useI18n } from '@/i18n/LanguageContext'
import AnimatedNumber from './AnimatedNumber'
import {
  tokensToCarbonGrams,
  carbonToDrivingKm,
  carbonToTrees,
  carbonToSmartphones,
  carbonToSearches,
  carbonToStreamingHours,
} from '@/lib/conversions'
import { decimalsForMagnitude } from '@/lib/impactFormat'
import { IMPACT_CARD_VISUALS, impactIntensity } from '@/lib/impactCardVisuals'
import {
  CALC_RADIANT_SPRING,
  getCalcTierFloat,
  getSeverity,
  tierSideAccentRgba,
} from '@/lib/calcSeverity'

export { CALC_MAX_TOKENS } from '@/lib/calcSeverity'

const CARD_EMOJI = ['☁️', '🚗', '🌳', '📱', '🔍', '📺'] as const

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US')
}

/** 卡片内：小圆形径向（固定像素级扩散），与 GuiltTracker 的 blur 光斑一致理念 */
function CardInnerRadiant({
  className = '',
  accent = 'rgba(232, 85, 58, 0.14)',
  position = '85% 18%',
}: {
  className?: string
  accent?: string
  position?: string
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle 7rem at ${position}, ${accent}, transparent 68%)`,
        }}
      />
    </div>
  )
}

type ImpactCalculatorProps = { onTotalTokensChange?: (totalTokens: number) => void }

export default function ImpactCalculator({ onTotalTokensChange }: ImpactCalculatorProps) {
  const { t } = useI18n()
  const [inputRaw, setInputRaw] = useState('')
  const [outputRaw, setOutputRaw] = useState('')

  const inputTokens = useMemo(() => {
    const n = parseInt(inputRaw.replace(/,/g, ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [inputRaw])
  const outputTokens = useMemo(() => {
    const n = parseInt(outputRaw.replace(/,/g, ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [outputRaw])
  const totalTokens = inputTokens + outputTokens
  const sevKey = getSeverity(totalTokens)

  const tierTarget = useMotionValue(0)
  const tierSmooth = useSpring(tierTarget, CALC_RADIANT_SPRING)
  const [cardRadiantAccent, setCardRadiantAccent] = useState(() =>
    tierSideAccentRgba(getCalcTierFloat(totalTokens), 0.12)
  )
  const [cardRadiantBlob, setCardRadiantBlob] = useState(() =>
    tierSideAccentRgba(getCalcTierFloat(totalTokens), 0.15)
  )

  useEffect(() => {
    tierTarget.set(getCalcTierFloat(totalTokens))
  }, [totalTokens, tierTarget])

  useMotionValueEvent(tierSmooth, 'change', (v) => {
    setCardRadiantAccent(tierSideAccentRgba(v, 0.12))
    setCardRadiantBlob(tierSideAccentRgba(v, 0.15))
  })

  useEffect(() => {
    onTotalTokensChange?.(totalTokens)
  }, [totalTokens, onTotalTokensChange])

  const carbonGrams = useMemo(() => tokensToCarbonGrams(totalTokens), [totalTokens])
  const drivingKm = useMemo(() => carbonToDrivingKm(carbonGrams), [carbonGrams])
  const treesNeeded = useMemo(() => carbonToTrees(carbonGrams), [carbonGrams])
  const smartphonesCharged = useMemo(() => carbonToSmartphones(carbonGrams), [carbonGrams])
  const googleSearches = useMemo(() => carbonToSearches(carbonGrams), [carbonGrams])
  const streamingHours = useMemo(() => carbonToStreamingHours(carbonGrams), [carbonGrams])

  const presets = useMemo(
    () => [
      { label: t('calc.preset.chat'), input: 2_000, output: 7_000 },
      { label: t('calc.preset.essay'), input: 15_000, output: 35_000 },
      { label: t('calc.preset.coding'), input: 100_000, output: 400_000 },
      { label: t('calc.preset.heavy'), input: 1_000_000, output: 4_000_000 },
      { label: t('calc.preset.mega'), input: 15_000_000, output: 35_000_000 },
    ],
    [t]
  )

  const applyPreset = useCallback((i: number, o: number) => {
    setInputRaw(formatWithCommas(i))
    setOutputRaw(formatWithCommas(o))
  }, [])
  const handleClear = useCallback(() => {
    setInputRaw('')
    setOutputRaw('')
  }, [])
  const handleInput = useCallback(
    (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const r = e.target.value.replace(/[^0-9]/g, '')
      if (!r) {
        set('')
        return
      }
      const n = parseInt(r, 10)
      set(Number.isFinite(n) ? formatWithCommas(n) : '')
    },
    []
  )

  const dKm = drivingKm === 0 ? 0 : Math.max(2, decimalsForMagnitude(drivingKm, 4))
  const dTrees = treesNeeded === 0 ? 0 : decimalsForMagnitude(treesNeeded, 5)
  const dPhones = smartphonesCharged === 0 ? 0 : Math.max(1, Math.min(2, decimalsForMagnitude(smartphonesCharged, 2)))
  const dStream = streamingHours === 0 ? 0 : Math.max(1, decimalsForMagnitude(streamingHours, 2))

  const decimalsByIndex = [1, dKm, dTrees, dPhones, 0, dStream] as const
  const valueByIndex = [carbonGrams, drivingKm, treesNeeded, smartphonesCharged, googleSearches, streamingHours] as const
  const impactRows = useMemo(
    () =>
      IMPACT_CARD_VISUALS.map((base, i) => ({
        ...base,
        value: valueByIndex[i],
        decimals: decimalsByIndex[i],
        icon: CARD_EMOJI[i],
      })),
    [carbonGrams, drivingKm, dKm, treesNeeded, dTrees, smartphonesCharged, dPhones, googleSearches, streamingHours]
  )

  const show = totalTokens > 0

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-8 text-foreground overflow-x-clip min-h-0">
      <section className="relative z-10 rounded-xl border border-border bg-surface/90 backdrop-blur-sm overflow-hidden shadow-sm">
        <CardInnerRadiant position="92% 6%" accent={cardRadiantAccent} />
        <div
          className="absolute -right-20 -top-20 size-44 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: cardRadiantBlob }}
          aria-hidden
        />
        <div className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-5 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                {t('calc.title')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">{t('calc.subtitle')}</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={sevKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="shrink-0 text-xs text-text-tertiary sm:text-right sm:max-w-[12rem] leading-snug"
              >
                {t(sevKey)}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'calc-input-tokens' as const, label: t('calc.inputTokens'), val: inputRaw, set: setInputRaw },
              { id: 'calc-output-tokens' as const, label: t('calc.outputTokens'), val: outputRaw, set: setOutputRaw },
            ].map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <label htmlFor={f.id} className="text-xs font-medium text-text-tertiary">
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type="text"
                  inputMode="numeric"
                  value={f.val}
                  onChange={handleInput(f.set)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base font-mono font-medium tabular-nums text-foreground placeholder:text-text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
                />
              </div>
            ))}
          </div>

          <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-border/80">
            <span className="text-xs font-medium text-text-tertiary">{t('calc.total')}</span>
            <span className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-foreground">
              <AnimatedNumber value={totalTokens} decimals={0} />
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-tertiary">{t('calc.scenarios')}</span>
              {show && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-medium text-text-tertiary hover:text-foreground transition-colors cursor-pointer border-none bg-transparent p-0"
                >
                  {t('calc.clear')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.input, p.output)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 flex flex-col gap-3">
        <h3 className="text-xs font-medium text-text-tertiary tracking-wide uppercase">
          {t('calc.footprintSection')}
        </h3>

        <AnimatePresence mode="wait">
          {show && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {impactRows.map((card, i) => {
                  const intensity = impactIntensity(card.value, card.intensityRef)
                  const blobOpacity = Math.max(0.1, 0.08 + intensity * 0.32)
                  const spot = [
                    '88% 12%',
                    '12% 88%',
                    '20% 20%',
                    '80% 75%',
                    '15% 50%',
                    '50% 35%',
                  ][i] ?? '50% 50%'
                  return (
                    <motion.div
                      key={card.labelKey}
                      className="relative overflow-hidden bg-surface border border-border rounded-xl flex flex-col shadow-sm"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.04 }}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: card.gradient }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle 6.5rem at ${spot}, rgba(0,0,0,0.04), transparent 70%)`,
                        }}
                        aria-hidden
                      />
                      <div
                        className={`absolute ${card.blobPosition} w-32 h-32 sm:w-36 sm:h-36 rounded-full blur-3xl pointer-events-none transition-opacity duration-700`}
                        style={{ background: card.blob, opacity: blobOpacity }}
                      />
                      <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-2 min-h-[6.5rem]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0" aria-hidden>
                            {card.icon}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary truncate">
                            {t(card.labelKey)}
                          </span>
                        </div>
                        <p
                          className="text-xl sm:text-2xl font-semibold tabular-nums font-mono leading-tight"
                          style={{ color: card.numberColor }}
                        >
                          <AnimatedNumber value={card.value} decimals={card.decimals} suffix={t(card.suffixKey)} />
                        </p>
                        <p className="text-xs text-text-tertiary leading-relaxed mt-auto">{t(card.detailKey)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              <div className="relative overflow-hidden text-xs text-text-tertiary leading-relaxed border border-dashed border-border rounded-lg px-3 py-2.5 bg-surface/90">
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent/[0.07] blur-2xl"
                  aria-hidden
                />
                <p className="relative z-10">{t('impact.disclaimer')}</p>
              </div>
            </motion.div>
          )}

          {!show && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden rounded-xl border border-dashed border-border bg-surface px-4 py-10 sm:py-12 text-center shadow-sm"
            >
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.1] blur-2xl sm:h-48 sm:w-48"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-6 bottom-0 h-28 w-28 rounded-full bg-[rgba(255,140,90,0.12)] blur-2xl"
                aria-hidden
              />
              <p className="relative z-10 text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                {t('calc.emptyHint')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
