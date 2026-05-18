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
      background: '#fffde7',
      height: `calc(100vh - var(--navbar-h, 58px))`,
      fontFamily: "'Noto Sans TC', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'row',
    }}>
      <style>{`
        @keyframes risoGrain { 0%,100%{opacity:.06} 50%{opacity:.09} }
        @keyframes bubbleFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-4px) rotate(-0.5deg)} }
        .riso-det-bubble::after {
          content:''; position:absolute; bottom:-18px; left:24px;
          border:9px solid transparent; border-top-color:#1a1000;
        }
        .riso-det-bubble::before {
          content:''; position:absolute; bottom:-14px; left:27px;
          border:6px solid transparent; border-top-color:#fffde7; z-index:1;
        }
        .riso-det-bubble-open::after { border-top-color: #b84000; }
        .riso-det-bubble-open::before { border-top-color: #e65100; }
      `}</style>

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")",
        pointerEvents: 'none', zIndex: 500,
        animation: 'risoGrain 6s ease-in-out infinite',
      }} />

      {/* ── LEFT COLUMN: header + map ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

        {/* Header buttons */}
        <div style={{
          padding: '0.8rem 1.2rem 0.5rem',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem',
          flexShrink: 0,
          background: 'rgba(255,253,231,0.95)',
          borderBottom: '2px solid rgba(230,81,0,0.2)',
        }}>
          {/* 成大山協 */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#e65100', color: '#fffde7',
              padding: '0.3rem 1rem', transform: 'rotate(-1deg)', display: 'inline-block',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem',
              letterSpacing: '0.2em', lineHeight: 1,
            }}>成大山協</div>
          </Link>

          {/* NCKU MTN. */}
          <div style={{
            background: '#0066cc', color: '#fffde7',
            padding: '0.2rem 0.7rem', transform: 'rotate(1.5deg)',
            fontSize: '0.65rem', letterSpacing: '0.2em',
            fontFamily: "'Bebas Neue', sans-serif",
          }}>NCKU MTN.</div>

          {/* GPX / KML track buttons */}
          {gpxPaths.map((p, i) => {
            const name = p.split('/').pop() ?? p
            const isActive = activeGpx === p
            return (
              <button key={p} onClick={() => setActiveGpx(p)}
                style={{
                  border: `2px solid #e65100`,
                  background: isActive ? '#e65100' : 'transparent',
                  color: isActive ? '#fffde7' : '#e65100',
                  padding: '0.25rem 0.7rem',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '0.78rem', letterSpacing: '0.12em',
                  cursor: 'pointer',
                  transform: `rotate(${GPX_ROTS[i % GPX_ROTS.length]}deg)`,
                  transition: 'background 0.15s, color 0.15s',
                  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                padding: '0.25rem 0.7rem',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.78rem', letterSpacing: '0.12em',
                textDecoration: 'none',
                display: 'inline-block',
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
                style={{
                  border: '2px solid #3a7d44',
                  background: isSelected ? '#3a7d44' : 'transparent',
                  color: isSelected ? '#fffde7' : '#3a7d44',
                  padding: '0.25rem 0.7rem',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '0.78rem', letterSpacing: '0.12em',
                  cursor: 'pointer',
                  transform: `rotate(${REC_ROTS[i % REC_ROTS.length]}deg)`,
                  transition: 'background 0.15s, color 0.15s',
                  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                {r.filename}
              </button>
            )
          })}
        </div>

        {/* Map area */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <RisoLeafletMap activeGpx={activeGpx} />
        </div>
      </div>

      {/* ── RIGHT COLUMN: orange panel ── */}
      <div style={{
        width: '38%', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        background: '#fffde7',
      }}>
        {/* Main orange quadrilateral */}
        <div style={{
          position: 'absolute', top: '-6%', left: '-10%',
          width: '110%', height: '75%',
          background: 'rgba(230,81,0,0.88)',
          transform: 'rotate(-2.5deg)',
          zIndex: 0,
        }} />
        {/* Deep orange accent quad */}
        <div style={{
          position: 'absolute', top: '28%', right: '-12%',
          width: '80%', height: '55%',
          background: 'rgba(180,55,0,0.75)',
          transform: 'rotate(3deg)',
          zIndex: 1,
        }} />
        {/* Yellow bottom accent */}
        <div style={{
          position: 'absolute', bottom: '-5%', left: '-5%',
          width: '70%', height: '30%',
          background: 'rgba(255,240,100,0.3)',
          transform: 'rotate(-1.5deg)',
          zIndex: 2,
        }} />

        {/* P1 image */}
        {p1Image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/preview?file=${encodeURIComponent(p1Image)}`}
            alt="P1"
            style={{
              position: 'absolute', top: '6%', left: '4%',
              width: '68%', maxWidth: 320,
              transform: 'rotate(-3.5deg)',
              zIndex: 3,
              boxShadow: '5px 5px 0 #7a2a00',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Expedition title overlay */}
        <div style={{
          position: 'absolute', bottom: '8%', left: '5%',
          zIndex: 5,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.4rem', letterSpacing: '0.15em',
          color: '#fffde7', lineHeight: 1.2,
          transform: 'rotate(-1.5deg)',
          textShadow: '2px 2px 0 #7a2a00',
          maxWidth: '85%',
        }}>
          {String(exp.name ?? '')}
        </div>

        {/* Date badge */}
        <div style={{
          position: 'absolute', bottom: '18%', right: '6%',
          zIndex: 5,
          fontFamily: "'Courier Prime', monospace",
          fontSize: '0.7rem', letterSpacing: '0.08em',
          color: 'rgba(255,253,231,0.85)',
          transform: 'rotate(2deg)',
          background: 'rgba(0,0,0,0.35)',
          padding: '3px 8px',
        }}>
          {String(exp.date_start ?? '')}
          {exp.date_end && exp.date_end !== exp.date_start ? ` — ${String(exp.date_end)}` : ''}
        </div>
      </div>

      {/* ── FIXED: 點我看紀錄 + record panel ── */}
      {records.length > 0 && (
        <>
          {/* Record content panel */}
          {showRecord && (
            <div style={{
              position: 'fixed', bottom: 90, left: 20,
              width: 360, maxHeight: 300,
              overflow: 'auto',
              background: '#fffde7',
              border: '3px solid #1a1000',
              boxShadow: '4px 4px 0 #1a1000',
              zIndex: 200,
              padding: '1rem 1.1rem',
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
              position: 'fixed', bottom: 28, left: 20, zIndex: 200,
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
