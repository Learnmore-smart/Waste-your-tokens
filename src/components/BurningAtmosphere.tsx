'use client'

import { useReducedMotion } from 'framer-motion'

/**
 * 全屏“热量”层：在 TokenRain 之上、主内容之下，不阻挡交互（pointer-events: none）。
 * 仅 CSS opacity/transform 动画，避免大 blur、SVG 噪点与多路 Framer 循环以减轻 GPU/合成压力。
 */
export default function BurningAtmosphere({ active }: { active: boolean }) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-1000"
        style={{
          opacity: active ? 0.5 : 0,
          background:
            'radial-gradient(120% 80% at 50% 100%, rgba(255,100,30,0.12), rgba(20,5,0,0.35) 55%, transparent 70%)',
        }}
      />
    )
  }

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden transition-opacity duration-700 ${
        active ? 'burn-atmo-animated opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 burn-atmo" />
      <div className="absolute inset-0 burn-atmo-glow" />
    </div>
  )
}
