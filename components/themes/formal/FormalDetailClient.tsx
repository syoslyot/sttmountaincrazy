'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { openFile } from '@/lib/openFile'
import { ThemeBadge } from '@/components/ThemeBadge'
import type { ExpeditionDetail, GpxFile, MapFile, RecordFile } from '@/lib/supabase'
import './formal.css'

const FormalLeafletMap = dynamic(
  () => import('@/components/themes/rocket/RocketLeafletMap').then(m => m.RocketLeafletMap),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: 'var(--map-bg)' }} /> }
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
      {/* Header */}
      <header style={{
        padding: '14px 36px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0,
      }}>
        <Link href="/formal" style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
          letterSpacing: '.1em', textDecoration: 'none',
        }}>← 返回索引</Link>

        {grade && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '.1em' }}>
            {grade}級
          </span>
        )}

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: '.01em' }}>
          {exp.name}
        </h1>

        {(exp.county || exp.region) && (
          <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--muted)' }}>
            {exp.county}{exp.region ? `·${exp.region}` : ''}
            {exp.region_exit && <> <span style={{ color: 'var(--accent)' }}>→</span> {exp.region_exit}</>}
          </span>
        )}

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.04em' }}>
            {exp.date_start}{exp.date_end ? ` – ${exp.date_end}` : ''}
            {days ? ` · ${days}D` : ''}
            {exp.leader ? ` · 領隊 ${exp.leader}` : ''}
          </span>
          <ThemeBadge containerStyle={{ display: 'flex', gap: '0.5rem', position: 'static' }} />
        </span>
      </header>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <FormalLeafletMap
          activeGpxes={activeGpxes}
          colorMap={colorMap}
          entryTown={exp.region}
          entryCounty={exp.county}
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
    </div>
  )
}
