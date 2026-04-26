'use client'

import { useCallback, useRef } from 'react'

export function useBurnSounds() {
  const audioContextRef = useRef<AudioContext | null>(null)

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const playBurnSound = useCallback(() => {
    try {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(200, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3)

      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch {}
  }, [getContext])

  const playCashSound = useCallback(() => {
    try {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(1200, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.05)
      oscillator.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15)

      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.2)
    } catch {}
  }, [getContext])

  const playStopSound = useCallback(() => {
    try {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(600, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2)

      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.25)
    } catch {}
  }, [getContext])

  return { playBurnSound, playCashSound, playStopSound }
}
