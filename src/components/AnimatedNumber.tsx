'use client'

import { useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
}

export default function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '' }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 150, damping: 25, mass: 0.5 })

  useEffect(() => {
    motionVal.set(value)
  }, [value, motionVal])

  useMotionValueEvent(springVal, 'change', (latest) => {
    if (ref.current) {
      const formatted = decimals > 0
        ? latest.toFixed(decimals)
        : Math.round(latest).toLocaleString()
      ref.current.textContent = `${prefix}${formatted}${suffix}`
    }
  })

  return <span ref={ref}>{prefix}{decimals > 0 ? (0).toFixed(decimals) : '0'}{suffix}</span>
}
