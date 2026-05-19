'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useExpeditions } from '@/lib/useExpeditions'
import { ThemeBadge } from '@/components/ThemeBadge'

const RocketSystem = dynamic(() => import('./RocketSystem').then(m => m.RocketSystem), { ssr: false })
const SpeechBubble = dynamic(() => import('./SpeechBubble').then(m => m.SpeechBubble), { ssr: false })
const ScatteredTaiwanMap = dynamic(() => import('@/components/ScatteredTaiwanMap').then(m => m.ScatteredTaiwanMap), { ssr: false })

const ROTS = [-4, 2, -1.5, 3, -2.5, 1, -3, 0.5, 2.5, -1]
const COLORS = [
  { bg: 'rgba(230,81,0,0.08)', accent: '#e65100' },
  { bg: 'rgba(0,102,204,0.08)', accent: '#0066cc' },
  { bg: 'rgba(255,251,231,1)',  accent: '#e65100' },
  { bg: 'rgba(0,102,204,0.05)', accent: '#0066cc' },
  { bg: 'rgba(230,81,0,0.12)', accent: '#e65100' },
]

export function RocketHome() {
  const [selectedCounties, setSelectedCounties] = useState<string[]>([])
  const [tab, setTab] = useState<'map' | 'search'>('map')
  const [query, setQuery] = useState('')
  const [showLabels, setShowLabels] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filter = tab === 'search' && query
    ? { mode: 'search' as const, query }
    : selectedCounties.length > 0
    ? { mode: 'counties' as const, counties: selectedCounties }
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

      <RocketSystem />
      <SpeechBubble revealed={showLabels} onToggle={() => setShowLabels(p => !p)} />

      {/* Color sheets */}
      <div style={{ position: 'fixed', top: '-5%', left: '-8%', width: '55%', height: '65%', background: 'rgba(230,81,0,0.06)', transform: 'rotate(-3deg)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '35%', right: '-10%', width: '50%', height: '60%', background: 'rgba(0,102,204,0.06)', transform: 'rotate(2deg)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Scattered county map */}
      <ScatteredTaiwanMap
        selected={selectedCounties}
        onSelect={tab === 'map' ? setSelectedCounties : () => {}}
        variant="puzzle"
        fillNormal="rgba(230,81,0,0.13)"
        fillSelected="#e65100"
        stroke="#1a1000"
        maxPx={234}
        showLabels={showLabels}
      />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, padding: '1rem 2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', pointerEvents: 'none' }}>
        <div style={{ background: '#e65100', color: '#fffde7', padding: '0.4rem 1.2rem', transform: 'rotate(-1deg)', display: 'inline-block', pointerEvents: 'auto' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.2em', lineHeight: 1 }}>成大山協</div>
        </div>
        <div style={{ background: '#0066cc', color: '#fffde7', padding: '0.25rem 0.8rem', transform: 'rotate(1.5deg)', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: "'Bebas Neue', sans-serif", pointerEvents: 'auto' }}>
          NCKU MTN.
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ border: '2px solid #e65100', padding: '0.3rem 0.8rem', transform: 'rotate(-0.5deg)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', color: '#e65100', letterSpacing: '0.15em', pointerEvents: 'auto' }}>
          {total} EXPEDITIONS
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ position: 'relative', zIndex: 10, padding: '0.5rem 2rem', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', pointerEvents: 'none' }}>
        {(['map', 'search'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ border: `2px solid ${t === 'map' ? '#e65100' : '#0066cc'}`, background: tab === t ? (t === 'map' ? '#e65100' : '#0066cc') : 'transparent', color: tab === t ? '#fffde7' : (t === 'map' ? '#e65100' : '#0066cc'), padding: '0.3rem 0.9rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '0.9rem', letterSpacing: '0.15em', cursor: 'pointer', transform: t === 'map' ? 'rotate(-1deg)' : 'rotate(0.5deg)', pointerEvents: 'auto' }}>
            {t === 'map' ? '地圖' : '搜尋'}
          </button>
        ))}

        {tab === 'search' && (
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="關鍵字…" autoFocus
            style={{ border: '3px solid #0066cc', background: 'rgba(255,253,231,0.9)', padding: '6px 12px', fontFamily: "'Noto Sans TC',sans-serif", fontSize: '0.9rem', outline: 'none', transform: 'rotate(-0.5deg)', pointerEvents: 'auto' }} />
        )}

        {tab === 'map' && selectedCounties.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', pointerEvents: 'auto' }}>
            {selectedCounties.map(c => (
              <div key={c} style={{ border: '2px solid #e65100', padding: '0.25rem 0.7rem', transform: 'rotate(-0.8deg)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,253,231,0.9)' }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#e65100' }}>{c}</span>
                <button onClick={() => setSelectedCounties(prev => prev.filter(x => x !== c))} style={{ background: 'none', border: 'none', color: '#e65100', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>×</button>
              </div>
            ))}
            {selectedCounties.length < 17 && (
              <button onClick={() => setSelectedCounties([])} style={{ border: '2px dashed #e65100', background: 'transparent', color: '#e65100', padding: '0.25rem 0.6rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '0.75rem', cursor: 'pointer', letterSpacing: '0.1em' }}>清除</button>
            )}
          </div>
        )}

        {tab === 'map' && selectedCounties.length === 0 && (
          <span style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: '0.7rem', color: '#e65100', opacity: 0.6, transform: 'rotate(-0.5deg)', display: 'inline-block' }}>← 點選或拖曳縣市形狀篩選，拼合相鄰縣市可複選</span>
        )}
        <ThemeBadge containerStyle={{ position: 'fixed', bottom: 12, right: 506, display: 'flex', gap: '0.5rem', zIndex: 20, pointerEvents: 'auto' }} />
      </div>

      {/* Expedition cards — fixed right panel so left/center counties remain clickable */}
      <div style={{ position: 'fixed', right: 0, top: 130, width: 494, height: 'calc(100vh - 130px)', overflowY: 'auto', zIndex: 10, padding: '0.5rem 1rem 8px', background: 'rgba(255,253,231,0.88)', backdropFilter: 'blur(4px)', borderLeft: '3px solid #e65100' }}>
        {loading && exps.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", letterSpacing: '0.3em', color: '#e65100', fontSize: '1rem' }}>LOADING...</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {exps.map((e, i) => {
            const rot = ROTS[i % ROTS.length]
            const c = COLORS[i % COLORS.length]
            const isOdd = i % 2 === 1
            return (
              <Link key={e.id} href={`/expedition/${e.id}`} className="riso-card"
                style={{ display: 'block', textDecoration: 'none', background: c.bg, border: `2px solid ${c.accent}`, padding: '0.9rem 1.1rem', marginBottom: '-4px', marginLeft: isOdd ? '16px' : '0', marginRight: isOdd ? '0' : '16px', transform: `rotate(${rot}deg)`, transition: 'transform 0.15s, box-shadow 0.15s, z-index 0s', position: 'relative', zIndex: i % 3 === 0 ? 2 : 1, boxShadow: `3px 3px 0 ${c.accent}44` }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem', letterSpacing: '0.08em', color: c.accent, marginBottom: '2px' }}>{e.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#5a4a00' }}>
                  {(() => {
                    const r = e.region; const rx = e.region_exit
                    const area = r && rx && r !== rx ? `${r} → ${rx}` : (r ?? rx ?? null)
                    return <>{e.date_start}{area ? ` / ${area}` : ''}{e.leader ? ` · ${e.leader}` : ''}</>
                  })()}
                </div>
              </Link>
            )
          })}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  )
}
