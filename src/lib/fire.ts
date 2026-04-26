export type FireEmitter = { x: number; y: number; r: number }

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
  sparkle: number
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function startFire(
  canvas: HTMLCanvasElement,
  getEmitter: () => FireEmitter | null,
  getIntensity: () => number
) {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return { stop: () => {} }
  const c = ctx

  const dpr = () => Math.max(1, Math.min(2, window.devicePixelRatio || 1))

  let raf = 0
  let last = performance.now()
  const particles: Particle[] = []

  function resize() {
    const r = dpr()
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(width * r))
    canvas.height = Math.max(1, Math.floor(height * r))
    c.setTransform(r, 0, 0, r, 0, 0)
  }

  const ro = new ResizeObserver(() => resize())
  ro.observe(canvas)
  resize()

  function spawn(dt: number) {
    const intensity = clamp01(getIntensity())
    if (intensity <= 0) return
    const e = getEmitter()
    if (!e) return

    const rate = 1400 * intensity
    const count = Math.floor((rate * dt) / 1000)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const rr = Math.sqrt(Math.random()) * e.r
      const x = e.x + Math.cos(a) * rr
      const y = e.y + Math.sin(a) * rr
      const vx = (Math.random() - 0.5) * 90
      const vy = -220 - Math.random() * 220
      const maxLife = 550 + Math.random() * 520
      particles.push({
        x,
        y,
        vx,
        vy,
        life: maxLife,
        maxLife,
        size: 10 + Math.random() * 18,
        hue: 18 + Math.random() * 22,
        sparkle: Math.random()
      })
    }
  }

  function step(now: number) {
    const dt = Math.min(33, now - last)
    last = now
    spawn(dt)

    const { width, height } = canvas.getBoundingClientRect()
    c.clearRect(0, 0, width, height)

    c.globalCompositeOperation = 'lighter'

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life -= dt
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      p.vy += 280 * (dt / 1000)
      p.x += p.vx * (dt / 1000)
      p.y += p.vy * (dt / 1000)

      const t = 1 - p.life / p.maxLife
      const fade = clamp01(1 - t)
      const alpha = Math.pow(fade, 1.8)
      const radius = p.size * (0.7 + (1 - fade) * 0.65)

      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
      const hot = `hsla(${p.hue}, 100%, 62%, ${0.9 * alpha})`
      const warm = `hsla(${p.hue + 22}, 100%, 50%, ${0.55 * alpha})`
      const smoke = `hsla(${p.hue + 45}, 80%, 30%, ${0.06 * alpha})`
      g.addColorStop(0, hot)
      g.addColorStop(0.35, warm)
      g.addColorStop(1, smoke)

      c.fillStyle = g
      c.beginPath()
      c.ellipse(p.x, p.y, radius * 0.95, radius * 1.15, 0, 0, Math.PI * 2)
      c.fill()

      if (p.sparkle > 0.88) {
        const s = 1.2 + Math.random() * 2.4
        c.fillStyle = `rgba(255, 245, 230, ${0.35 * alpha})`
        c.fillRect(p.x - s / 2, p.y - s / 2, s, s)
      }
    }

    c.globalCompositeOperation = 'source-over'
    raf = requestAnimationFrame(step)
  }

  raf = requestAnimationFrame(step)

  return {
    stop: () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }
}
