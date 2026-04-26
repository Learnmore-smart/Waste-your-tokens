'use client'

import { useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
}

function formatParts(latest: number, decimals: number, prefix: string, suffix: string): string {
  const formatted = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString()
  return `${prefix}${formatted}${suffix}`
}

export default function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '' }: AnimatedNumberProps) {
  const motionVal = useMotionValue(value)
  const springVal = useSpring(motionVal, { stiffness: 150, damping: 25, mass: 0.5 })
  const [text, setText] = useState(() => formatParts(value, decimals, prefix, suffix))

  useEffect(() => {
    motionVal.set(value)
  }, [value, motionVal])

  useMotionValueEvent(springVal, 'change', (latest) => {
    setText(formatParts(latest, decimals, prefix, suffix))
  })

  // Spring may not re-fire when only prefix/suffix/decimals change (e.g. language toggle).
  useEffect(() => {
    setText(formatParts(springVal.get(), decimals, prefix, suffix))
  }, [prefix, suffix, decimals, springVal])

  return <span>{text}</span>
}
