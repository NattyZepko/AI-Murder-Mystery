import React from 'react'

type Method = 'confetti' | 'fireworks' | 'emoji'

export default function Celebration({ method = 'confetti', duration = 6000 }: { method?: Method, duration?: number }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const particles: any[] = []

    const rand = (min: number, max: number) => Math.random() * (max - min) + min

    if (method === 'confetti' || method === 'emoji') {
      const emojiPool = ['🎉', '✨', '🎊', '💥']
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: rand(0, width),
          y: rand(-height, 0),
          vx: rand(-1.5, 1.5),
          vy: rand(1, 3),
          size: rand(8, 18),
          color: `hsl(${Math.floor(rand(0, 360))},70%,60%)`,
          emoji: emojiPool[Math.floor(rand(0, emojiPool.length))]
        })
      }
    } else if (method === 'fireworks') {
      // fireworks: spawn shells that explode
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: rand(width * 0.1, width * 0.9),
          y: rand(height * 0.2, height * 0.6),
          r: rand(40, 80),
          hue: Math.floor(rand(0, 360))
        })
      }
    }

    const draw = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      if (method === 'confetti') {
        particles.forEach(p => {
          ctx.fillStyle = p.color
          ctx.fillRect(p.x, p.y, p.size, p.size * 0.6)
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.02
          if (p.y > height) { p.y = rand(-200, -50); p.x = rand(0, width); p.vy = rand(1, 3) }
        })
      } else if (method === 'emoji') {
        ctx.font = '20px serif'
        particles.forEach(p => {
          ctx.fillText(p.emoji, p.x, p.y)
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.03
          if (p.y > height) { p.y = rand(-200, -50); p.x = rand(0, width); p.vy = rand(1, 3) }
        })
      } else if (method === 'fireworks') {
        particles.forEach(p => {
          // draw radial spikes to simulate an explosion
          for (let a = 0; a < 12; a++) {
            const ang = (a / 12) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p.x + Math.cos(ang) * p.r, p.y + Math.sin(ang) * p.r)
            ctx.strokeStyle = `hsl(${p.hue + a * 10}, 80%, 60%)`
            ctx.lineWidth = 2
            ctx.stroke()
          }
        })
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    const timer = window.setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      ctx.clearRect(0, 0, width, height)
    }, duration)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(timer)
    }
  }, [method, duration])

  return (
    <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2000 }} />
  )
}
