'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'

type Kind = 'ember' | 'tongue' | 'spark'

interface Particle {
  id: number
  kind: Kind
  x: number
  duration: number
  w: number
  h: number
  destY: number
  driftX: number
  peakOpacity: number
}

const MAX_PARTICLES = 28
const SPAWN_MS = 90

function spawnOne(nextId: number): Particle {
  const roll = Math.random()
  const kind: Kind = roll > 0.9 ? 'spark' : roll > 0.5 ? 'tongue' : 'ember'
  const x = (Math.random() - 0.5) * 190

  if (kind === 'spark') {
    const d = 0.22 + Math.random() * 0.2
    return {
      id: nextId,
      kind,
      x,
      duration: d,
      w: 2 + Math.random() * 2,
      h: 2 + Math.random() * 2,
      destY: -95 - Math.random() * 35,
      driftX: (Math.random() - 0.5) * 30,
      peakOpacity: 0.85 + Math.random() * 0.15,
    }
  }

  if (kind === 'tongue') {
    const d = 0.55 + Math.random() * 0.5
    return {
      id: nextId,
      kind: 'tongue',
      x,
      duration: d,
      w: 5 + Math.random() * 12,
      h: 32 + Math.random() * 48,
      destY: -125 - Math.random() * 45,
      driftX: (Math.random() - 0.5) * 36,
      peakOpacity: 0.75 + Math.random() * 0.2,
    }
  }

  const d = 0.75 + Math.random() * 0.85
  return {
    id: nextId,
    kind: 'ember',
    x,
    duration: d,
    w: 2 + Math.random() * 3.5,
    h: 2 + Math.random() * 3.5,
    destY: -145 - Math.random() * 50,
    driftX: (Math.random() - 0.5) * 44,
    peakOpacity: 0.35 + Math.random() * 0.35,
  }
}

/**
 * 仅在「正在燃烧」时由父组件挂载，卸载时自然清空粒子，无需在 effect 里 setState 复位。
 */
export default function FireEffect() {
  const [particles, setParticles] = useState<Particle[]>([])
  const nextId = useRef(0)
  const shouldReduce = useReducedMotion()

  const remove = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const tick = useCallback(() => {
    const id = nextId.current++
    setParticles((prev) => {
      const next = [...prev, spawnOne(id)]
      if (next.length > MAX_PARTICLES) return next.slice(-MAX_PARTICLES)
      return next
    })
  }, [])

  useEffect(() => {
    if (shouldReduce) return
    const t = setInterval(tick, SPAWN_MS)
    return () => clearInterval(t)
  }, [shouldReduce, tick])

  if (shouldReduce) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
      aria-hidden
    >
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 100%, rgba(255,120,40,0.4), rgba(255,40,0,0.12) 50%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-screen"
        style={{
          background:
            'linear-gradient(to top, rgba(30,8,0,0.7) 0%, transparent 42%, rgba(255,200,120,0.08) 100%)',
        }}
      />
      {particles.map((p) => {
        const left = `calc(50% + ${p.x}px)`
        if (p.kind === 'tongue') {
          return (
            <motion.div
              key={p.id}
              className="absolute bottom-0 -translate-x-1/2 will-change-transform"
              style={{
                left,
                width: p.w,
                height: p.h,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                background:
                  'linear-gradient(to top, rgba(255,45,0,0.95) 0%, rgba(255,120,20,0.8) 35%, rgba(255,220,100,0.5) 65%, rgba(255,255,220,0.2) 88%, rgba(255,255,255,0) 100%)',
                boxShadow:
                  '0 0 10px 2px rgba(255,100,30,0.55), 0 0 22px 5px rgba(255,50,0,0.22), 0 0 2px 0 rgba(255,255,200,0.4)',
                filter: 'blur(0.4px)',
              }}
              initial={{ y: 10, opacity: 0, scaleY: 0.5, x: 0 }}
              animate={{
                y: p.destY,
                opacity: [0, p.peakOpacity, p.peakOpacity * 0.7, 0],
                scaleY: [0.5, 1.05, 0.5],
                x: p.driftX,
              }}
              transition={{ duration: p.duration, ease: [0.22, 0.8, 0.2, 0.99] as const }}
              onAnimationComplete={() => remove(p.id)}
            />
          )
        }
        if (p.kind === 'spark') {
          return (
            <motion.div
              key={p.id}
              className="absolute bottom-0 -translate-x-1/2 rounded-full will-change-transform"
              style={{
                left,
                width: p.w,
                height: p.h,
                background: 'radial-gradient(circle, #fffff4 0%, #ffee88 45%, #ff6b20 100%)',
                boxShadow: '0 0 8px 2px rgba(255,255,255,0.75), 0 0 14px 3px rgba(255,180,60,0.5)',
              }}
              initial={{ y: 4, opacity: 0, scale: 0.3 }}
              animate={{
                y: p.destY,
                x: p.driftX * 1.2,
                opacity: [0, 1, 0.7, 0],
                scale: [0.3, 1.15, 0.2],
              }}
              transition={{ duration: p.duration, ease: 'easeOut' }}
              onAnimationComplete={() => remove(p.id)}
            />
          )
        }
        return (
          <motion.div
            key={p.id}
            className="absolute bottom-0 -translate-x-1/2 rounded-full will-change-transform"
            style={{
              left,
              width: p.w,
              height: p.h,
              background:
                'radial-gradient(circle at 32% 30%, #fffce8 0%, #ffcf5a 38%, #ff5c1a 78%, #c21a00 100%)',
              boxShadow: '0 0 5px 1px rgba(255,200,100,0.7), 0 0 10px 2px rgba(255,80,20,0.25)',
            }}
            initial={{ y: 0, opacity: 0, scale: 0.4, x: 0 }}
            animate={{
              y: p.destY,
              x: p.driftX,
              opacity: [0, p.peakOpacity, p.peakOpacity * 0.5, 0],
              scale: [0.4, 1, 0.35],
            }}
            transition={{ duration: p.duration, ease: [0.1, 0.85, 0.15, 1] as const }}
            onAnimationComplete={() => remove(p.id)}
          />
        )
      })}
    </div>
  )
}
