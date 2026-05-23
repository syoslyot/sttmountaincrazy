'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { openFile } from '@/lib/openFile'
import type { ExpeditionDetail } from '@/lib/supabase'
import type { TileLayerKey } from '@/components/themes/formal/FormalLeafletMap'
import { FormalElevationChart, type ElevPoint } from '@/components/themes/formal/FormalElevationChart'
import './formal.css'

const FormalLeafletMap = dynamic(
  () => import('@/components/themes/formal/FormalLeafletMap').then(m => m.FormalLeafletMap),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: 'var(--surface)' }} /> }
)

const TRACK_COLORS = ['#9b4f1c', '#0055a5', '#3a7d44', '#6d2a7c', '#8b0000', '#00695c']

const PREFIX_RE = /^[\[［](\d+)([ABCDabcd])(活|探|溯|雪|訓|勘)[\]］]\s*/

function parseGrade(name: string): string | null {
  const m = PREFIX_RE.exec(name)
  return m ? m[2].toUpperCase() : null
}

function calcDays(start: string, end: string | null) {
  if (!end) return null
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  return d > 0 ? d + 1 : null
}

// ─── CollapsiblePanel ─────────────────────────────────────────────────────────

function CollapsiblePanel({
  title, badge, defaultOpen = true, children, style,
}: {
  title: string; badge?: string; defaultOpen?: boolean
  children: React.ReactNode; style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      position: 'absolute',
      zIndex: 1000,
      background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      border: '0.5px solid var(--border)',
      ...style,
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: open ? '10px 14px 8px' : '8px 14px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        borderBottom: open ? '0.5px solid var(--border)' : 'none',
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.2em',
        color: 'var(--muted)', textAlign: 'left',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>{title}</span>
          {badge && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)',
                           letterSpacing: '.06em', borderLeft: '0.5px solid var(--border)', paddingLeft: 8 }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)',
                       display: 'inline-block', lineHeight: 1,
                       transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}>
          ▾
        </span>
      </button>
      {open && <div style={{ padding: '8px 14px 12px' }}>{children}</div>}
    </div>
  )
}

// ─── DLRow ────────────────────────────────────────────────────────────────────

function DLRow({ label, filename, filePath, bucket }: {
  label: string; filename: string; filePath: string | null; bucket: 'records' | 'maps'
}) {
  if (!filePath) return null
  return (
    <div onClick={() => openFile(filePath, filename, bucket)}
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'baseline',
        padding: '6px 0', borderBottom: '0.5px dotted var(--border)', cursor: 'pointer',
      }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em',
                     color: 'var(--accent)', paddingRight: 4 }}>{label.toUpperCase()}</span>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 11.5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filename}
        </div>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>↓</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FormalDetailClient({ exp }: { exp: ExpeditionDetail }) {
  const [activeGpxes, setActiveGpxes] = useState<string[]>(
    exp.gpx_files.map(f => f.file_path)
  )
  const [tileLayer, setTileLayer] = useState<TileLayerKey>('topo')
  const [elevPoints, setElevPoints] = useState<ElevPoint[]>([])
  const mapHoverRef = useRef<((pt: ElevPoint) => void) | undefined>(undefined)
  const mapLeaveRef = useRef<(() => void) | undefined>(undefined)
  const handleElevationData = useCallback((pts: ElevPoint[]) => setElevPoints(pts), [])

  const colorMap: Record<string, string> = {}
  exp.gpx_files.forEach((f, i) => {
    colorMap[f.file_path] = TRACK_COLORS[i % TRACK_COLORS.length]
  })

  const toggleGpx = (path: string) => {
    setActiveGpxes(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    )
  }

  const grade = parseGrade(exp.name)
  const days = calcDays(exp.date_start, exp.date_end)
  const hasFiles = exp.map_files.length + exp.records.length > 0

  return (
    <div className="formal-root">
      {/* Header row 1: back | NO. | name | date */}
      <header style={{
        padding: '12px 36px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0,
      }}>
        <Link href="/formal" style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
          letterSpacing: '.1em', textDecoration: 'none', flexShrink: 0,
        }}>← 返回索引</Link>

        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
                       letterSpacing: '.1em', flexShrink: 0 }}>
          NO.{String(exp.id).padStart(3, '0')}
        </span>

        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, margin: 0,
          letterSpacing: '.01em', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {exp.name}
        </h1>

        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
                       letterSpacing: '.04em', flexShrink: 0 }}>
          {exp.date_start}{exp.date_end ? ` – ${exp.date_end}` : ''}
          {days ? ` · ${days}D` : ''}
        </span>
      </header>

      {/* Stats bar: region · leader · grade | tile switcher */}
      <div style={{
        padding: '8px 36px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, gap: 24, minHeight: 38,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20,
                      fontFamily: 'var(--serif)', fontSize: 13 }}>
          {(exp.county || exp.region) && (
            <span>
              {exp.county}{exp.region ? `·${exp.region}` : ''}
              {exp.region_exit && (
                <> <span style={{ color: 'var(--accent)' }}>→</span>{' '}{exp.region_exit}</>
              )}
            </span>
          )}
          {exp.leader && (
            <span style={{ color: 'var(--muted)' }}>
              領隊{' '}<span style={{ color: 'var(--fg)' }}>{exp.leader}</span>
            </span>
          )}
          {grade && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11,
                           color: 'var(--accent)', letterSpacing: '.06em' }}>
              {grade}級
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)',
                         letterSpacing: '.15em' }}>底圖</span>
          {(['topo', 'sat', 'osm'] as TileLayerKey[]).map(key => (
            <button key={key} onClick={() => setTileLayer(key)} style={{
              background: tileLayer === key ? 'var(--accent)' : 'transparent',
              color: tileLayer === key ? 'var(--bg)' : 'var(--muted)',
              border: `0.5px solid ${tileLayer === key ? 'var(--accent)' : 'var(--border)'}`,
              padding: '3px 10px',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em',
              cursor: 'pointer',
            }}>
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <FormalLeafletMap
          activeGpxes={activeGpxes}
          colorMap={colorMap}
          entryTown={exp.region}
          entryCounty={exp.county}
          tileLayer={tileLayer}
          onElevationData={handleElevationData}
          mapHoverRef={mapHoverRef}
          mapLeaveRef={mapLeaveRef}
        />

        {/* GPX selector */}
        {exp.gpx_files.length > 0 && (
          <CollapsiblePanel
            title="航跡 GPX"
            badge={`${activeGpxes.length}/${exp.gpx_files.length}`}
            style={{ top: 16, left: 16, width: 240 }}>
            {exp.gpx_files.map((f, i) => (
              <label key={f.file_path} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                borderBottom: i < exp.gpx_files.length - 1 ? '0.5px dotted var(--border)' : 'none',
                cursor: 'pointer',
              }}>
                <input type="checkbox"
                  checked={activeGpxes.includes(f.file_path)}
                  onChange={() => toggleGpx(f.file_path)}
                  style={{ accentColor: colorMap[f.file_path] }}
                />
                <span style={{ width: 10, height: 10, background: colorMap[f.file_path], flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 12,
                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.filename}
                </span>
              </label>
            ))}
          </CollapsiblePanel>
        )}

        {/* Downloads */}
        {hasFiles && (
          <CollapsiblePanel
            title="下載"
            badge={String(exp.map_files.length + exp.records.length)}
            defaultOpen={false}
            style={{ top: 16, right: 16, width: 260 }}>
            {exp.map_files.map(f => (
              <DLRow key={f.file_path} label="地圖" filename={f.filename} filePath={f.file_path} bucket="maps" />
            ))}
            {exp.records.map(f => (
              <DLRow key={f.file_path} label="紀錄" filename={f.filename} filePath={f.file_path ?? null} bucket="records" />
            ))}
          </CollapsiblePanel>
        )}
      </div>

      {/* Elevation chart — outside the map container, full-width section */}
      {elevPoints.length >= 2 && activeGpxes.length === 1 && (
        <FormalElevationChart
          points={elevPoints}
          onHover={pt => mapHoverRef.current?.(pt)}
          onLeave={() => mapLeaveRef.current?.()}
        />
      )}
    </div>
  )
}
