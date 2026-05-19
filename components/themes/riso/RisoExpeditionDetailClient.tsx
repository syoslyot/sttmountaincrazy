'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ThemeBadge } from '@/components/ThemeBadge'

const RisoLeafletMap = dynamic(
  () => import('@/components/RisoLeafletMap').then(m => m.RisoLeafletMap),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#fffde7' }} /> }
)

const REC_ROTS = [-0.5, 1.2, -1.0, 0.8]

interface Props {
  exp: Record<string, unknown>
  gpxPaths: string[]
  mapFiles: { file_path: string }[]
  records: { filename: string; content: string }[]
}

interface DropdownProps {
  label: string
  options: string[]
  onSelect: (i: number) => void
  color: string
  open: boolean
  onToggle: () => void
  rot?: number
}

function RisoDropdown({ label, options, onSelect, color, open, onToggle, rot = 0 }: DropdownProps) {
  return (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button
        onClick={onToggle}
        style={{
          border: `2px solid ${color}`,
          background: open ? color : 'transparent',
          color: open ? '#fffde7' : color,
          padding: '0.32rem 0.84rem',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '0.89rem', letterSpacing: '0.12em',
          cursor: 'pointer',
          transform: `rotate(${rot}deg)`,
        }}>
        {label} {open ? '▲' : '▼'}
      </button>
      {open && options.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: '#fffde7', border: `2px solid ${color}`, minWidth: '100%',
          boxShadow: `3px 3px 0 ${color}`,
        }}>
          {options.map((opt, i) => (
            <button key={i} onClick={() => { onSelect(i); onToggle() }}
              style={{
                display: 'block', width: '100%', padding: '0.25rem 0.6rem',
                fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.89rem',
                border: 'none', background: 'transparent', color, cursor: 'pointer',
                textAlign: 'left', letterSpacing: '0.08em',
              }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function RisoExpeditionDetailClient({ exp, gpxPaths, mapFiles, records }: Props) {
  const [activeGpx, setActiveGpx] = useState<string | null>(gpxPaths[0] ?? null)
  const [selectedRecord, setSelectedRecord] = useState<number>(0)
  const [showRecord, setShowRecord] = useState(true)
  const [gpxOpen, setGpxOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [recOpen, setRecOpen] = useState(false)
  const dropdownsRef = useRef<HTMLDivElement>(null)

  const pdfFiles = mapFiles.filter(f => f.file_path.toLowerCase().endsWith('.pdf'))
  const p1Image = exp.preview_image
    ? (String(exp.preview_image).split('/').pop() ?? null)
    : null

  const activeGpxName = activeGpx ? (activeGpx.split('/').pop() ?? activeGpx) : 'GPX'
  const activeRecName = records[selectedRecord]?.filename ?? '紀錄'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownsRef.current && !dropdownsRef.current.contains(e.target as Node)) {
        setGpxOpen(false)
        setPdfOpen(false)
        setRecOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
      `}</style>

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E\")",
        pointerEvents: 'none', zIndex: 1500,
        animation: 'risoGrain 6s ease-in-out infinite',
      }} />

      {/* ── TOP HEADER ROW ── */}
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

        {/* Dropdown group — outside-click handled by dropdownsRef */}
        <div ref={dropdownsRef} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', pointerEvents: 'auto' }}>
          {/* GPX dropdown */}
          {gpxPaths.length > 0 && (
            <RisoDropdown
              label={activeGpxName}
              options={gpxPaths.map(p => p.split('/').pop() ?? p)}
              color="#e65100"
              open={gpxOpen}
              onToggle={() => { setGpxOpen(o => !o); setPdfOpen(false); setRecOpen(false) }}
              onSelect={i => setActiveGpx(gpxPaths[i])}
              rot={-1.2}
            />
          )}

          {/* PDF dropdown */}
          {pdfFiles.length > 0 && (
            <RisoDropdown
              label="地圖 PDF"
              options={pdfFiles.map(f => f.file_path.split('/').pop() ?? f.file_path)}
              color="#e65100"
              open={pdfOpen}
              onToggle={() => { setPdfOpen(o => !o); setGpxOpen(false); setRecOpen(false) }}
              onSelect={i => window.open(`/api/pdf?file=${encodeURIComponent(pdfFiles[i].file_path)}`, '_blank')}
              rot={0.8}
            />
          )}

          {/* Records dropdown */}
          {records.length > 0 && (
            <RisoDropdown
              label={activeRecName}
              options={records.map(r => r.filename)}
              color="#3a7d44"
              open={recOpen}
              onToggle={() => { setRecOpen(o => !o); setGpxOpen(false); setPdfOpen(false) }}
              onSelect={i => setSelectedRecord(i)}
              rot={-0.5}
            />
          )}
        </div>
      </div>

      {/* ── CONTENT ROW: map + right panel ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', position: 'relative' }}>

        {/* Map area */}
        <div style={{ flex: 1, maxWidth: '55%', minWidth: 0, zIndex: 1, marginTop: '10px', marginLeft: '180px' }}>
          <RisoLeafletMap activeGpx={activeGpx} />
        </div>

        {/* Right panel: one orange quad + one big image (overflows into map) */}
        <div style={{
          width: '36%', flexShrink: 0, marginLeft: 'auto',
          position: 'relative',
          overflow: 'visible',
          zIndex: 5,
        }}>
          {/* Orange quad */}
          <div style={{
            position: 'absolute',
            width: '80%', height: '52%',
            top: '-6%', right: '-6%', left: 'auto', bottom: 'auto',
            background: 'rgba(230,81,0,0.35)',
            transform: 'rotate(-4deg)',
            zIndex: 0,
            pointerEvents: 'none',
          }} />

          {/* P1 image */}
          {p1Image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/preview?file=${encodeURIComponent(p1Image)}`}
              alt="隊伍資訊"
              style={{
                position: 'absolute',
                top: 'calc(-10% + 25px)',
                right: 30,
                width: '95%',
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

      {/* ── FIXED: 點我看紀錄 + record panel ── */}
      {records.length > 0 && (
        <>
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

      {/* Item 8: ThemeBadge visible above overlay (zIndex 9001 > 1000) */}
      <ThemeBadge />
    </div>
  )
}
