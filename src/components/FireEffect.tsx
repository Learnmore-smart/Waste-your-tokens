'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'

interface FireEffectProps {
  active: boolean
}

interface Particle {
  id: number
  x: number
  size: number
  duration: number
  opacity: number
}

export default function FireEffect({ active }: FireEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const nextId = useRef(0)

  const spawnParticle = useCallback(() => {
    const id = nextId.current++
    const duration = 0.8 + Math.random() * 1.2
    const particle: Particle = {
      id,
      x: (Math.random() - 0.5) * 140,
      size: 2 + Math.random() * 3,
      duration,
      opacity: 0.15 + Math.random() * 0.2,
    }
    setParticles((prev) => [...prev.slice(-20), particle])
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id))
    }, duration * 1000 + 50)
  }, [])

  useEffect(() => {
    if (!active) return
    const interval = setInterval(spawnParticle, 120)
    return () => clearInterval(interval)
  }, [active, spawnParticle])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-accent"
            style={{
              width: particle.size,
              height: particle.size,
              left: '50%',
              bottom: 0,
            }}
            initial={{ y: 0, opacity: particle.opacity, x: 0 }}
            animate={{
              y: -180,
              opacity: 0,
              x: particle.x,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: particle.duration,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
