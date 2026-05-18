'use client'

import { useEffect, useRef, useState } from 'react'

const ROCKET_SVG = (
  <svg width="90" height="60" viewBox="0 0 90 60" fill="none">
    <ellipse cx="52" cy="30" rx="28" ry="12" fill="#ff6b35" stroke="#1a1000" strokeWidth="2.5"/>
    <path d="M80 30 Q92 26 88 30 Q92 34 80 30Z" fill="#ff6b35" stroke="#1a1000" strokeWidth="2"/>
    <path d="M28 36 L18 48 L36 40Z" fill="#e65100" stroke="#1a1000" strokeWidth="2"/>
    <path d="M28 24 L18 12 L36 20Z" fill="#e65100" stroke="#1a1000" strokeWidth="2"/>
    <circle cx="58" cy="30" r="7" fill="#fffde7" stroke="#1a1000" strokeWidth="2"/>
    <circle cx="58" cy="30" r="4" fill="#0066cc" opacity="0.8"/>
    <circle cx="56" cy="28" r="1.5" fill="#fff" opacity="0.7"/>
    <path d="M24 30 Q12 23 4 30 Q12 37 24 30Z" fill="#ffb300" stroke="#ff6b00" strokeWidth="1"/>
    <path d="M24 30 Q8 27 2 30 Q8 33 24 30Z" fill="#fff176" opacity="0.8"/>
    <text x="5" y="15" fontSize="8" fill="#ff6b35">★</text>
    <text x="70" y="12" fontSize="6" fill="#0066cc">✦</text>
    <text x="15" y="50" fontSize="5" fill="#e65100">✦</text>
    <ellipse cx="52" cy="30" rx="28" ry="12" fill="none" stroke="#1a1000" strokeWidth="1" strokeDasharray="2 1" opacity="0.4"/>
  </svg>
)

function r(lo: number, hi: number) { return lo + Math.random() * (hi - lo) }

function genPaths() {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Rocket 2: bottom → top arc
  const r2 = `M ${r(0.2, 0.8) * vw} ${vh + 70} C ${r(0.05, 0.95) * vw} ${r(0.4, 0.8) * vh} ${r(0.05, 0.95) * vw} ${r(0.1, 0.4) * vh} ${r(0.1, 0.9) * vw} -70`

  // Rocket 3: left↔right S-curve
  const fromLeft = Math.random() > 0.5
  const sx = fromLeft ? -70 : vw + 70
  const ex = fromLeft ? vw + 70 : -70
  const sy = r(0.15, 0.85) * vh
  const ey = r(0.15, 0.85) * vh
  const mid = (sy + ey) / 2
  const bulge = r(0.15, 0.35) * vh * (Math.random() > 0.5 ? 1 : -1)
  const cx1x = fromLeft ? r(0.2, 0.4) * vw : r(0.6, 0.8) * vw
  const cx2x = fromLeft ? r(0.6, 0.8) * vw : r(0.2, 0.4) * vw
  const r3 = `M ${sx} ${sy} C ${cx1x} ${mid - bulge} ${cx2x} ${mid + bulge} ${ex} ${ey}`

  return { r2, r3 }
}

interface RocketProps {
  pathD: string
  duration: number
  animKey: number
  flipX?: boolean
}

function CurvedRocket({ pathD, duration, animKey, flipX }: RocketProps) {
  return (
    <div key={animKey} style={{
      position: 'fixed', zIndex: 999, pointerEvents: 'none',
      offsetPath: `path("${pathD}")`,
      offsetRotate: 'auto',
      animation: `rocketTravel ${duration}s linear forwards`,
      transform: flipX ? 'scaleX(-1)' : undefined,
    }}>
      {ROCKET_SVG}
    </div>
  )
}

export function RocketSystem() {
  const [r1, setR1] = useState({ show: false, top: 20, key: 0 })
  const [r2, setR2] = useState({ show: false, path: '', key: 0 })
  const [r3, setR3] = useState({ show: false, path: '', key: 0, flipX: false })
  const pathsRef = useRef({ r2: '', r3: '' })

  useEffect(() => {
    // Rocket 1: horizontal (same as old RocketSVG)
    const fireR1 = () => {
      setR1({ show: true, top: 10 + Math.random() * 60, key: Date.now() })
      setTimeout(() => setR1(p => ({ ...p, show: false })), 4200)
    }
    fireR1()
    const t1 = setInterval(fireR1, 12000)

    // Rocket 2: bottom → top arc
    const fireR2 = () => {
      const { r2: path } = genPaths()
      pathsRef.current.r2 = path
      setR2({ show: true, path, key: Date.now() })
      setTimeout(() => setR2(p => ({ ...p, show: false })), 5200)
    }
    let t2: ReturnType<typeof setInterval> | undefined
    const t2delay = setTimeout(() => { fireR2(); t2 = setInterval(fireR2, 18000) }, 6000)

    // Rocket 3: S-curve diagonal
    const fireR3 = () => {
      const { r3: path } = genPaths()
      pathsRef.current.r3 = path
      const flipX = path.startsWith(`M ${-70}`) === false
      setR3({ show: true, path, key: Date.now(), flipX })
      setTimeout(() => setR3(p => ({ ...p, show: false })), 6200)
    }
    let t3: ReturnType<typeof setInterval> | undefined
    const t3delay = setTimeout(() => { fireR3(); t3 = setInterval(fireR3, 22000) }, 13000)

    return () => {
      clearInterval(t1)
      clearTimeout(t2delay); if (t2) clearInterval(t2)
      clearTimeout(t3delay); if (t3) clearInterval(t3)
    }
  }, [])

  return (
    <>
      <style>{`@keyframes rocketFly { from { transform: translateX(-120px) rotate(-15deg) } to { transform: translateX(110vw) rotate(-15deg) } } @keyframes rocketTravel { from { offset-distance: 0% } to { offset-distance: 100% } }`}</style>

      {r1.show && (
        <div key={r1.key} style={{ position: 'fixed', top: `${r1.top}%`, left: 0, zIndex: 999, pointerEvents: 'none', animation: 'rocketFly 4s linear forwards' }}>
          {ROCKET_SVG}
        </div>
      )}

      {r2.show && r2.path && (
        <CurvedRocket pathD={r2.path} duration={5} animKey={r2.key} />
      )}

      {r3.show && r3.path && (
        <CurvedRocket pathD={r3.path} duration={6} animKey={r3.key} flipX={r3.flipX} />
      )}
    </>
  )
}
