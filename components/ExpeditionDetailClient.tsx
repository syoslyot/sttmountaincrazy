'use client'

import dynamic from 'next/dynamic'
import { useTheme } from './ThemeProvider'

const LeafletMap = dynamic(() => import('./LeafletMap').then(m => m.LeafletMap), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: 'var(--bg-alt)' }} />,
})

const RisoExpeditionDetailClient = dynamic(
  () => import('./themes/riso/RisoExpeditionDetailClient').then(m => m.RisoExpeditionDetailClient),
  { ssr: false }
)

interface Props {
  exp: Record<string, unknown>
  gpxPaths: string[]
  mapFiles: { file_path: string }[]
  records: { filename: string; content: string }[]
}

export function ExpeditionDetailClient({ exp, gpxPaths, mapFiles, records }: Props) {
  const theme = useTheme()
  if (theme === 'riso') {
    return <RisoExpeditionDetailClient exp={exp} gpxPaths={gpxPaths} mapFiles={mapFiles} records={records} />
  }
  const dateStr = exp.date_end && exp.date_end !== exp.date_start
    ? `${exp.date_start} — ${exp.date_end}`
    : String(exp.date_start ?? '')

  const location = [exp.county, exp.region].filter(Boolean).join(' · ')

  return (
    <div className="detail-layout">
      {/* ── 左側：地圖 ── */}
      <div className="detail-map">
        <LeafletMap gpxPaths={gpxPaths} />
      </div>

      {/* ── 右側：資訊 ── */}
      <div className="detail-info">
        <h1 className="detail-title">{String(exp.name ?? '')}</h1>

        <div className="detail-meta-row">📅 {dateStr}</div>
        {location && <div className="detail-meta-row">📍 {location}</div>}
        {!!exp.leader && <div className="detail-meta-row">👤 隊長：{String(exp.leader)}</div>}

        {!!exp.description && (
          <>
            <div className="detail-section-title">出隊說明</div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>{String(exp.description)}</p>
          </>
        )}

        {records.length > 0 && (
          <>
            <div className="detail-section-title">紀錄</div>
            {records.map(r => (
              <details key={r.filename} style={{ marginBottom: '0.5rem' }}>
                <summary style={{ fontSize: '0.82rem', cursor: 'pointer', color: 'var(--accent)' }}>
                  {r.filename}
                </summary>
                <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', marginTop: '0.5rem', color: 'var(--fg-muted)' }}>
                  {r.content}
                </pre>
              </details>
            ))}
          </>
        )}

        {gpxPaths.length > 0 && (
          <>
            <div className="detail-section-title">軌跡下載</div>
            {gpxPaths.map(p => {
              const name = p.split('/').pop() ?? p
              return (
                <a
                  key={p}
                  href={`/api/gpx?file=${encodeURIComponent(name)}`}
                  download={name}
                  style={{ display: 'block', fontSize: '0.82rem', color: 'var(--accent)', marginBottom: '0.25rem' }}
                >
                  ↓ {name}
                </a>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
