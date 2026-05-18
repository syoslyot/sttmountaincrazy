'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useExpeditions } from '@/lib/useExpeditions'

const RainCanvas = dynamic(() => import('./RainCanvas').then(m => m.RainCanvas), { ssr: false })
const ScatteredTaiwanMap = dynamic(() => import('@/components/ScatteredTaiwanMap').then(m => m.ScatteredTaiwanMap), { ssr: false })

export function NeonHome() {
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

  const glow = (color: string) => `0 0 8px ${color}, 0 0 20px ${color}44`

  return (
    <div style={{ background: '#080810', minHeight: '100vh', color: '#e8e8ff', fontFamily: "'Space Grotesk', 'Noto Sans TC', sans-serif", position: 'relative' }}>
      <style>{`
        @keyframes scanline { 0%,100% { opacity: 0.03 } 50% { opacity: 0.07 } }
        @keyframes neonFlicker { 0%,100% { opacity: 1 } 92% { opacity: 1 } 93% { opacity: 0.4 } 94% { opacity: 1 } 97% { opacity: 0.7 } 98% { opacity: 1 } }
        @keyframes hudPulse { 0%,100% { border-color: #00d4ff44 } 50% { border-color: #00d4ff99 } }
        .neon-card:hover { background: rgba(17,17,51,0.9) !important; border-color: #00d4ff !important; box-shadow: 0 0 20px rgba(0,212,255,0.2) !important; }
      `}</style>

      {/* Counties fall behind rain — rendered before RainCanvas so rain paints on top */}
      <ScatteredTaiwanMap
        selected={county}
        onSelect={tab === 'map' ? c => setCounty(c) : () => {}}
        variant="fall"
        fillNormal="rgba(0,212,255,0.10)"
        fillSelected="rgba(0,212,255,0.50)"
        stroke="#00d4ff"
        glowColor="#00d4ff"
        maxPx={130}
      />

      {/* Rain — z:1, above counties in DOM order */}
      <RainCanvas />

      {/* Scanlines overlay */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)', pointerEvents: 'none', zIndex: 2, animation: 'scanline 4s ease-in-out infinite' }} />

      {/* HUD corners */}
      {[['top:0;left:0','border-top:2px solid #00d4ff;border-left:2px solid #00d4ff'],['top:0;right:0','border-top:2px solid #ff00a8;border-right:2px solid #ff00a8'],['bottom:0;left:0','border-bottom:2px solid #ff00a8;border-left:2px solid #ff00a8'],['bottom:0;right:0','border-bottom:2px solid #00d4ff;border-right:2px solid #00d4ff']].map(([pos, bdr], i) => (
        <div key={i} style={{ position: 'fixed', width: 32, height: 32, ...Object.fromEntries(pos.split(';').map(s => { const [k,v]=s.split(':'); return [k,v] })), ...Object.fromEntries(bdr.split(';').map(s => { const [k,...v]=s.split(':'); return [k,v.join(':')] })), zIndex: 999, pointerEvents: 'none' }} />
      ))}

      {/* Status bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0.4rem 1.5rem', borderBottom: '1px solid #00d4ff22', fontSize: '0.6rem', letterSpacing: '0.15em', color: '#00d4ff88', gap: '2rem' }}>
        <span style={{ animation: 'neonFlicker 5s infinite' }}>● SYS ONLINE</span>
        <span>LAT 23.5°N / LON 121.0°E</span>
        <span>{new Date().toISOString().slice(0,10)}</span>
        <span style={{ flex: 1 }} />
        <span>{total} RECORDS FOUND</span>
      </div>

      {/* Main title */}
      <div style={{ position: 'relative', zIndex: 10, padding: '1.5rem 2rem 1rem', borderBottom: '1px solid #ffffff11' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '0.15em', color: '#00d4ff', textShadow: glow('#00d4ff'), animation: 'neonFlicker 8s infinite', fontFamily: "'Noto Sans TC', sans-serif" }}>
            成大山協
          </div>
          <div style={{ fontSize: '0.7rem', color: '#ff00a8', letterSpacing: '0.25em', textShadow: glow('#ff00a8') }}>
            NCKU MTN.
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['map','date','search'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: `1px solid ${tab===t?'#00d4ff':'#ffffff22'}`, color: tab===t?'#00d4ff':'#8888bb', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', textShadow: tab===t?glow('#00d4ff'):undefined, boxShadow: tab===t?glow('#00d4ff'):undefined }}>
                {t==='map'?'地圖':t==='date'?'日期':'搜尋'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0, height: 'calc(100vh - 140px)' }}>

        {/* Left panel — HUD filter controls */}
        <div style={{ borderRight: '1px solid #00d4ff22', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', background: 'rgba(8,8,16,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ border: '1px solid #00d4ff33', padding: '0.5rem 0.75rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#00d4ff66', animation: 'hudPulse 3s infinite' }}>
            ◈ {tab === 'map' ? 'MAP MODE' : tab === 'date' ? 'DATE FILTER' : 'SEARCH MODE'}
          </div>

          {tab === 'map' && (
            <>
              <div style={{ fontSize: '0.6rem', color: '#00d4ff44', letterSpacing: '0.12em', lineHeight: 1.6 }}>
                縣市形狀正從上方落下
                <br />點選形狀篩選出隊紀錄
              </div>
              {county ? (
                <div style={{ border: '1px solid #ff00a8', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: glow('#ff00a8') }}>
                  <span style={{ color: '#ff00a8', fontSize: '0.9rem', letterSpacing: '0.1em', textShadow: glow('#ff00a8') }}>{county}</span>
                  <button onClick={() => setCounty(null)} style={{ background: 'none', border: 'none', color: '#ff00a8', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                </div>
              ) : (
                <div style={{ border: '1px dashed #00d4ff22', padding: '0.5rem 0.75rem', fontSize: '0.65rem', color: '#00d4ff33', letterSpacing: '0.08em' }}>
                  — no region selected —
                </div>
              )}
            </>
          )}

          {tab === 'search' && (
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="SEARCH..." autoFocus
              style={{ background: 'rgba(17,17,34,0.8)', border: '1px solid #00d4ff44', color: '#e8e8ff', padding: '8px 12px', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.85rem', outline:'none', boxShadow: 'inset 0 0 10px rgba(0,212,255,0.05)' }} />
          )}

          {tab === 'date' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[{l:'近一月',m:1},{l:'近半年',m:6},{l:'近一年',m:12},{l:'近三年',m:36}].map(({l,m}) => (
                <button key={m} onClick={() => setMonths(months===m?undefined:m)}
                  style={{ border:`1px solid ${months===m?'#00d4ff':'#ffffff22'}`, background:'transparent', color:months===m?'#00d4ff':'#6666aa', padding:'6px 12px', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.75rem', cursor:'pointer', textAlign:'left', letterSpacing:'0.1em', boxShadow:months===m?glow('#00d4ff'):undefined }}>
                  ▶ {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — expedition cards */}
        <div style={{ overflowY: 'auto', padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', alignContent: 'start', background: 'rgba(8,8,16,0.65)', backdropFilter: 'blur(2px)' }}>
          {loading && exps.length === 0 && <div style={{ gridColumn: '1/-1', color: '#00d4ff44', letterSpacing: '0.3em', padding: '3rem', textAlign: 'center', fontSize: '0.7rem' }}>SCANNING DATABASE...</div>}
          {exps.map((e, i) => (
            <Link key={e.id} href={`/expedition/${e.id}`} className="neon-card"
              style={{ display: 'block', textDecoration: 'none', border: '1px solid #ffffff11', background: 'rgba(13,13,31,0.82)', padding: '1rem', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', borderLeft: `3px solid ${i % 2 === 0 ? '#00d4ff' : '#ff00a8'}` }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderBottom: `2px solid ${i%2===0?'#00d4ff':'#ff00a8'}`, borderLeft: `2px solid ${i%2===0?'#00d4ff':'#ff00a8'}` }} />
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: i%2===0?'#00d4ff66':'#ff00a866', marginBottom: '6px' }}>
                EXPEDITION // {e.date_start}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e8e8ff', marginBottom: '4px' }}>{e.name}</div>
              {(e.county || e.leader) && (
                <div style={{ fontSize: '0.65rem', color: '#6666aa', letterSpacing: '0.08em' }}>
                  {[e.county, e.leader].filter(Boolean).join(' / ')}
                </div>
              )}
            </Link>
          ))}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
      </div>
    </div>
  )
}
