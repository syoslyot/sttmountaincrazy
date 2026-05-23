'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
        width: '100%', padding: open ? '11px 16px 9px' : '9px 16px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        borderBottom: open ? '0.5px solid var(--border)' : 'none',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.2em',
        color: 'var(--muted)', textAlign: 'left',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>{title}</span>
          {badge && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)',
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
      {open && <div style={{ padding: '9px 16px 13px' }}>{children}</div>}
    </div>
  )
}

// ─── DLRow ────────────────────────────────────────────────────────────────────

function DLRow({ label, filename, filePath, bucket }: {
  label: string; filename: string; filePath: string | null; bucket: 'records' | 'maps' | 'previews'
}) {
  if (!filePath) return null
  return (
    <div onClick={() => openFile(filePath, filename, bucket)}
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'baseline',
        padding: '6px 0', borderBottom: '0.5px dotted var(--border)', cursor: 'pointer',
      }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em',
                     color: 'var(--accent)', paddingRight: 4 }}>{label.toUpperCase()}</span>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 12.5,
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
    exp.gpx_files.length > 0 ? [exp.gpx_files[0].file_path] : []
  )
  const [tileLayer, setTileLayer] = useState<TileLayerKey>('emap')
  const [elevPoints, setElevPoints] = useState<ElevPoint[]>([])
  const [mobileSheet, setMobileSheet] = useState<'elev' | 'gpx' | 'dl'>('elev')
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches
  )
  const mapHoverRef = useRef<((pt: ElevPoint) => void) | undefined>(undefined)
  const mapLeaveRef = useRef<(() => void) | undefined>(undefined)
  const handleElevationData = useCallback((pts: ElevPoint[]) => setElevPoints(pts), [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 680px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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
  const previewBasename = exp.preview_image ? exp.preview_image.split('/').pop() ?? null : null
  const previewFilename = `${exp.name.replace(PREFIX_RE, '')}.png`
  const hasFiles = exp.map_files.length + exp.records.length > 0 || !!previewBasename

  return (
    <div className="formal-root">
      {isMobile ? (
        <>
          <header style={{ padding: '8px 22px 12px', borderBottom: '0.5px solid var(--border)',
                           display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/formal" style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--muted)',
                                          letterSpacing: '.06em', textDecoration: 'none', flexShrink: 0 }}>←</Link>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 500, margin: 0,
                         flex: 1, minWidth: 0, letterSpacing: '.01em',
                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exp.name}
            </h1>
          </header>
          <div style={{ padding: '6px 18px 8px', borderBottom: '0.5px solid var(--border)',
                        display: 'flex', gap: 10, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted)' }}>
            <span style={{ color: 'var(--fg)' }}>
              {exp.date_start.slice(5)}{exp.date_end ? ` → ${exp.date_end.slice(5)}` : ''}
            </span>
            <span>/</span>
            <span>
              {exp.county || ''}{exp.region ? `${exp.region}` : ''}
              {(exp.county_exit || exp.region_exit) && (
                <> <span style={{ color: 'var(--accent)' }}>→</span> {exp.county_exit || ''}{exp.region_exit ? `${exp.region_exit}` : ''}</>
              )}
            </span>
            {exp.leader && <span style={{ marginLeft: 'auto' }}>領隊 {exp.leader.length > 5 ? '？' : exp.leader}</span>}
          </div>
        </>
      ) : (
        <>
          {/* Header row 1: back | NO. | name | date */}
          <header className="formal-detail-header">
            <Link href="/formal" style={{
              fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--muted)',
              letterSpacing: '.08em', textDecoration: 'none', flexShrink: 0,
            }}>← 返回</Link>

            <h1 style={{
              fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, margin: 0,
              letterSpacing: '.01em', flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {exp.name}
            </h1>

            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.55, color: 'var(--muted)',
                           letterSpacing: '.04em', flexShrink: 0 }}>
              {exp.date_start}{exp.date_end ? ` – ${exp.date_end}` : ''}
              {days ? ` · ${days}D` : ''}
            </span>
          </header>

          {/* Stats bar: region · leader · grade | tile switcher */}
          <div className="formal-detail-stats">
        <div className="formal-detail-stats-left">
          {(exp.county || exp.region) && (() => {
            const samePlace = exp.county === exp.county_exit && exp.region === exp.region_exit
            const hasExit = exp.region_exit && !samePlace
            return (
              <span>
                {exp.county}{exp.region}
                {hasExit && (
                  <>
                    {' '}<span style={{ color: 'var(--accent)' }}> → </span>{' '}
                    {exp.county_exit}{exp.region_exit}
                  </>
                )}
              </span>
            )
          })()}
          {exp.leader && (
            <span style={{ color: 'var(--muted)' }}>
              領隊{' '}<span style={{ color: 'var(--fg)' }}>{exp.leader.length > 5 ? '？' : exp.leader}</span>
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
          {([
            ['topo', '地形'], ['emap', 'EMAP'], ['sat', '衛星'],
            ['osm', 'OSM'], ['carto', 'Carto'], ['stamen', 'Terrain'],
          ] as [TileLayerKey, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTileLayer(key)} style={{
              background: tileLayer === key ? 'var(--accent)' : 'transparent',
              color: tileLayer === key ? 'var(--bg)' : 'var(--muted)',
              border: `0.5px solid ${tileLayer === key ? 'var(--accent)' : 'var(--border)'}`,
              padding: '3px 8px',
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.06em',
              cursor: 'pointer',
            }}>
              {label}
            </button>
          ))}
        </div>
          </div>
        </>
      )}

      {/* Map */}
      <div className="formal-map-area">
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

        {/* Desktop: GPX selector */}
        {!isMobile && exp.gpx_files.length > 0 && (
          <CollapsiblePanel
            title="航跡 GPX/KML"
            badge={`${activeGpxes.length}/${exp.gpx_files.length}`}
            defaultOpen={false}
            style={{ top: 12, left: 12, width: 'clamp(160px, 44vw, 240px)' }}>
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
                <span style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 13,
                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.filename}
                </span>
              </label>
            ))}
          </CollapsiblePanel>
        )}

        {/* Desktop: Downloads */}
        {!isMobile && hasFiles && (
          <CollapsiblePanel
            title="下載"
            badge={String((previewBasename ? 1 : 0) + exp.map_files.length + exp.records.length)}
            defaultOpen={false}
            style={{ top: 12, right: 12, width: 'clamp(130px, 38vw, 260px)' }}>
            {previewBasename && (
              <DLRow label="直企" filename={previewFilename} filePath={previewBasename} bucket="previews" />
            )}
            {exp.map_files.map(f => (
              <DLRow key={f.file_path} label="地圖" filename={f.filename} filePath={f.file_path} bucket="maps" />
            ))}
            {exp.records.map(f => (
              <DLRow key={f.file_path} label="紀錄" filename={f.filename} filePath={f.file_path ?? null} bucket="records" />
            ))}
          </CollapsiblePanel>
        )}

        {/* Mobile: top-left stats overlay */}
        {isMobile && elevPoints.length >= 2 && activeGpxes.length === 1 && (() => {
          const eles = elevPoints.map(p => p.ele)
          const maxDist = elevPoints[elevPoints.length - 1].dist
          const maxE = Math.max(...eles)
          let gain = 0, prev = elevPoints[0].ele
          for (let i = 1; i < elevPoints.length; i++) {
            const d = elevPoints[i].ele - prev
            if (d > 5) { gain += d; prev = elevPoints[i].ele }
            else if (Math.abs(d) > 5) prev = elevPoints[i].ele
          }
          return (
            <div style={{
              position: 'absolute', top: 10, left: 10, zIndex: 1000,
              background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              border: '0.5px solid var(--border)',
              padding: '5px 10px',
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)',
              display: 'flex', gap: 10, letterSpacing: '.04em',
            }}>
              <span><span style={{ color: 'var(--accent)' }}>↔</span> <span style={{ color: 'var(--fg)' }}>{(maxDist/1000).toFixed(1)}</span>k</span>
              <span><span style={{ color: 'var(--accent)' }}>↑</span> <span style={{ color: 'var(--fg)' }}>{Math.round(gain)}</span></span>
              <span><span style={{ color: 'var(--accent)' }}>▲</span> <span style={{ color: 'var(--fg)' }}>{Math.round(maxE)}</span></span>
            </div>
          )
        })()}

        {/* Mobile: bottom sheet */}
        {isMobile && (
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000,
            background: 'color-mix(in oklch, var(--bg) 95%, transparent)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            borderTop: '0.5px solid var(--border)',
          }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
              {([
                ['elev', '海拔圖'],
                ...(exp.gpx_files.length > 0 ? [['gpx', 'gpx / kml']] : []),
                ...(hasFiles ? [['dl', '下載']] : []),
              ] as ['elev' | 'gpx' | 'dl', string][]).map(([v, l]) => (
                <button key={v} onClick={() => setMobileSheet(v)}
                  style={{
                    flex: 1, padding: '9px 0',
                    background: 'transparent', border: 'none',
                    borderBottom: mobileSheet === v ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    fontFamily: 'var(--serif)', fontSize: 12,
                    color: mobileSheet === v ? 'var(--fg)' : 'var(--muted)',
                    cursor: 'pointer',
                  }}>{l}</button>
              ))}
            </div>
            {/* Sheet content */}
            <div style={{ padding: '10px 14px', height: 136, boxSizing: 'border-box', overflow: 'hidden' }}>
              {mobileSheet === 'elev' && elevPoints.length >= 2 && activeGpxes.length === 1 && (
                <FormalElevationChart
                  points={elevPoints}
                  onHover={pt => mapHoverRef.current?.(pt)}
                  onLeave={() => mapLeaveRef.current?.()}
                  height={116}
                />
              )}
              {mobileSheet === 'elev' && (elevPoints.length < 2 || activeGpxes.length !== 1) && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
                              letterSpacing: '.1em', padding: '8px 0', textAlign: 'center' }}>
                  {activeGpxes.length === 0 ? '未選取航跡' : activeGpxes.length > 1 ? '選取單一航跡以顯示剖面圖' : '載入中…'}
                </div>
              )}
              {mobileSheet === 'gpx' && (
                <div>
                  {exp.gpx_files.map((f, i) => (
                    <label key={f.file_path} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                      borderBottom: i < exp.gpx_files.length - 1 ? '0.5px dotted var(--border)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <input type="checkbox"
                        checked={activeGpxes.includes(f.file_path)}
                        onChange={() => toggleGpx(f.file_path)}
                        style={{ accentColor: colorMap[f.file_path], width: 11, height: 11,
                                 borderRadius: 0, cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ width: 11, height: 11, background: colorMap[f.file_path], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 13,
                                     overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.filename}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {mobileSheet === 'dl' && (
                <div>
                  {previewBasename && (
                    <DLRow label="直企" filename={previewFilename} filePath={previewBasename} bucket="previews" />
                  )}
                  {exp.map_files.map(f => (
                    <DLRow key={f.file_path} label="地圖" filename={f.filename} filePath={f.file_path} bucket="maps" />
                  ))}
                  {exp.records.map(f => (
                    <DLRow key={f.file_path} label="紀錄" filename={f.filename} filePath={f.file_path ?? null} bucket="records" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Desktop: elevation chart — z-layer at bottom-center of map */}
        {!isMobile && elevPoints.length >= 2 && activeGpxes.length === 1 && (
          <div style={{
            position: 'absolute', bottom: 0,
            left: '50%', transform: 'translateX(-50%)',
            width: '50%', zIndex: 1000,
          }}>
            <FormalElevationChart
              points={elevPoints}
              onHover={pt => mapHoverRef.current?.(pt)}
              onLeave={() => mapLeaveRef.current?.()}
              showHeader
              style={{
                background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
