import { useEffect, useRef, useState } from 'react'

export function useRafNumber(target: number, opts?: { smoothing?: number }) {
  const smoothing = opts?.smoothing ?? 0.14
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    let raf = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      const current = valueRef.current
      const delta = target - current
      const next = Math.abs(delta) < 0.5 ? target : current + delta * smoothing
      valueRef.current = next
      setValue(next)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [smoothing, target])

  return value
}

