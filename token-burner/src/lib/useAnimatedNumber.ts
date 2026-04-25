import { useEffect, useRef, useState } from 'react'

export function useAnimatedNumber(target: number, opts?: { stiffness?: number }) {
  const stiffness = opts?.stiffness ?? 0.18
  const [value, setValue] = useState(() => target)
  const valueRef = useRef(value)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = valueRef.current
      const next = v + (target - v) * stiffness
      const done = Math.abs(target - next) < 0.5
      const finalValue = done ? target : next
      setValue(finalValue)
      valueRef.current = finalValue
      if (!done) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stiffness, target])

  return value
}
