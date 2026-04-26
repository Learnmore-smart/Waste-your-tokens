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

/** 防止长时燃烧时粒子无上限堆积，减轻 Canvas 重绘与内存 */
const MAX_TOKENS = 96

export default function TokenRain({ active, totalTokens }: TokenRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tokensRef = useRef<Token[]>([])
  const activeRef = useRef(false)
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef(0)
  const loopRunningRef = useRef(false)
  const ensureLoopRef = useRef<() => void>(() => {})

  useEffect(() => {
    activeRef.current = active

    if (active) {
      if (!spawnIntervalRef.current) {
        spawnIntervalRef.current = setInterval(() => {
          if (tokensRef.current.length >= MAX_TOKENS) return
          const count = 1 + Math.floor(Math.random() * 2)
          for (let i = 0; i < count; i++) {
            if (tokensRef.current.length >= MAX_TOKENS) break
            tokensRef.current.push({
              char: TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)],
              x: Math.random() * 100,
              y: -2,
              speed: 0.12 + Math.random() * 0.3,
              opacity: 0.03 + Math.random() * 0.08,
              size: 10 + Math.random() * 5,
            })
          }
          ensureLoopRef.current()
        }, 360)
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
      const burst = Math.min(
        4 + Math.floor(Math.min(8, totalTokens / 2000)),
        Math.max(0, MAX_TOKENS - tokensRef.current.length)
      )
      for (let i = 0; i < burst; i++) {
        if (tokensRef.current.length >= MAX_TOKENS) break
        tokensRef.current.push({
          char: TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)],
          x: Math.random() * 100,
          y: Math.random() * 30,
          speed: 0.16 + Math.random() * 0.32,
          opacity: 0.05 + Math.random() * 0.1,
          size: 10 + Math.random() * 6,
        })
      }
      ensureLoopRef.current()
    }
  }, [totalTokens, active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const cap = 1920
      if (w <= cap) {
        canvas.width = w
        canvas.height = h
      } else {
        const scale = cap / w
        canvas.width = cap
        canvas.height = Math.round(h * scale)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const ensureLoop = () => {
      if (loopRunningRef.current) return
      loopRunningRef.current = true
      const animate = () => {
        const w = canvas.width
        const h = canvas.height
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, w, h)

        tokensRef.current = tokensRef.current.filter((t) => t.y < 105)

        for (const token of tokensRef.current) {
          token.y += token.speed
          const px = (token.x / 100) * w
          const py = (token.y / 100) * h

          ctx.font = `${token.size}px monospace`
          ctx.fillStyle = `rgba(232, 85, 58, ${token.opacity})`
          ctx.fillText(token.char, px, py)
        }

        if (tokensRef.current.length === 0) {
          loopRunningRef.current = false
          return
        }
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }

    ensureLoopRef.current = ensureLoop
    if (tokensRef.current.length > 0) {
      ensureLoop()
    }

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
      loopRunningRef.current = false
      ensureLoopRef.current = () => {}
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
        spawnIntervalRef.current = null
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full pointer-events-none z-0"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease' }}
    />
  )
}
