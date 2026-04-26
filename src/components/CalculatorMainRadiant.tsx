'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'
import {
  buildMainRadiantBackground,
  CALC_RADIANT_SPRING,
  getCalcTierFloat,
} from '@/lib/calcSeverity'

type CalculatorMainRadiantProps = { totalTokens: number }

/**
 * 铺在 `<main>` 内的全幅辐射背景（相对 `main` 定位）：随词元档自淡青绿 → 金琥珀 → 橙红 → 品紫。
 */
export default function CalculatorMainRadiant({ totalTokens }: CalculatorMainRadiantProps) {
  const target = useMotionValue(0)
  const smooth = useSpring(target, CALC_RADIANT_SPRING)
  const [background, setBackground] = useState(() =>
    buildMainRadiantBackground(getCalcTierFloat(totalTokens))
  )

  useEffect(() => {
    target.set(getCalcTierFloat(totalTokens))
  }, [totalTokens, target])

  useMotionValueEvent(smooth, 'change', (v) => {
    setBackground(buildMainRadiantBackground(v))
  })

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 transition-none"
        style={{ background, backfaceVisibility: 'hidden' }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
          backgroundSize: '140px',
        }}
      />
    </div>
  )
}
