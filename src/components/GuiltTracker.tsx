'use client'

import { motion } from 'framer-motion'
import AnimatedNumber from './AnimatedNumber'
import { useI18n } from '@/i18n/LanguageContext'
import {
  carbonToSmartphones,
  carbonToSearches,
  carbonToStreamingHours,
} from '@/lib/conversions'

interface GuiltTrackerProps {
  carbonGrams: number
  milesDriven: number
  treesNeeded: number
}

interface ImpactCard {
  labelKey: string
  value: number
  decimals: number
  suffixKey: string
  detailKey: string
  gradient: string
  blob: string
  blobPosition: string
  numberColor: string
  intensityRef: number
}

function getIntensity(value: number, ref: number): number {
  if (ref <= 0) return 0
  return Math.min(1, value / ref)
}

export default function GuiltTracker({ carbonGrams, milesDriven, treesNeeded }: GuiltTrackerProps) {
  const { t } = useI18n()

  const smartphonesCharged = carbonToSmartphones(carbonGrams)
  const googleSearches = carbonToSearches(carbonGrams)
  const streamingHours = carbonToStreamingHours(carbonGrams)

  const cards: ImpactCard[] = [
    {
      labelKey: 'impact.carbonFootprint.label',
      value: carbonGrams,
      decimals: 1,
      suffixKey: 'impact.carbonFootprint.suffix',
      detailKey: 'impact.carbonFootprint.detail',
      gradient: 'radial-gradient(ellipse at 100% 100%, rgba(100,85,70,0.5) 0%, rgba(100,85,70,0.15) 35%, transparent 65%)',
      blob: 'rgba(120,100,80,0.25)',
      blobPosition: '-bottom-8 -right-8',
      numberColor: '#7A6B5D',
      intensityRef: 500,
    },
    {
      labelKey: 'impact.milesDriven.label',
      value: milesDriven,
      decimals: 1,
      suffixKey: 'impact.milesDriven.suffix',
      detailKey: 'impact.milesDriven.detail',
      gradient: 'linear-gradient(to top, rgba(55,50,45,0.4) 0%, rgba(55,50,45,0.1) 40%, transparent 70%)',
      blob: 'rgba(80,75,70,0.2)',
      blobPosition: '-bottom-6 left-1/2 -translate-x-1/2',
      numberColor: '#5E5854',
      intensityRef: 5,
    },
    {
      labelKey: 'impact.treesToOffset.label',
      value: treesNeeded,
      decimals: 2,
      suffixKey: 'impact.treesToOffset.suffix',
      detailKey: 'impact.treesToOffset.detail',
      gradient: 'linear-gradient(135deg, rgba(34,139,34,0.22) 0%, rgba(34,139,34,0.06) 45%, transparent 75%)',
      blob: 'rgba(34,139,34,0.18)',
      blobPosition: '-top-6 -left-6',
      numberColor: '#2D8A56',
      intensityRef: 0.05,
    },
    {
      labelKey: 'impact.smartphonesCharged.label',
      value: smartphonesCharged,
      decimals: 0,
      suffixKey: 'impact.smartphonesCharged.suffix',
      detailKey: 'impact.smartphonesCharged.detail',
      gradient: 'radial-gradient(ellipse at 0% 100%, rgba(0,188,188,0.25) 0%, rgba(0,188,188,0.06) 40%, transparent 70%)',
      blob: 'rgba(0,188,188,0.2)',
      blobPosition: '-bottom-6 -left-6',
      numberColor: '#0E8A8A',
      intensityRef: 60,
    },
    {
      labelKey: 'impact.googleSearches.label',
      value: googleSearches,
      decimals: 0,
      suffixKey: 'impact.googleSearches.suffix',
      detailKey: 'impact.googleSearches.detail',
      gradient: 'linear-gradient(to left, rgba(210,150,30,0.22) 0%, rgba(210,150,30,0.05) 45%, transparent 75%)',
      blob: 'rgba(210,150,30,0.18)',
      blobPosition: 'top-1/2 -right-6 -translate-y-1/2',
      numberColor: '#9A6B0C',
      intensityRef: 2500,
    },
    {
      labelKey: 'impact.streamingHours.label',
      value: streamingHours,
      decimals: 1,
      suffixKey: 'impact.streamingHours.suffix',
      detailKey: 'impact.streamingHours.detail',
      gradient: 'radial-gradient(ellipse at 50% 50%, rgba(90,90,210,0.22) 0%, rgba(90,90,210,0.05) 45%, transparent 75%)',
      blob: 'rgba(90,90,210,0.18)',
      blobPosition: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      numberColor: '#5050C8',
      intensityRef: 15,
    },
  ]

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
          const intensity = getIntensity(card.value, card.intensityRef)
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
