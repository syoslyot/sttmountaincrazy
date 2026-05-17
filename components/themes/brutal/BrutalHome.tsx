'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { TaiwanMap } from '@/components/TaiwanMap'
import { useExpeditions, Expedition } from '@/lib/useExpeditions'

const ROTATIONS = [-3, -1.5, 0, 1, 2.5, -2, 0.5, -0.5, 3, -1]
const SIZES = ['big', 'small', 'wide', 'normal', 'normal', 'small', 'big', 'wide', 'normal', 'small']

function BrutalCard({ exp, idx }: { exp: Expedition; idx: number }) {
  const rot  = ROTATIONS[idx % ROTATIONS.length]
  const size = SIZES[idx % SIZES.length]

  const style: React.CSSProperties = {
    transform: `rotate(${rot}deg)`,
    transition: 'transform 0.1s, box-shadow 0.1s',
    border: '3px solid #000',
    background: idx % 5 === 0 ? '#ff0000' : idx % 7 === 0 ? '#000' : '#fff',
    color: idx % 5 === 0 || idx % 7 === 0 ? '#fff' : '#000',
    padding: size === 'big' ? '1.5rem' : '0.75rem',
    gridColumn: size === 'wide' ? 'span 2' : 'span 1',
    gridRow: size === 'big' ? 'span 2' : 'span 1',
    cursor: 'pointer',
    display: 'block',
    textDecoration: 'none',
    fontFamily: "'Space Mono', monospace",
    position: 'relative',
    zIndex: idx % 3 === 0 ? 2 : 1,
    marginTop: idx % 4 === 0 ? '-12px' : idx % 3 === 0 ? '8px' : '0',
    boxShadow: '4px 4px 0 #000',
  }

  return (
    <Link href={`/expedition/${exp.id}`} style={style}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.transform = `rotate(${rot}deg) scale(1.05)`
        el.style.boxShadow = '8px 8px 0 #ff0000'
        el.style.zIndex = '10'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.transform = `rotate(${rot}deg) scale(1)`
        el.style.boxShadow = '4px 4px 0 #000'
        el.style.zIndex = String(idx % 3 === 0 ? 2 : 1)
      }}
    >
      <div style={{ fontSize: size === 'big' ? '1rem' : '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
        {exp.name}
      </div>
      <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>
        {exp.date_start} {exp.county ? `/ ${exp.county}` : ''}
      </div>
      {idx % 5 === 0 && (
        <div style={{ position: 'absolute', top: '-12px', right: '-8px', background: '#fff', color: '#ff0000', border: '2px solid #ff0000', fontSize: '0.6rem', padding: '1px 5px', fontWeight: 900, letterSpacing: '0.1em' }}>NEW</div>
      )}
    </Link>
  )
}

export function BrutalHome() {
  const [county, setCounty] = useState<string | null>(null)
  const [query,  setQuery]  = useState('')
  const [tab,    setTab]    = useState<'map' | 'search'>('map')
  const sentinelRef         = useRef<HTMLDivElement>(null)

  const filter = tab === 'search' && query
    ? { mode: 'search' as const, query }
    : county
    ? { mode: 'county' as const, county }
    : { mode: 'recent' as const }

  const { exps, total, loading, loadMore } = useExpeditions(filter)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore() })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const ticker = '✦ 成大山協出隊紀錄 ✦ NCKU MOUNTAINEERING ✦ 出發了 ✦ GO INTO THE MOUNTAINS ✦ '

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: "'Space Mono', monospace", overflow: 'hidden' }}>

      {/* Marquee ticker */}
      <div style={{ background: '#000', color: '#ff0000', padding: '6px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <style>{`
          @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          .brutal-ticker { display: inline-block; animation: ticker 18s linear infinite; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; font-family: 'Space Mono', monospace; }
        `}</style>
        <span className="brutal-ticker">{ticker.repeat(6)}</span>
      </div>

      {/* Navbar area */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '4px solid #000' }}>
        <div style={{ padding: '1rem 1.5rem', borderRight: '4px solid #000', flex: 1 }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1 }}>成大山協</div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: '#666', marginTop: '2px' }}>NCKU MOUNTAINEERING ASSOCIATION</div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['map', 'search'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '0 1.5rem', background: tab === t ? '#000' : '#fff', color: tab === t ? '#ff0000' : '#000', border: 'none', borderLeft: '4px solid #000', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t === 'map' ? '地圖' : '搜尋'}
            </button>
          ))}
        </div>
        <div style={{ padding: '1rem', borderLeft: '4px solid #000', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>
          共 <strong style={{ color: '#ff0000', margin: '0 4px' }}>{total}</strong> 筆
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 120px)' }}>

        {/* Left: map or search */}
        <div style={{ borderRight: '4px solid #000', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tab === 'map' ? (
            <>
              <div style={{ border: '3px solid #000', height: '260px', overflow: 'hidden', transform: 'rotate(-1deg)', boxShadow: '4px 4px 0 #000' }}>
                <TaiwanMap selected={county} onSelect={setCounty} />
              </div>
              {county && (
                <div style={{ border: '3px solid #ff0000', padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: '#ff0000', fontWeight: 700 }}>SELECTED</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{county}</div>
                  <button onClick={() => setCounty(null)} style={{ background: 'none', border: '2px solid #000', fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', cursor: 'pointer', marginTop: '4px', padding: '2px 8px' }}>✕ CLEAR</button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {['台北','新北','基隆','宜蘭','桃園','新竹','苗栗','台中','花蓮','彰化','南投','雲林','嘉義','台南','台東','高雄','屏東'].map(c => (
                  <button key={c} onClick={() => setCounty(county === c ? null : c)}
                    style={{ border: '2px solid #000', padding: '3px 2px', fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', background: county === c ? '#000' : '#fff', color: county === c ? '#ff0000' : '#000', letterSpacing: '0.05em' }}>
                    {c}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', marginBottom: '6px' }}>SEARCH//搜尋</div>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="TYPE TO SEARCH..."
                style={{ width: '100%', border: '3px solid #000', padding: '8px', fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              {query && <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '4px' }}>→ {total} results</div>}
            </div>
          )}
        </div>

        {/* Right: chaotic card grid */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          {loading && exps.length === 0 ? (
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: '#666', padding: '2rem', textAlign: 'center' }}>LOADING...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'start' }}>
              {exps.map((e, i) => <BrutalCard key={e.id} exp={e} idx={i} />)}
            </div>
          )}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loading && exps.length > 0 && <div style={{ textAlign: 'center', padding: '1rem', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.2em' }}>LOADING MORE...</div>}
        </div>
      </div>
    </div>
  )
}
