'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import './cool.css'

interface ExpData {
  id: number
  name: string
  date_start: string
  date_end: string | null
  region: string | null
  region_exit: string | null
  leader: string | null
  description: string | null
  preview_image: string | null
}

interface RecordItem { filename: string; content: string }

interface Props {
  exp: ExpData
  gpxPaths: string[]
  records: RecordItem[]
  mapFiles: { file_path: string }[]
}

function fmtDate(d: string | null | undefined): string {
  return d ? d.replace(/-/g, '.') : ''
}

function regionLabel(exp: ExpData): string {
  const r = exp.region, rx = exp.region_exit
  if (!r && !rx) return ''
  if (!rx || r === rx) return r ?? ''
  return `${r} → ${rx}`
}

function daysSpan(dateStart: string, dateEnd: string | null): number {
  if (!dateEnd) return 1
  const diff = new Date(dateEnd).getTime() - new Date(dateStart).getTime()
  return Math.max(1, Math.round(diff / 86400000) + 1)
}

function parseGpxCool(text: string): { latlngs: [number, number][]; waypoints: { lat: number; lng: number; name: string }[] } {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const pts = Array.from(doc.querySelectorAll('trkpt'))
  const latlngs: [number, number][] = pts.map(p => [
    parseFloat(p.getAttribute('lat') ?? '0'),
    parseFloat(p.getAttribute('lon') ?? '0'),
  ])
  const waypoints = Array.from(doc.querySelectorAll('wpt')).map(w => ({
    lat: parseFloat(w.getAttribute('lat') ?? '0'),
    lng: parseFloat(w.getAttribute('lon') ?? '0'),
    name: w.querySelector('name')?.textContent ?? '',
  })).filter(w => w.name)
  return { latlngs, waypoints }
}

function parseKmlCool(text: string): { latlngs: [number, number][]; waypoints: { lat: number; lng: number; name: string }[] } {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const coordNodes = Array.from(doc.querySelectorAll('coordinates'))
  const latlngs: [number, number][] = []
  for (const node of coordNodes) {
    for (const tuple of (node.textContent ?? '').trim().split(/\s+/)) {
      const parts = tuple.split(',').map(Number)
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) latlngs.push([parts[1], parts[0]])
    }
  }
  return { latlngs, waypoints: [] }
}

function CoolMap({ gpxPaths }: { gpxPaths: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(async L => {
      if (cancelled || !containerRef.current) return
      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors, © CARTO',
      }).addTo(map)

      if (gpxPaths.length > 0) {
        const filename = gpxPaths[0].split('/').pop() ?? gpxPaths[0]
        const isKml = filename.toLowerCase().endsWith('.kml')
        try {
          const res = await fetch(`/api/gpx?file=${encodeURIComponent(filename)}`)
          if (!res.ok || cancelled) { map.setView([23.5, 121], 7); return }
          const text = await res.text()
          if (cancelled) return

          const { latlngs, waypoints } = isKml ? parseKmlCool(text) : parseGpxCool(text)
          if (latlngs.length === 0) { map.setView([23.5, 121], 7); return }

          const track = L.polyline(latlngs, { color: '#ff006e', weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(map)

          const mkStart = L.divIcon({
            className: '',
            html: '<div style="background:#ff006e;color:white;padding:4px 8px;font-weight:900;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:13px;">起</div>',
            iconSize: [40, 30], iconAnchor: [20, 15],
          })
          const mkEnd = L.divIcon({
            className: '',
            html: '<div style="background:#1a0030;color:#ffd60a;padding:4px 8px;font-weight:900;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:13px;">終</div>',
            iconSize: [40, 30], iconAnchor: [20, 15],
          })
          L.marker(latlngs[0], { icon: mkStart }).addTo(map)
          L.marker(latlngs[latlngs.length - 1], { icon: mkEnd }).addTo(map)

          waypoints.forEach(w => {
            const icon = L.divIcon({
              className: '',
              html: `<div style="background:white;color:#1a0030;padding:3px 8px;font-weight:700;font-size:12px;border:2px solid #ff006e;white-space:nowrap;">▲ ${w.name}</div>`,
              iconSize: [80, 24], iconAnchor: [40, 12],
            })
            L.marker([w.lat, w.lng], { icon }).addTo(map)
          })

          map.fitBounds(track.getBounds(), { padding: [40, 40] })
        } catch {
          map.setView([23.5, 121], 7)
        }
      } else {
        map.setView([23.5, 121], 7)
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [gpxPaths])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}


function FloatingRecordWindow({ record, tripTitle, index, total, onClose, onSwitch, records }: {
  record: RecordItem
  tripTitle: string
  index: number
  total: number
  onClose: () => void
  onSwitch: (i: number) => void
  records: RecordItem[]
}) {
  const [pos, setPos] = useState(() => {
    const w = Math.min(460, window.innerWidth - 40)
    return { x: Math.max(20, window.innerWidth - w - 32), y: 60 }
  })
  const [minimized, setMinimized] = useState(false)
  const dragRef = useRef({ active: false, dx: 0, dy: 0 })
  const winRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.d-modal-close, .d-modal-switch')) return
    dragRef.current = { active: true, dx: e.clientX - winRef.current!.getBoundingClientRect().left, dy: e.clientY - winRef.current!.getBoundingClientRect().top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    setPos({
      x: Math.max(-100, Math.min(window.innerWidth - 80, e.clientX - dragRef.current.dx)),
      y: Math.max(0, e.clientY - dragRef.current.dy),
    })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
  }

  const ext = record.filename.split('.').pop() ?? 'txt'
  const displayName = record.filename.replace(/\.(docx|txt|pdf)$/, '')

  return (
    <div ref={winRef} className={`d-float-window ${minimized ? 'minimized' : ''}`} style={{ left: pos.x, top: pos.y }}>
      <div className="d-modal-bar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <span className="d-modal-dot d1" title="關閉" onClick={onClose} />
        <span className="d-modal-dot d2" title={minimized ? '展開' : '收起'} onClick={() => setMinimized(m => !m)} />
        <span className="d-modal-dot d3" />
        <span className="d-modal-title">{displayName} .{ext}</span>
        <span className="d-modal-grip">⋮⋮ 拖我</span>
        <button className="d-modal-close" onClick={onClose}>✕</button>
      </div>
      {!minimized && (
        <div className="d-modal-body">
          <div className="d-modal-meta-row">
            <span className="d-modal-ribbon">★ {tripTitle} ★</span>
            <span className="d-modal-count">紀錄 {index + 1} / {total}</span>
          </div>
          {records.length > 1 && (
            <div className="d-modal-switch-row">
              {records.map((_, i) => (
                <button key={i} className={`d-modal-switch ${i === index ? 'active' : ''}`} onClick={() => onSwitch(i)}>{i + 1}</button>
              ))}
            </div>
          )}
          <pre className="d-modal-text">{record.content}</pre>
        </div>
      )}
    </div>
  )
}

const IMG_ROTS = [-1.5, 1.2, -2, 0.8, -1, 1.8]

export function CoolDetail({ exp, gpxPaths, records, mapFiles }: Props) {
  const [peaks, setPeaks]     = useState<string[]>([])
  const [openRec, setOpenRec] = useState<number | null>(null)
  const mapSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gpxPaths.length === 0) return
    const filename = gpxPaths[0].split('/').pop() ?? gpxPaths[0]
    const isKml = filename.toLowerCase().endsWith('.kml')
    fetch(`/api/gpx?file=${encodeURIComponent(filename)}`)
      .then(r => r.ok ? r.text() : null)
      .then(text => {
        if (!text) return
        const { waypoints } = isKml ? parseKmlCool(text) : parseGpxCool(text)
        setPeaks(waypoints.map(w => w.name))
      })
      .catch(() => {})
  }, [gpxPaths])

  const openRecord = (i: number) => {
    setOpenRec(i)
    if (mapSectionRef.current) {
      window.scrollTo({ top: mapSectionRef.current.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' })
    }
  }

  const gpxFilename = gpxPaths[0]?.split('/').pop() ?? gpxPaths[0]

  // Collect screenshot images: preview_image first, then image map_files
  const screenshots: string[] = []
  if (exp.preview_image) {
    const name = String(exp.preview_image).split('/').pop() ?? ''
    if (name) screenshots.push(name)
  }
  mapFiles
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.file_path))
    .forEach(f => {
      const name = f.file_path.split('/').pop() ?? ''
      if (name && !screenshots.includes(name)) screenshots.push(name)
    })

  return (
    <div id="cool-root">
      <div className="neon-detail">
        {/* Hero — 只保留隊伍基本資訊 */}
        <header className="d-hero" style={{ minHeight: 'auto', paddingBottom: '40px' }}>
          <Link href="/cool" className="d-back">◀ 回去看更多</Link>
          <div className="d-hero-chips" style={{ marginTop: '28px' }}>
            <span className="chip c2" style={{ fontSize: '18px', fontWeight: 900 }}>{exp.name}</span>
            <span className="chip c1">★ {fmtDate(exp.date_start)}{exp.date_end ? ` — ${fmtDate(exp.date_end)}` : ''}</span>
            {exp.leader    && <span className="chip c3">領隊 {exp.leader}</span>}
            {regionLabel(exp) && <span className="chip c5">{regionLabel(exp)}</span>}
          </div>
        </header>

        {/* Map */}
        <section className="d-map-section" ref={mapSectionRef}>
          <div className="d-map-label">★ 地圖 MAP ★</div>
          <div className="d-map-wrap">
            <CoolMap gpxPaths={gpxPaths} />
          </div>
          {peaks[0] && <div className="d-map-corner">{peaks[0]}</div>}
          <div className="d-map-actions">
            {gpxFilename && (
              <a href={`/api/gpx?file=${encodeURIComponent(gpxFilename)}`} className="d-dl-btn b2" download={gpxFilename}>
                <span className="big">↓ 軌跡</span><span className="ext">GPX</span>
              </a>
            )}
          </div>
        </section>

        {/* 出隊資料（左）+ 沿途紀錄（右）兩欄 */}
        <section className="d-docs-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>

            {/* 左：截圖 */}
            <div>
              <div className="d-section-label">★ 出隊資料 ★</div>
              {screenshots.length === 0 ? (
                <div className="d-empty">◢◤ 無截圖資料 ◢◤</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {screenshots.map((name, i) => (
                    <div key={name} style={{
                      border: '5px solid #1a0030',
                      boxShadow: i % 2 === 0
                        ? '14px 14px 0 #ff006e, 28px 28px 0 #ffd60a'
                        : '14px 14px 0 #ffd60a, 28px 28px 0 #00f5d4',
                      transform: `rotate(${IMG_ROTS[i % IMG_ROTS.length]}deg)`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/preview?file=${encodeURIComponent(name)}`}
                        alt={`出隊資料 ${i + 1}`}
                        style={{ display: 'block', width: '100%', height: 'auto' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 右：沿途紀錄 */}
            <div>
              <div className="d-section-label alt">★ 沿途紀錄 ★</div>
              {records.length === 0 ? (
                <div className="d-empty">◢◤ 此次無附加紀錄 ◢◤</div>
              ) : (
                <div className="d-rec-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {records.map((r, i) => {
                    const ext = r.filename.split('.').pop() ?? 'txt'
                    const name = r.filename.replace(/\.(docx|txt|pdf)$/, '')
                    return (
                      <button key={i} className={`d-rec-card rc${i % 4}`} onClick={() => openRecord(i)}>
                        <div className="d-rec-ext">.{ext}</div>
                        <div className="d-rec-name">{name}</div>
                        <div className="d-rec-cta">點我看 →</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </section>

        {openRec !== null && records[openRec] && (
          <FloatingRecordWindow
            key={openRec}
            record={records[openRec]}
            tripTitle={exp.name}
            index={openRec}
            total={records.length}
            onClose={() => setOpenRec(null)}
            onSwitch={setOpenRec}
            records={records}
          />
        )}
      </div>
    </div>
  )
}
