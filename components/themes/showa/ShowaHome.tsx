'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { TaiwanMap } from '@/components/TaiwanMap'
import { useExpeditions } from '@/lib/useExpeditions'

const CLOUDS = [
  { top: '8%',  left: '-20%',  w: 180, dur: 28, delay: 0    },
  { top: '18%', left: '-30%',  w: 120, dur: 22, delay: -8   },
  { top: '30%', left: '-10%',  w: 220, dur: 35, delay: -15  },
  { top: '5%',  left: '-25%',  w: 90,  dur: 20, delay: -5   },
  { top: '25%', left: '-40%',  w: 160, dur: 32, delay: -20  },
]

function CloudSVG({ w }: { w: number }) {
  const h = w * 0.5
  return (
    <svg width={w} height={h} viewBox="0 0 100 50" fill="none" opacity={0.55}>
      <ellipse cx="50" cy="38" rx="45" ry="14" fill="#e8d8b0" />
      <ellipse cx="35" cy="28" rx="22" ry="16" fill="#f0e6cc" />
      <ellipse cx="58" cy="25" rx="26" ry="18" fill="#f0e6cc" />
      <ellipse cx="72" cy="32" rx="18" ry="12" fill="#e8d8b0" />
    </svg>
  )
}

export function ShowaHome() {
  const [county, setCounty] = useState<string | null>(null)
  const [tab, setTab] = useState<'map' | 'date' | 'search'>('map')
  const [query, setQuery] = useState('')
  const [months, setMonths] = useState<number | undefined>()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filter = tab === 'search' && query ? { mode: 'search' as const, query }
    : tab === 'date' && months ? { mode: 'date' as const, months }
    : county ? { mode: 'county' as const, county }
    : { mode: 'recent' as const }

  const { exps, total, loading, loadMore } = useExpeditions(filter)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore() })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  return (
    <div style={{ background: '#f0e6cc', minHeight: '100vh', fontFamily: "'Noto Serif TC', serif", color: '#1a1008', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes driftCloud { from { transform: translateX(0) } to { transform: translateX(140vw) } }
        @keyframes fogRise { 0%,100% { opacity: 0.35; transform: translateY(0) scaleX(1.1) } 50% { opacity: 0.55; transform: translateY(-12px) scaleX(1) } }
        @keyframes showaPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.7 } }
      `}</style>

      {/* Floating clouds */}
      {CLOUDS.map((c, i) => (
        <div key={i} style={{ position: 'fixed', top: c.top, left: c.left, pointerEvents: 'none', zIndex: 0, animation: `driftCloud ${c.dur}s ${c.delay}s linear infinite` }}>
          <CloudSVG w={c.w} />
        </div>
      ))}

      {/* Fog at bottom */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(to top, rgba(240,230,204,0.9) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 50, animation: 'fogRise 8s ease-in-out infinite' }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #8b6f4a', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem', background: '#1a1008' }}>
        <div>
          <div style={{ color: '#f0e6cc', fontFamily: "'Noto Serif TC', serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.2em' }}>成大山協</div>
          <div style={{ color: '#c4a87a', fontSize: '0.6rem', letterSpacing: '0.3em' }}>NCKU MOUNTAINEERING ASSOCIATION</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#c4a87a', fontSize: '0.75rem', letterSpacing: '0.1em' }}>共 {total} 筆出隊紀錄</div>
      </div>

      {/* Hero with map */}
      <div style={{ position: 'relative', zIndex: 5, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, minHeight: '380px' }}>

        {/* Left hero text */}
        <div style={{ padding: '3rem 3rem 3rem 4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #c4a87a' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.4em', color: '#8b6f4a', marginBottom: '1rem' }}>EXPEDITION RECORDS / 出隊紀錄</div>
          <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.1em', color: '#1a1008' }}>
            山，<br />我們來了。
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[{label:'地區', val:'map'},{label:'日期', val:'date'},{label:'搜尋', val:'search'}].map(({label, val}) => (
              <button key={val} onClick={() => setTab(val as typeof tab)}
                style={{ padding: '0.4rem 1.2rem', border: `1px solid ${tab === val ? '#2d4a2d' : '#8b6f4a'}`, background: tab === val ? '#2d4a2d' : 'transparent', color: tab === val ? '#f0e6cc' : '#5a3e28', fontFamily: "'Noto Serif TC', serif", fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'search' && (
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="輸入山名、地區…" autoFocus
              style={{ marginTop: '1rem', border: 'none', borderBottom: '2px solid #8b6f4a', background: 'transparent', fontFamily: "'Noto Serif TC', serif", fontSize: '1rem', padding: '0.4rem 0', outline: 'none', color: '#1a1008', width: '280px' }} />
          )}
          {tab === 'date' && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[{label:'近一月',m:1},{label:'近半年',m:6},{label:'近一年',m:12},{label:'近三年',m:36}].map(({label,m}) => (
                <button key={m} onClick={() => setMonths(months === m ? undefined : m)}
                  style={{ border: `1px solid ${months===m?'#2d4a2d':'#8b6f4a'}`, background: months===m?'#2d4a2d':'transparent', color: months===m?'#f0e6cc':'#5a3e28', padding: '0.3rem 0.8rem', fontFamily:"'Noto Serif TC',serif", fontSize:'0.75rem', cursor:'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {tab === 'map' && county && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#8b6f4a', fontSize: '0.75rem' }}>📍 {county}</span>
              <button onClick={() => setCounty(null)} style={{ background: 'none', border: 'none', color: '#8b6f4a', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
            </div>
          )}
        </div>

        {/* Right: Taiwan map */}
        <div style={{ padding: '1.5rem', borderLeft: '1px solid #c4a87a', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#8b6f4a', marginBottom: '4px' }}>台灣 / TAIWAN</div>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <TaiwanMap selected={county} onSelect={tab === 'map' ? setCounty : () => {}} />
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div style={{ borderTop: '1px solid #c4a87a', position: 'relative', zIndex: 5 }}>
        <div style={{ position: 'absolute', left: '50%', top: '-10px', transform: 'translateX(-50%)', background: '#f0e6cc', padding: '0 1rem', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#8b6f4a' }}>✦ 出隊紀錄 ✦</div>
      </div>

      {/* Card list — alternating offset rows */}
      <div style={{ position: 'relative', zIndex: 5, padding: '2rem 4rem', paddingBottom: '8rem' }}>
        {loading && exps.length === 0 && <div style={{ textAlign: 'center', color: '#8b6f4a', letterSpacing: '0.2em', padding: '3rem', fontSize: '0.8rem' }}>載入中…</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {exps.map((e, i) => {
            const isRight = i % 2 === 1
            return (
              <Link key={e.id} href={`/expedition/${e.id}`}
                style={{ display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start', textDecoration: 'none', marginBottom: '1px' }}>
                <div style={{
                  width: 'clamp(300px, 55%, 520px)',
                  padding: '1rem 1.5rem',
                  borderLeft: isRight ? 'none' : '2px solid #c4a87a',
                  borderRight: isRight ? '2px solid #c4a87a' : 'none',
                  borderTop: '1px solid #c4a87a33',
                  borderBottom: '1px solid #c4a87a33',
                  marginLeft: isRight ? 0 : i % 4 === 0 ? '3rem' : '0',
                  marginRight: isRight ? (i % 4 === 3 ? '3rem' : '0') : 0,
                  background: i % 6 === 0 ? 'rgba(45,74,45,0.05)' : 'transparent',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.25em', color: '#8b6f4a', marginBottom: '4px' }}>{e.date_start}</div>
                  <div style={{ fontSize: '1rem', letterSpacing: '0.08em', fontWeight: 400, color: '#1a1008' }}>{e.name}</div>
                  {(e.county || e.leader) && (
                    <div style={{ fontSize: '0.72rem', color: '#5a3e28', marginTop: '4px', letterSpacing: '0.05em' }}>
                      {[e.county, e.region, e.leader ? `隊長 ${e.leader}` : ''].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loading && exps.length > 0 && <div style={{ textAlign: 'center', color: '#8b6f4a', padding: '1rem', fontSize: '0.75rem', letterSpacing: '0.2em' }}>載入中…</div>}
      </div>
    </div>
  )
}
