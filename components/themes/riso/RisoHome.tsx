'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { TaiwanMap } from '@/components/TaiwanMap'
import { useExpeditions } from '@/lib/useExpeditions'

const RocketSVG = dynamic(() => import('./RocketSVG').then(m => m.RocketSVG), { ssr: false })

const ROTS = [-4, 2, -1.5, 3, -2.5, 1, -3, 0.5, 2.5, -1]
const COLORS = [
  { bg: 'rgba(230,81,0,0.08)', accent: '#e65100' },
  { bg: 'rgba(0,102,204,0.08)', accent: '#0066cc' },
  { bg: 'rgba(255,251,231,1)',  accent: '#e65100' },
  { bg: 'rgba(0,102,204,0.05)', accent: '#0066cc' },
  { bg: 'rgba(230,81,0,0.12)', accent: '#e65100' },
]

export function RisoHome() {
  const [county, setCounty] = useState<string | null>(null)
  const [tab, setTab] = useState<'map' | 'search'>('map')
  const [query, setQuery] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filter = tab === 'search' && query ? { mode: 'search' as const, query }
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
    <div style={{ background: '#fffde7', minHeight: '100vh', fontFamily: "'Noto Sans TC', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes paperFloat { 0%,100% { transform: translateY(0) rotate(var(--r)) } 50% { transform: translateY(-4px) rotate(calc(var(--r) + 0.5deg)) } }
        .riso-card:hover { transform: rotate(0deg) scale(1.04) !important; box-shadow: 6px 6px 0 #e65100 !important; z-index: 20 !important; }
        @keyframes risoGrain { 0%,100%{opacity:.06} 50%{opacity:.09} }
      `}</style>

      {/* Grain overlay */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")", pointerEvents: 'none', zIndex: 100, animation: 'risoGrain 6s ease-in-out infinite' }} />

      {/* Rocket */}
      <RocketSVG />

      {/* Overlapping color sheets in background */}
      <div style={{ position: 'fixed', top: '-5%', left: '-8%', width: '55%', height: '65%', background: 'rgba(230,81,0,0.06)', transform: 'rotate(-3deg)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '35%', right: '-10%', width: '50%', height: '60%', background: 'rgba(0,102,204,0.06)', transform: 'rotate(2deg)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header — torn paper style */}
      <div style={{ position: 'relative', zIndex: 10, padding: '1rem 2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ background: '#e65100', color: '#fffde7', padding: '0.4rem 1.2rem', transform: 'rotate(-1deg)', display: 'inline-block' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.2em', lineHeight: 1 }}>成大山協</div>
        </div>
        <div style={{ background: '#0066cc', color: '#fffde7', padding: '0.25rem 0.8rem', transform: 'rotate(1.5deg)', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: "'Bebas Neue', sans-serif" }}>
          NCKU MTN.
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ border: '2px solid #e65100', padding: '0.3rem 0.8rem', transform: 'rotate(-0.5deg)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', color: '#e65100', letterSpacing: '0.15em' }}>
          {total} EXPEDITIONS
        </div>
      </div>

      {/* Main content — zine-style */}
      <div style={{ position: 'relative', zIndex: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: 'calc(100vh - 80px)' }}>

        {/* Left col */}
        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search/mode pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '0.5rem' }}>
            {(['map','search'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ border: `2px solid ${t==='map'?'#e65100':'#0066cc'}`, background: tab===t?(t==='map'?'#e65100':'#0066cc'):'transparent', color: tab===t?'#fffde7':(t==='map'?'#e65100':'#0066cc'), padding:'0.3rem 0.9rem', fontFamily:"'Bebas Neue',sans-serif", fontSize:'0.9rem', letterSpacing:'0.15em', cursor:'pointer', transform: t==='map'?'rotate(-1deg)':'rotate(0.5deg)' }}>
                {t === 'map' ? '地圖' : '搜尋'}
              </button>
            ))}
          </div>

          {tab === 'search' && (
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="關鍵字…" autoFocus
              style={{ border: '3px solid #0066cc', background: 'transparent', padding: '8px 12px', fontFamily:"'Noto Sans TC',sans-serif", fontSize:'0.9rem', outline:'none', transform:'rotate(-0.5deg)', width:'100%', boxSizing:'border-box' }} />
          )}

          {/* Taiwan map in a tilted frame */}
          <div style={{ border: '3px solid #1a1000', transform: 'rotate(1.2deg)', background: '#fffde7', boxShadow: '5px 5px 0 rgba(230,81,0,0.4)', height: '280px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 4, left: 4, fontFamily:"'Bebas Neue',sans-serif", fontSize:'0.7rem', letterSpacing:'0.2em', color:'#e65100', zIndex:2 }}>TAIWAN</div>
            <TaiwanMap selected={county} onSelect={tab==='map'?setCounty:()=>{}} />
          </div>

          {county && (
            <div style={{ border: '2px solid #e65100', padding: '0.5rem', transform: 'rotate(-0.8deg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.1rem', letterSpacing:'0.1em', color:'#e65100' }}>{county}</span>
              <button onClick={() => setCounty(null)} style={{ background:'none', border:'none', color:'#e65100', cursor:'pointer', fontWeight:700, fontSize:'1rem' }}>×</button>
            </div>
          )}

          {/* County pills scattered */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {['台北','新北','基隆','宜蘭','桃園','新竹','苗栗','台中','花蓮','彰化','南投','雲林','嘉義','台南','台東','高雄','屏東'].map((c, i) => (
              <button key={c} onClick={() => setCounty(county===c?null:c)}
                style={{ border:`2px solid ${county===c?'#e65100':'#0066cc'}`, background: county===c?'#e65100':'transparent', color: county===c?'#fffde7':'#0066cc', padding:'2px 8px', fontFamily:"'Noto Sans TC',sans-serif", fontSize:'0.65rem', cursor:'pointer', transform:`rotate(${(i%5-2)*0.8}deg)` }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Right col — chaotic card pile */}
        <div style={{ padding: '1rem', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)', position: 'relative' }}>
          {loading && exps.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', fontFamily:"'Bebas Neue',sans-serif", letterSpacing:'0.3em', color:'#e65100', fontSize:'1rem' }}>LOADING...</div>}

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {exps.map((e, i) => {
              const rot = ROTS[i % ROTS.length]
              const c = COLORS[i % COLORS.length]
              const isOdd = i % 2 === 1
              return (
                <Link key={e.id} href={`/expedition/${e.id}`} className="riso-card"
                  style={{ display: 'block', textDecoration: 'none', background: c.bg, border: `2px solid ${c.accent}`, padding: '0.9rem 1.1rem', marginBottom: '-4px', marginLeft: isOdd ? '16px' : '0', marginRight: isOdd ? '0' : '16px', transform: `rotate(${rot}deg)`, transition: 'transform 0.15s, box-shadow 0.15s, z-index 0s', position: 'relative', zIndex: i % 3 === 0 ? 2 : 1, boxShadow: `3px 3px 0 ${c.accent}44` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.05rem', letterSpacing:'0.08em', color: c.accent, marginBottom: '2px' }}>{e.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#5a4a00' }}>
                    {e.date_start}{e.county ? ` / ${e.county}` : ''}{e.leader ? ` · ${e.leader}` : ''}
                  </div>
                  {i % 7 === 0 && <div style={{ position:'absolute', top:'-10px', right:'8px', background:'#e65100', color:'#fffde7', fontFamily:"'Bebas Neue',sans-serif", fontSize:'0.6rem', padding:'1px 6px', letterSpacing:'0.15em', transform:'rotate(2deg)' }}>精選</div>}
                </Link>
              )
            })}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
      </div>
    </div>
  )
}
