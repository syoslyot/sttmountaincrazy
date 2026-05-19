'use client'

import { useEffect, useState } from 'react'

export function RocketSVG() {
  const [show, setShow] = useState(false)
  const [topPct, setTopPct] = useState(20)

  useEffect(() => {
    const go = () => {
      setTopPct(10 + Math.random() * 60)
      setShow(true)
      setTimeout(() => setShow(false), 4000)
    }
    go()
    const t = setInterval(go, 12000)
    return () => clearInterval(t)
  }, [])

  if (!show) return null

  return (
    <div style={{ position: 'fixed', top: `${topPct}%`, left: 0, zIndex: 999, pointerEvents: 'none', animation: 'rocketFly 4s linear forwards' }}>
      <style>{`@keyframes rocketFly { from { transform: translateX(-120px) rotate(-15deg) } to { transform: translateX(110vw) rotate(-15deg) } }`}</style>
      <svg width="90" height="60" viewBox="0 0 90 60" fill="none">
        {/* Body */}
        <ellipse cx="52" cy="30" rx="28" ry="12" fill="#ff6b35" stroke="#1a1000" strokeWidth="2.5"/>
        {/* Nose */}
        <path d="M80 30 Q92 26 88 30 Q92 34 80 30Z" fill="#ff6b35" stroke="#1a1000" strokeWidth="2"/>
        {/* Fins */}
        <path d="M28 36 L18 48 L36 40Z" fill="#e65100" stroke="#1a1000" strokeWidth="2"/>
        <path d="M28 24 L18 12 L36 20Z" fill="#e65100" stroke="#1a1000" strokeWidth="2"/>
        {/* Window */}
        <circle cx="58" cy="30" r="7" fill="#fffde7" stroke="#1a1000" strokeWidth="2"/>
        <circle cx="58" cy="30" r="4" fill="#0066cc" opacity="0.8"/>
        <circle cx="56" cy="28" r="1.5" fill="#fff" opacity="0.7"/>
        {/* Flame */}
        <path d="M24 30 Q12 23 4 30 Q12 37 24 30Z" fill="#ffb300" stroke="#ff6b00" strokeWidth="1"/>
        <path d="M24 30 Q8 27 2 30 Q8 33 24 30Z" fill="#fff176" opacity="0.8"/>
        {/* Stars around */}
        <text x="5" y="15" fontSize="8" fill="#ff6b35">★</text>
        <text x="70" y="12" fontSize="6" fill="#0066cc">✦</text>
        <text x="15" y="50" fontSize="5" fill="#e65100">✦</text>
        {/* Hand-drawn wobbly outline effect - extra stroke */}
        <ellipse cx="52" cy="30" rx="28" ry="12" fill="none" stroke="#1a1000" strokeWidth="1" strokeDasharray="2 1" opacity="0.4"/>
      </svg>
    </div>
  )
}
