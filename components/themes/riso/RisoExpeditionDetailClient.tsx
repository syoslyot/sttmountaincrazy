'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const RisoLeafletMap = dynamic(
  () => import('@/components/RisoLeafletMap').then(m => m.RisoLeafletMap),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#fffde7' }} /> }
)

const GPX_ROTS = [-1.2, 1.5, -0.8, 1.0, -1.5, 0.6]
const REC_ROTS = [-0.5, 1.2, -1.0, 0.8]

interface Props {
  exp: Record<string, unknown>
  gpxPaths: string[]
  mapFiles: { file_path: string }[]
  records: { filename: string; content: string }[]
}

export function RisoExpeditionDetailClient({ exp, gpxPaths, mapFiles, records }: Props) {
  const [activeGpx, setActiveGpx] = useState<string | null>(gpxPaths[0] ?? null)
  const [selectedRecord, setSelectedRecord] = useState<number>(0)
  const [showRecord, setShowRecord] = useState(false)

  const pdfFiles = mapFiles.filter(f => f.file_path.toLowerCase().endsWith('.pdf'))
  const p1Image = exp.preview_image
    ? (String(exp.preview_image).split('/').pop() ?? null)
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#fffde7',
      fontFamily: "'Noto Sans TC', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes risoGrain { 0%,100%{opacity:.06} 50%{opacity:.09} }
        @keyframes bubbleFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-4px) rotate(-0.5deg)} }
        .riso-det-bubble::after {
          content:''; position:absolute; bottom:-23px; left:25px;
          border:12px solid transparent; border-top-color:#1a1000;
        }
        .riso-det-bubble::before {
          content:''; position:absolute; bottom:-18px; left:30px;
          border:7px solid transparent; border-top-color:#fffde7; z-index:1;
        }
        .riso-det-bubble-open::after { border-top-color: #b84000; }
        .riso-det-bubble-open::before { border-top-color: #e65100; }
        .riso-btn-gpx { transition: background 0.15s, color 0.15s; }
        .riso-btn-rec { transition: background 0.15s, color 0.15s; }
      `}</style>

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")",
        pointerEvents: 'none', zIndex: 1500,
        animation: 'risoGrain 6s ease-in-out infinite',
      }} />

      {/* ── TOP HEADER ROW: buttons (homepage style) ── */}
      <div style={{
        padding: '0.9rem 1.5rem 0.5rem',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.2rem',
        flexShrink: 0,
        background: 'rgba(255,253,231,0.97)',
        borderBottom: '2px solid rgba(230,81,0,0.2)',
        position: 'relative', zIndex: 2,
        pointerEvents: 'none',
      }}>
        {/* 成大山協 */}
        <Link href="/" style={{ textDecoration: 'none', pointerEvents: 'auto' }}>
          <div style={{
            background: '#e65100', color: '#fffde7',
            padding: '0.4rem 1.2rem', transform: 'rotate(-1deg)', display: 'inline-block',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.8rem', letterSpacing: '0.2em', lineHeight: 1,
          }}>成大山協</div>
        </Link>

        {/* Info */}
        <div style={{
          background: '#0066cc', color: '#fffde7',
          padding: '0.25rem 0.8rem', transform: 'rotate(1.5deg)',
          fontSize: '0.7rem', letterSpacing: '0.2em',
          fontFamily: "'Bebas Neue', sans-serif",
          pointerEvents: 'auto',
        }}>Info</div>

        {/* GPX / KML track buttons */}
        {gpxPaths.map((p, i) => {
          const name = p.split('/').pop() ?? p
          const isActive = activeGpx === p
          return (
            <button key={p} onClick={() => setActiveGpx(p)}
              className="riso-btn-gpx"
              style={{
                border: '2px solid #e65100',
                background: isActive ? '#e65100' : 'transparent',
                color: isActive ? '#fffde7' : '#e65100',
                padding: '0.32rem 0.84rem',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.89rem', letterSpacing: '0.12em',
                cursor: 'pointer',
                transform: `rotate(${GPX_ROTS[i % GPX_ROTS.length]}deg)`,
                pointerEvents: 'auto',
              }}>
              {name}
            </button>
          )
        })}

        {/* PDF map buttons */}
        {pdfFiles.map((f, i) => (
          <a key={f.file_path}
            href={`/api/pdf?file=${encodeURIComponent(f.file_path)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              border: '2px solid #e65100',
              background: 'transparent', color: '#e65100',
              padding: '0.32rem 0.84rem',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '0.89rem', letterSpacing: '0.12em',
              textDecoration: 'none',
              display: 'inline-block',
              transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)`,
              pointerEvents: 'auto',
            }}>
            地圖 .pdf
          </a>
        ))}

        {/* Record selector buttons */}
        {records.map((r, i) => {
          const isSelected = selectedRecord === i
          return (
            <button key={r.filename} onClick={() => setSelectedRecord(i)}
              className="riso-btn-rec"
              style={{
                border: '2px solid #3a7d44',
                background: isSelected ? '#3a7d44' : 'transparent',
                color: isSelected ? '#fffde7' : '#3a7d44',
                padding: '0.32rem 0.84rem',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.89rem', letterSpacing: '0.12em',
                cursor: 'pointer',
                transform: `rotate(${REC_ROTS[i % REC_ROTS.length]}deg)`,
                pointerEvents: 'auto',
              }}>
              {r.filename}
            </button>
          )
        })}
      </div>

      {/* ── CONTENT ROW: map + right panel ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', position: 'relative' }}>

        {/* Map area */}
        <div style={{ flex: 1, maxWidth: '55%', minWidth: 0, zIndex: 1 }}>
          <RisoLeafletMap activeGpx={activeGpx} />
        </div>

        {/* Right panel: one orange quad + one big image (overflows into map) */}
        <div style={{
          width: '36%', flexShrink: 0, marginLeft: 'auto',
          position: 'relative',
          overflow: 'visible',
          zIndex: 5,
        }}>
          {/* Orange quad — smaller, upper-right, offset from image for layering */}
          <div style={{
            position: 'absolute',
            width: '80%', height: '52%',
            top: '-6%', right: '-6%', left: 'auto', bottom: 'auto',
            background: 'rgba(230,81,0,0.35)',
            transform: 'rotate(-4deg)',
            zIndex: 0,
            pointerEvents: 'none',
          }} />

          {/* P1 image — 128% wide (50% larger than 85%), extends left into map */}
          {p1Image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/preview?file=${encodeURIComponent(p1Image)}`}
              alt="隊伍資訊"
              style={{
                position: 'absolute',
                top: 'calc(-3% - 5px)',
                right: -30,
                width: '132%',
                maxWidth: 'none',
                transform: 'rotate(-3deg)',
                zIndex: 10,
                boxShadow: '6px 6px 0 rgba(0,0,0,0.28)',
                objectFit: 'contain',
              }}
            />
          )}
        </div>
      </div>

      {/* ── FIXED: 點我看紀錄 (bottom-left, 50% bigger) + record panel ── */}
      {records.length > 0 && (
        <>
          {/* Record content panel */}
          {showRecord && (
            <div style={{
              position: 'fixed', bottom: 110, left: 20,
              width: 432, maxHeight: 510,
              overflow: 'auto',
              background: '#fffde7',
              border: '3px solid #1a1000',
              boxShadow: '4px 4px 0 #1a1000',
              zIndex: 1100,
              padding: '1rem 1.2rem',
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: '0.85rem', lineHeight: 1.8,
              color: '#1a1000',
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.9rem', color: '#e65100',
                letterSpacing: '0.1em', marginBottom: '0.5rem',
              }}>
                {records[selectedRecord]?.filename}
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
                {records[selectedRecord]?.content}
              </pre>
            </div>
          )}

          {/* 點我看紀錄 trigger (bottom-left, 50% larger) */}
          <div
            onClick={() => setShowRecord(p => !p)}
            style={{
              position: 'fixed', bottom: 25, left: 20, zIndex: 1100,
              pointerEvents: 'auto', cursor: 'pointer',
              animation: 'bubbleFloat 3.5s ease-in-out infinite',
            }}
          >
            <div
              className={showRecord ? 'riso-det-bubble riso-det-bubble-open' : 'riso-det-bubble'}
              style={{
                background: showRecord ? '#e65100' : '#fffde7',
                border: `3px solid ${showRecord ? '#b84000' : '#1a1000'}`,
                padding: '14px 25px',
                position: 'relative',
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: '1.29rem', lineHeight: 1,
                color: showRecord ? '#fffde7' : '#1a1000',
                boxShadow: `5px 5px 0 ${showRecord ? '#b84000' : '#1a1000'}`,
                transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                whiteSpace: 'nowrap',
              }}>
              {showRecord ? '收起 ▲' : '點我看紀錄 ▼'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
