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
      flexDirection: 'row',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes risoGrain { 0%,100%{opacity:.06} 50%{opacity:.09} }
        @keyframes bubbleFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-4px) rotate(-0.5deg)} }
        .riso-det-bubble::after {
          content:''; position:absolute; bottom:-18px; left:20px;
          border:9px solid transparent; border-top-color:#1a1000;
        }
        .riso-det-bubble::before {
          content:''; position:absolute; bottom:-14px; left:23px;
          border:6px solid transparent; border-top-color:#fffde7; z-index:1;
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

      {/* ── LEFT COLUMN: buttons ── */}
      <div style={{
        width: 160, flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: '0.45rem',
        padding: '0.9rem 0.6rem',
        overflowY: 'auto',
        background: 'rgba(255,253,231,0.97)',
        borderRight: '2px solid rgba(230,81,0,0.18)',
        zIndex: 2,
      }}>
        {/* 成大山協 */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#e65100', color: '#fffde7',
            padding: '0.35rem 0.6rem',
            transform: 'rotate(-1deg)',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.35rem', letterSpacing: '0.18em', lineHeight: 1,
            textAlign: 'center',
          }}>成大山協</div>
        </Link>

        {/* NCKU MTN. */}
        <div style={{
          background: '#0066cc', color: '#fffde7',
          padding: '0.2rem 0.5rem',
          transform: 'rotate(1.5deg)',
          fontSize: '0.6rem', letterSpacing: '0.2em',
          fontFamily: "'Bebas Neue', sans-serif",
          textAlign: 'center',
        }}>NCKU MTN.</div>

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
                padding: '0.25rem 0.4rem',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.72rem', letterSpacing: '0.1em',
                cursor: 'pointer',
                transform: `rotate(${GPX_ROTS[i % GPX_ROTS.length]}deg)`,
                width: '100%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
              padding: '0.25rem 0.4rem',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '0.72rem', letterSpacing: '0.1em',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
              transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)`,
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
                padding: '0.25rem 0.4rem',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.72rem', letterSpacing: '0.1em',
                cursor: 'pointer',
                transform: `rotate(${REC_ROTS[i % REC_ROTS.length]}deg)`,
                width: '100%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
              {r.filename}
            </button>
          )
        })}
      </div>

      {/* ── CENTER COLUMN: map ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <RisoLeafletMap activeGpx={activeGpx} />
      </div>

      {/* ── RIGHT COLUMN: P1/P2 images only ── */}
      <div style={{
        width: '32%', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Main orange quadrilateral */}
        <div style={{
          position: 'absolute', top: '-6%', left: '-12%',
          width: '115%', height: '80%',
          background: 'rgba(230,81,0,0.9)',
          transform: 'rotate(-2.5deg)',
          zIndex: 0,
        }} />
        {/* Deep orange accent quad */}
        <div style={{
          position: 'absolute', top: '25%', right: '-15%',
          width: '85%', height: '65%',
          background: 'rgba(175,52,0,0.78)',
          transform: 'rotate(3.2deg)',
          zIndex: 1,
        }} />

        {/* P1 image */}
        {p1Image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/preview?file=${encodeURIComponent(p1Image)}`}
            alt="P1"
            style={{
              position: 'absolute', top: '5%', left: '3%',
              width: '85%',
              transform: 'rotate(-3.5deg)',
              zIndex: 3,
              boxShadow: '6px 6px 0 #7a2a00',
              objectFit: 'contain',
            }}
          />
        )}

        {/* P2 image placeholder area (same image slightly offset for visual depth) */}
        {p1Image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/preview?file=${encodeURIComponent(p1Image)}`}
            alt="P2"
            style={{
              position: 'absolute', top: '42%', left: '10%',
              width: '85%',
              transform: 'rotate(2.5deg)',
              zIndex: 2,
              boxShadow: '6px 6px 0 #3a1500',
              objectFit: 'contain',
              opacity: 0.92,
            }}
          />
        )}
      </div>

      {/* ── FIXED: 點我看紀錄 + record panel ── */}
      {records.length > 0 && (
        <>
          {/* Record content panel */}
          {showRecord && (
            <div style={{
              position: 'fixed', bottom: 82, left: 170,
              width: 432,
              maxHeight: 510,
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

          {/* 點我看紀錄 trigger button */}
          <div
            onClick={() => setShowRecord(p => !p)}
            style={{
              position: 'fixed', bottom: 24, left: 170, zIndex: 1100,
              pointerEvents: 'auto', cursor: 'pointer',
              animation: 'bubbleFloat 3.5s ease-in-out infinite',
            }}
          >
            <div
              className={showRecord ? 'riso-det-bubble riso-det-bubble-open' : 'riso-det-bubble'}
              style={{
                background: showRecord ? '#e65100' : '#fffde7',
                border: `3px solid ${showRecord ? '#b84000' : '#1a1000'}`,
                padding: '10px 18px',
                position: 'relative',
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: '0.95rem', lineHeight: 1,
                color: showRecord ? '#fffde7' : '#1a1000',
                boxShadow: `4px 4px 0 ${showRecord ? '#b84000' : '#1a1000'}`,
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
