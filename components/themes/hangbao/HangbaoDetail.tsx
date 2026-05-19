'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import './hangbao.css'

interface ExpData {
  id: number
  name: string
  date_start: string
  date_end: string | null
  county: string | null
  all_counties: string | null
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
  const entryCounty = exp.county ?? ''
  let exitCounty = entryCounty
  if (exp.all_counties) {
    const others = exp.all_counties.split(',').filter(c => c && c !== entryCounty)
    if (others.length === 1) exitCounty = others[0]
  }
  if (!r && !rx) return ''
  if (!rx || r === rx) return entryCounty ? `${entryCounty}${r ?? ''}` : (r ?? '')
  const from = entryCounty ? `${entryCounty}${r}` : (r ?? '')
  const to   = exitCounty  ? `${exitCounty}${rx}` : rx
  return `${from} → ${to}`
}

function parseGpxHangbao(text: string): { latlngs: [number, number][]; waypoints: { lat: number; lng: number; name: string }[] } {
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

function parseKmlHangbao(text: string): { latlngs: [number, number][]; waypoints: { lat: number; lng: number; name: string }[] } {
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

function HangbaoMap({ activePath }: { activePath: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const trackLayersRef = useRef<any[]>([])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !containerRef.current) return
      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      const carto = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 18, attribution: '© OpenStreetMap contributors, © CARTO' }
      )
      const openTopo = L.tileLayer(
        'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        { maxZoom: 17, attribution: '© OpenStreetMap, © OpenTopoMap' }
      ).addTo(map)
      const nlscEmap = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { maxZoom: 20, attribution: '© 國土測繪中心' }
      )
      const nlscContour = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/CONTOUR/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { maxZoom: 20, opacity: 0.6, attribution: '© 國土測繪中心' }
      )
      L.control.layers(
        { 'OpenTopoMap（等高線）': openTopo, 'CartoDB Voyager': carto, 'NLSC 通用電子地圖': nlscEmap },
        { 'NLSC 等高線 Overlay': nlscContour }
      ).addTo(map)
      L.control.scale({ metric: true, imperial: false }).addTo(map)
      map.setView([23.5, 121], 7)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Load track whenever activePath changes
  useEffect(() => {
    if (!activePath) return
    const isKml = activePath.toLowerCase().endsWith('.kml')

    const doLoad = async () => {
      const map = mapRef.current
      if (!map) return
      // Clear previous track layers
      trackLayersRef.current.forEach(layer => { try { layer.remove() } catch (_) {} })
      trackLayersRef.current = []

      let L: any
      try {
        L = (await import('leaflet')).default ?? await import('leaflet')
      } catch { return }

      try {
        const res = await fetch(`/api/gpx?file=${encodeURIComponent(activePath)}`)
        if (!res.ok) return
        const text = await res.text()
        const { latlngs, waypoints } = isKml ? parseKmlHangbao(text) : parseGpxHangbao(text)
        if (latlngs.length === 0) return

        const track = L.polyline(latlngs, { color: '#ff006e', weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(map)
        trackLayersRef.current.push(track)

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
        const mStart = L.marker(latlngs[0], { icon: mkStart }).addTo(map)
        const mEnd   = L.marker(latlngs[latlngs.length - 1], { icon: mkEnd }).addTo(map)
        trackLayersRef.current.push(mStart, mEnd)

        waypoints.forEach(w => {
          const icon = L.divIcon({
            className: '',
            html: `<div style="background:white;color:#1a0030;padding:3px 8px;font-weight:700;font-size:12px;border:2px solid #ff006e;white-space:nowrap;">▲ ${w.name}</div>`,
            iconSize: [80, 24], iconAnchor: [40, 12],
          })
          const wm = L.marker([w.lat, w.lng], { icon }).addTo(map)
          trackLayersRef.current.push(wm)
        })

        map.fitBounds(track.getBounds(), { padding: [40, 40] })
      } catch { /* leave at default view */ }
    }

    // Wait briefly if map isn't ready yet (first render)
    if (mapRef.current) {
      doLoad()
    } else {
      const t = setTimeout(doLoad, 600)
      return () => clearTimeout(t)
    }
  }, [activePath])

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
  const winRef  = useRef<HTMLDivElement>(null)

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
const TITLE_ROTS = [-4, 3, -6, 2, -3, 5, -2, 4, -5, 2]
const REC_SHAPES = ['rs-square','rs-rect','rs-circle','rs-ellipse','rs-blob','rs-skew','rs-tall','rs-wide']

export function HangbaoDetail({ exp, gpxPaths, records, mapFiles }: Props) {
  const [openRec, setOpenRec]     = useState<number | null>(null)
  const [activeGpxIdx, setActiveGpxIdx] = useState(0)
  const [gpxOpen, setGpxOpen]     = useState(false)
  const [pdfOpen, setPdfOpen]     = useState(false)
  const mapSectionRef  = useRef<HTMLDivElement>(null)
  const actionsDropRef = useRef<HTMLDivElement>(null)

  const activeGpxPath = gpxPaths[activeGpxIdx]?.split('/').pop() ?? ''

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsDropRef.current && !actionsDropRef.current.contains(e.target as Node)) {
        setGpxOpen(false)
        setPdfOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openRecord = (i: number) => {
    setOpenRec(i)
    if (mapSectionRef.current) {
      window.scrollTo({ top: mapSectionRef.current.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' })
    }
  }

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
    <div id="hangbao-root">
      <div className="neon-detail">
        {/* Hero */}
        <header className="d-hero">
          <div className="d-hero-bg">{exp.name}</div>
          <Link href="/hangbao" className="d-back">◀ 回去看更多</Link>
          <h1 className="d-title">
            {exp.name.split('').map((ch, i) => (
              <span key={i} style={{ transform: `rotate(${TITLE_ROTS[i % TITLE_ROTS.length]}deg)` }}>{ch}</span>
            ))}
          </h1>
          <div className="d-hero-chips">
            <span className="chip c1">★ {fmtDate(exp.date_start)}{exp.date_end ? ` — ${fmtDate(exp.date_end)}` : ''}</span>
            {exp.leader    && <span className="chip c3">領隊 {exp.leader}</span>}
            {regionLabel(exp) && <span className="chip c5">{regionLabel(exp)}</span>}
          </div>
        </header>

        {/* Map */}
        <section className="d-map-section" ref={mapSectionRef}>
          <div className="d-map-label">★ 地圖 MAP ★</div>
          <div className="d-map-wrap">
            <HangbaoMap activePath={activeGpxPath} />
          </div>
          <div className="d-map-corner">山協 siak-phānn</div>
          <div className="d-map-actions" ref={actionsDropRef}>
            {/* GPX dropdown */}
            {gpxPaths.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  className="d-dl-btn b2"
                  onClick={() => { setGpxOpen(o => !o); setPdfOpen(false) }}
                >
                  <span className="big">{activeGpxPath || 'GPX'} {gpxOpen ? '▲' : '▼'}</span>
                </button>
                {gpxOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 50,
                    background: 'var(--bg)', border: '4px solid var(--bg)',
                    boxShadow: '6px 6px 0 var(--hot)', minWidth: '100%',
                  }}>
                    {gpxPaths.map((p, i) => {
                      const fname = p.split('/').pop() ?? p
                      return (
                        <button key={i}
                          className="d-dl-item"
                          style={{
                            display: 'block', width: '100%', padding: '10px 16px',
                            background: i === activeGpxIdx ? 'var(--hot)' : 'var(--yellow)',
                            color: 'var(--bg)', border: 'none', cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onClick={() => { setActiveGpxIdx(i); setGpxOpen(false) }}
                        >
                          {fname}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PDF dropdown */}
            {(() => {
              const pdfFiles = mapFiles.filter(f => /\.pdf$/i.test(f.file_path))
              if (pdfFiles.length === 0) return null
              return (
                <div style={{ position: 'relative' }}>
                  <button
                    className="d-dl-btn b3"
                    onClick={() => { setPdfOpen(o => !o); setGpxOpen(false) }}
                  >
                    <span className="big">PDF {pdfOpen ? '▲' : '▼'}</span>
                  </button>
                  {pdfOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 50,
                      background: 'var(--bg)', border: '4px solid var(--bg)',
                      boxShadow: '6px 6px 0 var(--cyan)', minWidth: '100%',
                    }}>
                      {pdfFiles.map((f, i) => {
                        const fname = f.file_path.split('/').pop() ?? ''
                        return (
                          <button key={i}
                            className="d-dl-item"
                            style={{
                              display: 'block', width: '100%', padding: '10px 16px',
                              background: 'var(--cyan)', color: 'var(--bg)',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                            onClick={() => {
                              window.open(`/api/pdf?file=${encodeURIComponent(f.file_path)}`, '_blank')
                              setPdfOpen(false)
                            }}
                          >
                            {fname.replace(/\.pdf$/i, '')} .pdf
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
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
                <div className="d-rec-grid" style={{ gridTemplateColumns: '1fr', marginLeft: '20%' }}>
                  {records.map((r, i) => {
                    const ext = r.filename.split('.').pop() ?? 'txt'
                    const name = r.filename.replace(/\.(docx|txt|pdf)$/, '')
                    return (
                      <button
                        key={i}
                        className={`d-rec-card rc${i % 4} ${REC_SHAPES[i % REC_SHAPES.length]}`}
                        onClick={() => openRecord(i)}
                      >
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
