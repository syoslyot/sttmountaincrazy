'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { TaiwanMap } from '@/components/TaiwanMap'
import { useExpeditions } from '@/lib/useExpeditions'

function TopoGrid() {
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} preserveAspectRatio="none">
      <defs>
        <pattern id="topo-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#8b735522" strokeWidth="0.5"/>
        </pattern>
        <pattern id="topo-grid-major" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
          <path d="M 300 0 L 0 0 0 300" fill="none" stroke="#8b735533" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo-grid)"/>
      <rect width="100%" height="100%" fill="url(#topo-grid-major)"/>
    </svg>
  )
}

function FogLayer() {
  return (
    <>
      <style>{`
        @keyframes fogDrift1 { 0%,100%{transform:translateX(0) scaleY(1)} 50%{transform:translateX(4%) scaleY(1.1)} }
        @keyframes fogDrift2 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-3%)} }
        @keyframes fogFade { 0%,100%{opacity:.5} 50%{opacity:.75} }
      `}</style>
      {/* Bottom fog */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:'25vh', pointerEvents:'none', zIndex:50, animation:'fogFade 9s ease-in-out infinite' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(245,240,232,0.95) 0%, rgba(245,240,232,0.5) 50%, transparent 100%)', animation:'fogDrift1 12s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(237,230,214,0.6) 0%, transparent 60%)', animation:'fogDrift2 8s ease-in-out infinite' }}/>
      </div>
      {/* Top fog wisps */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'8vh', pointerEvents:'none', zIndex:50, background:'linear-gradient(to bottom, rgba(245,240,232,0.4) 0%, transparent 100%)', animation:'fogDrift1 15s ease-in-out infinite' }}/>
    </>
  )
}

export function TopoHome() {
  const [county, setCounty] = useState<string | null>(null)
  const [tab, setTab] = useState<'map' | 'date' | 'search'>('map')
  const [query, setQuery] = useState('')
  const [months, setMonths] = useState<number | undefined>()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [coordSeed] = useState(() => Math.floor(Math.random() * 9000) + 1000)

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
    <div style={{ background: '#f5f0e8', minHeight: '100vh', fontFamily: "'Courier Prime', 'Noto Serif TC', monospace", color: '#2a1f0e', position: 'relative' }}>
      <TopoGrid />
      <FogLayer />

      {/* Header — survey instrument style */}
      <div style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #8b7355', background: '#2a1f0e', padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div>
          <div style={{ color: '#f5f0e8', fontFamily: "'Noto Serif TC', serif", fontSize: '1.1rem', fontWeight: 300, letterSpacing: '0.2em' }}>成大山協</div>
          <div style={{ color: '#8b7355', fontSize: '0.55rem', letterSpacing: '0.35em', fontFamily: "'Courier Prime', monospace" }}>NCKU MTN. ASSOCIATION · SURVEY CHART</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Coordinate readout */}
        <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: '0.6rem', color: '#8b7355', letterSpacing: '0.1em', textAlign: 'right', lineHeight: 1.6 }}>
          <div>N 23°00&apos;{coordSeed.toString().slice(0,2)}&apos;&apos;</div>
          <div>E 120°58&apos;{coordSeed.toString().slice(2,4)}&apos;&apos;</div>
        </div>
        <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: '0.6rem', color: '#c4a87a', letterSpacing: '0.1em', borderLeft: '1px solid #8b735544', paddingLeft: '1rem' }}>
          {total} RECORDS
        </div>
      </div>

      {/* Sub-nav — legend style */}
      <div style={{ position: 'relative', zIndex: 10, background: 'rgba(245,240,232,0.9)', borderBottom: '1px dashed #8b735566', padding: '0.5rem 2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: '#8b7355', marginRight: '0.5rem', fontFamily: "'Courier Prime', monospace" }}>FILTER //</div>
        {(['map','date','search'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ border: `1px ${tab===t?'solid':'dashed'} #8b7355`, background: tab===t?'#4a6741':'transparent', color: tab===t?'#f5f0e8':'#6b5a3e', padding: '2px 10px', fontFamily: "'Courier Prime', monospace", fontSize: '0.7rem', letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase' }}>
            {t==='map'?'□ Region':t==='date'?'○ Date':'◇ Search'}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 5, display: 'grid', gridTemplateColumns: '360px 1fr', height: 'calc(100vh - 100px)' }}>

        {/* Left — map panel */}
        <div style={{ borderRight: '1px dashed #8b735566', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', background: 'rgba(245,240,232,0.7)' }}>
          {/* Map legend header */}
          <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: '0.58rem', letterSpacing: '0.2em', color: '#8b7355', display: 'flex', justifyContent: 'space-between' }}>
            <span>▣ TOPOGRAPHIC MAP</span>
            <span>scale 1:xxx,xxx</span>
          </div>

          {/* Map frame */}
          <div style={{ border: '1px solid #8b7355', padding: '6px', background: 'rgba(255,255,255,0.4)', position: 'relative', height: '280px' }}>
            {/* Corner markers */}
            {[{t:'0',l:'0',tr:'tr'},{t:'0',r:'0',tr:'tl'},{b:'0',l:'0',tr:'br'},{b:'0',r:'0',tr:'bl'}].map((_, i) => (
              <div key={i} style={{ position:'absolute', width:8, height:8, top: i<2?-1:undefined, bottom: i>=2?-1:undefined, left: i%2===0?-1:undefined, right: i%2===1?-1:undefined, borderTop: i<2?'2px solid #4a6741':undefined, borderBottom: i>=2?'2px solid #4a6741':undefined, borderLeft: i%2===0?'2px solid #4a6741':undefined, borderRight: i%2===1?'2px solid #4a6741':undefined }} />
            ))}
            <TaiwanMap selected={county} onSelect={tab==='map'?setCounty:()=>{}} />
          </div>

          {tab === 'map' && (
            <>
              {county && <div style={{ fontFamily:"'Courier Prime',monospace", fontSize:'0.7rem', color:'#4a6741', letterSpacing:'0.1em', borderLeft:'3px solid #4a6741', paddingLeft:'8px' }}>▶ {county} selected <button onClick={()=>setCounty(null)} style={{background:'none',border:'none',color:'#8b7355',cursor:'pointer'}}>✕</button></div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
                {['台北','新北','基隆','宜蘭','桃園','新竹','苗栗','台中','花蓮','彰化','南投','雲林','嘉義','台南','台東','高雄','屏東'].map(c => (
                  <button key={c} onClick={() => setCounty(county===c?null:c)}
                    style={{ border:`1px ${county===c?'solid':'dashed'} #8b7355`, background: county===c?'#4a6741':'transparent', color: county===c?'#f5f0e8':'#6b5a3e', padding:'2px 4px', fontFamily:"'Courier Prime',monospace", fontSize:'0.62rem', cursor:'pointer', letterSpacing:'0.05em' }}>
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === 'search' && (
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SEARCH QUERY..." autoFocus
              style={{ border:'1px solid #8b7355', background:'transparent', padding:'6px 10px', fontFamily:"'Courier Prime',monospace", fontSize:'0.8rem', outline:'none', letterSpacing:'0.05em' }} />
          )}
          {tab === 'date' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {[{l:'近一月',m:1},{l:'近半年',m:6},{l:'近一年',m:12},{l:'近三年',m:36}].map(({l,m}) => (
                <button key={m} onClick={()=>setMonths(months===m?undefined:m)}
                  style={{ border:`1px ${months===m?'solid':'dashed'} #8b7355`, background:months===m?'#2a1f0e':'transparent', color:months===m?'#f5f0e8':'#6b5a3e', padding:'4px 10px', fontFamily:"'Courier Prime',monospace", fontSize:'0.72rem', cursor:'pointer', textAlign:'left', letterSpacing:'0.08em' }}>
                  {months===m?'▶':' '} {l}
                </button>
              ))}
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop:'auto', borderTop:'1px dashed #8b735566', paddingTop:'0.75rem', fontFamily:"'Courier Prime',monospace", fontSize:'0.55rem', color:'#8b7355', lineHeight:1.8, letterSpacing:'0.08em' }}>
            <div>── 路徑（Trail）</div>
            <div>▣ 縣市選取（Selected Region）</div>
            <div>◈ 出隊起訖點（Expedition Point）</div>
          </div>
        </div>

        {/* Right — survey record cards */}
        <div style={{ overflowY: 'auto', padding: '1.5rem 2rem', paddingBottom: '6rem', background: 'rgba(245,240,232,0.6)' }}>
          {loading && exps.length === 0 && (
            <div style={{ textAlign:'center', color:'#8b7355', fontFamily:"'Courier Prime',monospace", letterSpacing:'0.3em', fontSize:'0.7rem', padding:'3rem' }}>
              LOADING SURVEY DATA...
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {exps.map((e, i) => {
              const coordN = (23 + (i * 0.03) % 2).toFixed(4)
              const coordE = (120 + (i * 0.04) % 2).toFixed(4)
              const alt    = 800 + (i * 137) % 2400
              return (
                <Link key={e.id} href={`/expedition/${e.id}`}
                  style={{ display:'block', textDecoration:'none', border:`1px ${i%3===0?'solid':'dashed'} #8b735566`, padding:'0.8rem 1rem', background: i%4===0?'rgba(74,103,65,0.05)':'rgba(255,255,255,0.3)', position:'relative', transition:'background 0.15s' }}>
                  {/* Survey marker */}
                  <div style={{ position:'absolute', top:0, right:0, borderLeft:'1px dashed #8b735544', borderBottom:'1px dashed #8b735544', padding:'2px 6px', fontFamily:"'Courier Prime',monospace", fontSize:'0.5rem', color:'#8b7355', letterSpacing:'0.1em' }}>
                    N{coordN}° E{coordE}° ▲{alt}m
                  </div>
                  <div style={{ fontFamily:"'Courier Prime',monospace", fontSize:'0.55rem', letterSpacing:'0.2em', color:'#8b7355', marginBottom:'4px' }}>
                    REC-{String(e.id).padStart(4,'0')} // {e.date_start}
                  </div>
                  <div style={{ fontFamily:"'Noto Serif TC',serif", fontSize:'0.95rem', fontWeight:400, letterSpacing:'0.06em', color:'#2a1f0e', marginBottom:'4px' }}>{e.name}</div>
                  {(e.county || e.leader) && (
                    <div style={{ fontFamily:"'Courier Prime',monospace", fontSize:'0.62rem', color:'#6b5a3e', letterSpacing:'0.05em' }}>
                      {[e.county, e.region, e.leader].filter(Boolean).join(' / ')}
                    </div>
                  )}
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
