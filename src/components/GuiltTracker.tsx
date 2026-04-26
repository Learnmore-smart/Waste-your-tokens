'use client'

import { motion } from 'framer-motion'
import AnimatedNumber from './AnimatedNumber'
import { useI18n } from '@/i18n/LanguageContext'
import {
  carbonToSmartphones,
  carbonToSearches,
  carbonToStreamingHours,
} from '@/lib/conversions'
import { decimalsForMagnitude } from '@/lib/impactFormat'
import { IMPACT_CARD_VISUALS, impactIntensity } from '@/lib/impactCardVisuals'

interface GuiltTrackerProps {
  carbonGrams: number
  drivingKm: number
  treesNeeded: number
}

export default function GuiltTracker({ carbonGrams, drivingKm, treesNeeded }: GuiltTrackerProps) {
  const { t } = useI18n()

  const smartphonesCharged = carbonToSmartphones(carbonGrams)
  const googleSearches = carbonToSearches(carbonGrams)
  const streamingHours = carbonToStreamingHours(carbonGrams)

  const dKm = drivingKm === 0 ? 0 : Math.max(2, decimalsForMagnitude(drivingKm, 4))
  const dTrees = treesNeeded === 0 ? 0 : decimalsForMagnitude(treesNeeded, 5)
  const dPhones =
    smartphonesCharged === 0
      ? 0
      : Math.max(1, Math.min(2, decimalsForMagnitude(smartphonesCharged, 2)))
  const dStream =
    streamingHours === 0 ? 0 : Math.max(1, decimalsForMagnitude(streamingHours, 2))

  const valueByIndex = [carbonGrams, drivingKm, treesNeeded, smartphonesCharged, googleSearches, streamingHours] as const
  const decimalsByIndex = [1, dKm, dTrees, dPhones, 0, dStream] as const

  const cards = IMPACT_CARD_VISUALS.map((v, i) => ({
    ...v,
    value: valueByIndex[i],
    decimals: decimalsByIndex[i],
  }))

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          {t('impact.title')}
        </h2>
        <p className="text-sm text-text-tertiary leading-relaxed">
          {t('impact.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const intensity = impactIntensity(card.value, card.intensityRef)
          const blobOpacity = 0.06 + intensity * 0.3

          return (
            <motion.div
              key={card.labelKey}
              className="relative overflow-hidden bg-surface border border-border rounded-xl flex flex-col"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: card.gradient }}
              />
              <div
                className={`absolute ${card.blobPosition} w-36 h-36 rounded-full blur-3xl pointer-events-none transition-opacity duration-700`}
                style={{
                  background: card.blob,
                  opacity: blobOpacity,
                }}
              />
              <div className="relative z-10 p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: card.numberColor }}
                  />
                  <span className="text-text-tertiary text-xs font-medium tracking-wide uppercase">
                    {t(card.labelKey)}
                  </span>
                </div>
                <span
                  className="text-3xl font-semibold tabular-nums font-mono leading-tight"
                  style={{ color: card.numberColor }}
                >
                  <AnimatedNumber
                    value={card.value}
                    decimals={card.decimals}
                    suffix={t(card.suffixKey)}
                  />
                </span>
                <span className="text-text-tertiary text-xs leading-relaxed">
                  {t(card.detailKey)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-surface border border-border">
        <div className="w-1 h-1 rounded-full bg-text-tertiary mt-1.5 shrink-0" />
        <p className="text-xs text-text-tertiary leading-relaxed">
          {t('impact.disclaimer')}
        </p>
      </div>
    </div>
  )
}
