'use client'

import { useEffect, useRef } from 'react'

export function RainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const drops: { x: number; y: number; speed: number; length: number; opacity: number }[] = []
    for (let i = 0; i < 120; i++) {
      drops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 4 + Math.random() * 8,
        length: 10 + Math.random() * 20,
        opacity: 0.1 + Math.random() * 0.35,
      })
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drops.forEach(d => {
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - 1, d.y + d.length)
        ctx.strokeStyle = `rgba(0, 212, 255, ${d.opacity})`
        ctx.lineWidth = 0.8
        ctx.stroke()
        d.y += d.speed
        if (d.y > canvas.height) {
          d.y = -d.length
          d.x = Math.random() * canvas.width
        }
      })
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />
  )
}
