'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { TaiwanMap } from '@/components/TaiwanMap'
import { useExpeditions } from '@/lib/useExpeditions'

const RainCanvas = dynamic(() => import('./RainCanvas').then(m => m.RainCanvas), { ssr: false })

export function NeonHome() {
  const [county, setCounty] = useState<string | null>(null)
  const [tab, setTab] = useState<'map' | 'date' | 'search'>('map')
  const [query, setQuery] = useState('')
  const [months, setMonths] = useState<number | undefined>()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1200)
    return () => clearInterval(t)
  }, [])

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
        .neon-card:hover { background: #111133 !important; border-color: #00d4ff !important; box-shadow: 0 0 20px rgba(0,212,255,0.2) !important; }
      `}</style>

      {/* Rain */}
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
          {/* Tabs as neon buttons */}
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
      <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, height: 'calc(100vh - 140px)' }}>

        {/* Left panel — HUD */}
        <div style={{ borderRight: '1px solid #00d4ff22', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div style={{ border: '1px solid #00d4ff33', padding: '0.5rem 0.75rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#00d4ff66', animation: 'hudPulse 3s infinite' }}>
            ◈ {tab === 'map' ? 'MAP MODE' : tab === 'date' ? 'DATE FILTER' : 'SEARCH MODE'}
          </div>

          {tab === 'map' && (
            <>
              <div style={{ border: '1px solid #00d4ff33', height: '240px', animation: 'hudPulse 4s infinite', boxShadow: 'inset 0 0 20px rgba(0,212,255,0.05)', overflow: 'hidden' }}>
                <TaiwanMap selected={county} onSelect={setCounty} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {['台北','新北','基隆','宜蘭','桃園','新竹','苗栗','台中','花蓮','彰化','南投','雲林','嘉義','台南','台東','高雄','屏東'].map(c => (
                  <button key={c} onClick={() => setCounty(county===c?null:c)}
                    style={{ border: `1px solid ${county===c?'#ff00a8':'#ffffff22'}`, background: county===c?'transparent':'transparent', color: county===c?'#ff00a8':'#6666aa', padding: '3px 2px', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.65rem', cursor:'pointer', boxShadow: county===c?glow('#ff00a8'):undefined, textShadow: county===c?glow('#ff00a8'):undefined }}>
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === 'search' && (
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="SEARCH..." autoFocus
              style={{ background: '#111122', border: '1px solid #00d4ff44', color: '#e8e8ff', padding: '8px 12px', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.85rem', outline:'none', boxShadow: 'inset 0 0 10px rgba(0,212,255,0.05)' }} />
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

        {/* Right — expedition cards as HUD panels */}
        <div style={{ overflowY: 'auto', padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', alignContent: 'start' }}>
          {loading && exps.length === 0 && <div style={{ gridColumn: '1/-1', color: '#00d4ff44', letterSpacing: '0.3em', padding: '3rem', textAlign: 'center', fontSize: '0.7rem' }}>SCANNING DATABASE...</div>}
          {exps.map((e, i) => (
            <Link key={e.id} href={`/expedition/${e.id}`} className="neon-card"
              style={{ display: 'block', textDecoration: 'none', border: '1px solid #ffffff11', background: '#0d0d1f', padding: '1rem', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', borderLeft: `3px solid ${i % 2 === 0 ? '#00d4ff' : '#ff00a8'}` }}>
              {/* Corner accent */}
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
