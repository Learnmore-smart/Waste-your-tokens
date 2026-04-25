import { useEffect, useMemo, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  maxLife: number
  hue: number
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function FireCanvas(props: { active: boolean; intensity: number; seed: number }) {
  const { active, intensity, seed } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const quality = useMemo(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    return dpr
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: Particle[] = []

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = Math.floor(w * quality)
      canvas.height = Math.floor(h * quality)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(quality, 0, 0, quality, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = performance.now()

    const spawn = (n: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      const baseX = w * 0.5 + rand(-18, 18)
      const baseY = h * 0.55 + rand(-10, 10)

      for (let i = 0; i < n; i++) {
        const s = Math.max(0.6, intensity)
        const p: Particle = {
          x: baseX + rand(-22, 22) * s,
          y: baseY + rand(-12, 12) * s,
          vx: rand(-22, 22) * s,
          vy: rand(-140, -70) * s,
          r: rand(2.2, 6.8) * s,
          life: 0,
          maxLife: rand(420, 760),
          hue: rand(12, 38),
        }
        particles.push(p)
      }
    }

    const draw = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now

      const w = window.innerWidth
      const h = window.innerHeight

      ctx.clearRect(0, 0, w, h)

      const glow = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, Math.min(w, h) * 0.55)
      const heat = active ? 1 : 0.25
      glow.addColorStop(0, `rgba(255, 90, 30, ${0.22 * heat})`)
      glow.addColorStop(0.35, `rgba(255, 40, 20, ${0.10 * heat})`)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      if (active) {
        const budget = Math.round(rand(2, 5) * Math.max(0.65, intensity))
        spawn(budget)
      }

      const g = Math.max(0.9, intensity)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt
        const t = p.life / p.maxLife
        if (t >= 1) {
          particles.splice(i, 1)
          continue
        }

        p.vy += 240 * (dt / 1000) * g
        p.x += p.vx * (dt / 1000)
        p.y += p.vy * (dt / 1000)
        p.vx *= 0.992
        p.vy *= 0.995

        const a = (1 - t) * (active ? 1 : 0.35)
        const r = p.r * (0.85 + (1 - t) * 0.55)
        const hot = Math.max(0, 1 - t * 1.4)
        ctx.fillStyle = `hsla(${p.hue}, 95%, ${55 + hot * 18}%, ${a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active, intensity, quality, seed])

  return <canvas ref={canvasRef} className={active ? 'fireCanvas fireOn' : 'fireCanvas'} aria-hidden="true" />
}

