'use client'

import { useEffect, useRef } from 'react'

interface TokenRainProps {
  active: boolean
  totalTokens: number
}

interface Token {
  char: string
  x: number
  y: number
  speed: number
  opacity: number
  size: number
}

const TOKEN_CHARS = '0123456789abcdef⟨⟩█▓░▒▕▏'

export default function TokenRain({ active, totalTokens }: TokenRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tokensRef = useRef<Token[]>([])
  const activeRef = useRef(false)
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    activeRef.current = active

    if (active) {
      if (!spawnIntervalRef.current) {
        spawnIntervalRef.current = setInterval(() => {
          const count = 2 + Math.floor(Math.random() * 3)
          for (let i = 0; i < count; i++) {
            tokensRef.current.push({
              char: TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)],
              x: Math.random() * 100,
              y: -2,
              speed: 0.15 + Math.random() * 0.35,
              opacity: 0.03 + Math.random() * 0.08,
              size: 10 + Math.random() * 6,
            })
          }
        }, 200)
      }
    } else {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
        spawnIntervalRef.current = null
      }
    }
  }, [active])

  useEffect(() => {
    if (active && totalTokens > 0) {
      const burst = 8 + Math.floor(Math.min(20, totalTokens / 1000))
      for (let i = 0; i < burst; i++) {
        tokensRef.current.push({
          char: TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)],
          x: Math.random() * 100,
          y: Math.random() * 30,
          speed: 0.2 + Math.random() * 0.4,
          opacity: 0.05 + Math.random() * 0.1,
          size: 10 + Math.random() * 8,
        })
      }
    }
  }, [totalTokens, active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      tokensRef.current = tokensRef.current.filter((t) => t.y < 105)

      for (const token of tokensRef.current) {
        token.y += token.speed
        const px = (token.x / 100) * canvas.width
        const py = (token.y / 100) * canvas.height

        ctx.font = `${token.size}px monospace`
        ctx.fillStyle = `rgba(232, 85, 58, ${token.opacity})`
        ctx.fillText(token.char, px, py)
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
        spawnIntervalRef.current = null
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease' }}
    />
  )
}
