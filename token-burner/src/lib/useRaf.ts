import { useEffect, useRef } from 'react'

export function useRaf(active: boolean, onFrame: (dtMs: number) => void) {
  const rafId = useRef<number | null>(null)
  const lastT = useRef<number | null>(null)
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!active) return

    const tick = (t: number) => {
      const last = lastT.current
      lastT.current = t
      if (last != null) onFrameRef.current(Math.min(64, Math.max(0, t - last)))
      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
      rafId.current = null
      lastT.current = null
    }
  }, [active])
}
