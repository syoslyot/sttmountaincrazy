'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { openFile } from '@/lib/openFile'
import 'leaflet/dist/leaflet.css'
import './hangbao.css'

const TRACK_COLORS = [
  '#e8185a', '#00a896', '#f0a500', '#8bc34a', '#e64a19',
  '#7e57c2', '#039be5', '#d81b60', '#43a047', '#ef6c00',
]

export interface ExpData {
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

interface RecordItem { filename: string; content: string; file_path: string | null }

interface GpxFile { file_path: string; filename: string }

interface Props {
  exp: ExpData
  gpxFiles: GpxFile[]
  records: RecordItem[]
  mapFiles: { file_path: string; filename: string }[]
  storageBase: string
}

function fmtDate(d: string | null | undefined): string {
  return d ? d.replace(/-/g, '.') : ''
}

function regionLabel(exp: ExpData): string {
  const r = exp.region, rx = exp.region_exit
  const entryC = exp.county ?? ''
  let exitC = entryC
  if (exp.all_counties) {
    const others = exp.all_counties.split(',').filter(c => c && c !== entryC)
    if (others.length === 1) exitC = others[0]
  }
  if (!r && !rx) return ''
  if (!rx || r === rx) return entryC && r ? `${entryC}・${r}` : (entryC || r || '')
  const from = entryC && r ? `${entryC}・${r}` : (entryC || r || '')
  const to   = exitC  && rx ? `${exitC}・${rx}` : (exitC || rx || '')
  return `${from}→${to}`
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

const TW_COORDS: Record<string, [number, number]> = {
  '仁愛鄉': [23.98, 121.10], '信義鄉': [23.68, 120.85], '魚池鄉': [23.88, 120.93],
  '國姓鄉': [24.06, 120.87], '埔里鎮': [23.97, 120.97], '竹山鎮': [23.75, 120.67],
  '鹿谷鄉': [23.73, 120.77], '集集鎮': [23.83, 120.79], '水里鄉': [23.81, 120.85],
  '名間鄉': [23.82, 120.67], '中寮鄉': [23.87, 120.73], '草屯鎮': [23.97, 120.67],
  '秀林鄉': [24.15, 121.55], '萬榮鄉': [23.72, 121.40], '卓溪鄉': [23.33, 121.27],
  '花蓮市': [23.97, 121.60], '新城鄉': [24.13, 121.65], '吉安鄉': [23.96, 121.57],
  '壽豐鄉': [23.83, 121.53], '鳳林鎮': [23.74, 121.48], '光復鄉': [23.66, 121.43],
  '瑞穗鄉': [23.50, 121.37], '富里鄉': [23.19, 121.26], '玉里鎮': [23.33, 121.31],
  '海端鄉': [23.12, 121.07], '延平鄉': [23.22, 121.02], '金峰鄉': [22.60, 120.89],
  '達仁鄉': [22.48, 120.87], '台東市': [22.75, 121.14], '臺東市': [22.75, 121.14],
  '長濱鄉': [23.33, 121.44], '太麻里鄉': [22.63, 121.03], '池上鄉': [23.10, 121.22],
  '關山鎮': [23.05, 121.17], '鹿野鄉': [22.92, 121.16], '卑南鄉': [22.79, 121.08],
  '大同鄉': [24.62, 121.40], '南澳鄉': [24.51, 121.68], '三星鄉': [24.66, 121.65],
  '員山鄉': [24.77, 121.67], '礁溪鄉': [24.83, 121.76], '頭城鎮': [24.86, 121.82],
  '羅東鎮': [24.68, 121.77], '冬山鄉': [24.66, 121.78], '蘇澳鎮': [24.60, 121.85],
  '復興區': [24.79, 121.37],
  '尖石鄉': [24.73, 121.30], '五峰鄉': [24.65, 121.08], '關西鎮': [24.79, 121.18],
  '橫山鄉': [24.72, 121.12],
  '泰安鄉': [24.48, 121.05], '南庄鄉': [24.62, 120.97], '獅潭鄉': [24.57, 120.86],
  '大湖鄉': [24.41, 120.87],
  '和平區': [24.38, 121.00],
  '阿里山鄉': [23.52, 120.73], '番路鄉': [23.53, 120.60], '梅山鄉': [23.58, 120.57],
  '竹崎鄉': [23.52, 120.59],
  '桃源區': [23.20, 120.80], '茂林區': [22.91, 120.72], '那瑪夏區': [23.33, 120.72],
  '甲仙區': [23.08, 120.61], '六龜區': [22.99, 120.63],
  '三地門鄉': [22.72, 120.66], '霧台鄉': [22.73, 120.75], '瑪家鄉': [22.70, 120.68],
  '泰武鄉': [22.68, 120.68], '來義鄉': [22.61, 120.66], '春日鄉': [22.54, 120.71],
  '獅子鄉': [22.50, 120.73], '牡丹鄉': [22.44, 120.81],
  '南投縣': [23.83, 120.97], '花蓮縣': [23.70, 121.45], '台東縣': [22.93, 121.06],
  '臺東縣': [22.93, 121.06], '宜蘭縣': [24.70, 121.75], '桃園市': [24.99, 121.30],
  '新竹縣': [24.70, 121.15], '苗栗縣': [24.50, 120.82], '台中市': [24.15, 120.68],
  '臺中市': [24.15, 120.68], '嘉義縣': [23.46, 120.45], '高雄市': [22.63, 120.30],
  '屏東縣': [22.55, 120.55], '新北市': [25.01, 121.46], '基隆市': [25.13, 121.74],
  '新竹市': [24.80, 120.97], '彰化縣': [23.99, 120.57], '雲林縣': [23.71, 120.43],
  '嘉義市': [23.48, 120.45], '台南市': [23.00, 120.21], '臺南市': [23.00, 120.21],
}

function ensureWptTipStyle(color: string): string {
  const cls = `hangbao-wpt-tip-${color.replace('#', '')}`
  if (!document.querySelector(`style[data-hwpt="${cls}"]`)) {
    const s = document.createElement('style')
    s.dataset.hwpt = cls
    s.textContent = `.${cls}{background:#1a0030!important;color:${color}!important;border:2px solid ${color}!important;border-radius:0!important;font-weight:700;font-size:13px;}`
    document.head.appendChild(s)
  }
  return cls
}

function HangbaoMap({ activePaths, colorMap, entryTown, entryCounty }: { activePaths: string[], colorMap: Record<string, string>, entryTown?: string | null, entryCounty?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const trackLayersRef = useRef<Map<string, any[]>>(new Map())
  const trackPolylinesRef = useRef<Map<string, any>>(new Map())
  const prevPathsRef = useRef<string[]>([])
  const colorMapRef = useRef(colorMap)
  const [loadingCount, setLoadingCount] = useState(0)

  useEffect(() => { colorMapRef.current = colorMap }, [colorMap])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !containerRef.current) return
      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      const openTopo = L.tileLayer(
        'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        { maxZoom: 17, attribution: '© OpenStreetMap, © OpenTopoMap' }
      )
      const nlscEmap = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { maxZoom: 20, attribution: '© 國土測繪中心' }
      )
      const nlscSatellite = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { maxZoom: 20, attribution: '© 國土測繪中心' }
      ).addTo(map)
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '© OpenStreetMap' }
      )
      const carto = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 18, attribution: '© OpenStreetMap contributors, © CARTO' }
      )
      const nlscContour = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/CONTOUR/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { maxZoom: 20, opacity: 0.6, attribution: '© 國土測繪中心' }
      )
      L.control.layers(
        {
          'OpenTopoMap（等高線）': openTopo,
          'NLSC 通用電子地圖': nlscEmap,
          'NLSC 正射影像（衛星）': nlscSatellite,
          'OpenStreetMap': osm,
          'CartoDB Voyager': carto,
        },
        { 'NLSC 等高線 Overlay': nlscContour }
      ).addTo(map)
      L.control.scale({ metric: true, imperial: false }).addTo(map)

      const FullscreenCtrl = L.Control.extend({
        options: { position: 'topleft' as const },
        onAdd() {
          const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control hangbao-fullscreen-btn')
          btn.innerHTML = '全螢幕'
          btn.title = '全螢幕'
          L.DomEvent.on(btn, 'click', () => {
            const el = map.getContainer()
            if (!document.fullscreenElement) el.requestFullscreen()
            else document.exitFullscreen()
          })
          return btn
        },
      })
      new FullscreenCtrl().addTo(map)

      const initCoords = TW_COORDS[entryTown ?? ''] ?? TW_COORDS[entryCounty ?? ''] ?? null
      if (initCoords && activePaths.length === 0) {
        map.setView(initCoords, 11)
      } else {
        map.setView([23.5, 121], 7)
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Manage tracks when activePaths changes
  useEffect(() => {
    const doManage = async () => {
      const map = mapRef.current
      if (!map) return

      const prev = new Set(prevPathsRef.current)
      const next = new Set(activePaths)
      prevPathsRef.current = activePaths

      // Remove tracks no longer active
      for (const [path, layers] of trackLayersRef.current) {
        if (!next.has(path)) {
          layers.forEach(l => { try { l.remove() } catch (_) {} })
          trackLayersRef.current.delete(path)
          trackPolylinesRef.current.delete(path)
        }
      }

      const toLoad = activePaths.filter(p => !prev.has(p))

      if (toLoad.length > 0) {
        setLoadingCount(c => c + toLoad.length)

        await Promise.all(toLoad.map(async path => {
          const isKml = path.toLowerCase().endsWith('.kml')
          try {
            const L = (await import('leaflet')).default ?? await import('leaflet')
            const res = await fetch(`/api/gpx?file=${encodeURIComponent(path)}`)
            if (!res.ok) return
            const text = await res.text()
            const { latlngs, waypoints } = isKml ? parseKmlHangbao(text) : parseGpxHangbao(text)
            if (latlngs.length === 0) return

            const color = colorMapRef.current[path] ?? TRACK_COLORS[0]
            const layers: any[] = []

            const polyline = L.polyline(latlngs, { color, weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(map)
            layers.push(polyline)
            trackPolylinesRef.current.set(path, polyline)

            const mkStart = L.divIcon({
              className: '',
              html: `<div style="background:${color};color:#1a0030;padding:4px 8px;font-weight:900;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:13px;">起</div>`,
              iconSize: [40, 30], iconAnchor: [20, 15],
            })
            const mkEnd = L.divIcon({
              className: '',
              html: `<div style="background:#1a0030;color:${color};border:2px solid ${color};padding:4px 8px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:13px;">終</div>`,
              iconSize: [40, 30], iconAnchor: [20, 15],
            })
            layers.push(L.marker(latlngs[0], { icon: mkStart }).addTo(map))
            layers.push(L.marker(latlngs[latlngs.length - 1], { icon: mkEnd }).addTo(map))

            waypoints.forEach(w => {
              const icon = L.divIcon({
                className: '',
                html: `<div style="width:16px;height:16px;background:${color};border:2px solid #ffd60a;transform:rotate(45deg);box-shadow:0 0 8px ${color},0 0 2px #ffd60a;cursor:pointer;"></div>`,
                iconSize: [16, 16], iconAnchor: [8, 8],
              })
              layers.push(L.marker([w.lat, w.lng], { icon })
                .bindTooltip(w.name, { direction: 'top', offset: [0, -10], className: ensureWptTipStyle(color) })
                .addTo(map))
            })

            trackLayersRef.current.set(path, layers)
          } catch (_) {
            // ignore load errors
          } finally {
            setLoadingCount(c => c - 1)
          }
        }))
      }

      // Fit to all currently loaded tracks
      const polys = [...trackPolylinesRef.current.values()]
      if (polys.length > 0) {
        try {
          let bounds = polys[0].getBounds()
          for (const p of polys.slice(1)) bounds = bounds.extend(p.getBounds())
          map.fitBounds(bounds, { padding: [40, 40] })
        } catch (_) {}
      }
    }

    if (mapRef.current) {
      doManage()
    } else {
      const t = setTimeout(doManage, 600)
      return () => clearTimeout(t)
    }
  }, [activePaths])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {loadingCount > 0 && (
        <div className="hangbao-map-loading">
          <div className="hangbao-map-loading-inner">
            <div className="hangbao-map-loading-text">LOADING</div>
            <div className="hangbao-map-loading-sub">航跡載入中</div>
          </div>
        </div>
      )}
    </div>
  )
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
    const w = Math.min(620, window.innerWidth - 40)
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

export function HangbaoDetail({ exp, gpxFiles, records, mapFiles, storageBase }: Props) {
  const [openRec, setOpenRec]     = useState<number | null>(null)
  const [activeGpxes, setActiveGpxes] = useState<Set<string>>(
    () => new Set(gpxFiles[0] ? [gpxFiles[0].file_path] : [])
  )
  const [gpxOpen, setGpxOpen]     = useState(false)
  const [pdfOpen, setPdfOpen]     = useState(false)
  const [recOpen, setRecOpen]     = useState(false)
  const mapSectionRef  = useRef<HTMLDivElement>(null)
  const gpxDropRef     = useRef<HTMLDivElement>(null)
  const actionsDropRef = useRef<HTMLDivElement>(null)
  const recDropRef     = useRef<HTMLDivElement>(null)

  const gpxColorMap = Object.fromEntries(
    gpxFiles.map((g, i) => [g.file_path, TRACK_COLORS[i % TRACK_COLORS.length]])
  )

  const toggleGpx = (path: string) => {
    setActiveGpxes(prev => {
      const next = new Set(prev)
      if (next.has(path) && next.size === 1) return prev
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
    setGpxOpen(false)
  }

  const gpxCount = activeGpxes.size
  const gpxLabel = gpxCount === 1
    ? (gpxFiles.find(g => activeGpxes.has(g.file_path))?.filename ?? 'GPX')
    : `地圖航跡（${gpxCount}）`

  const downloadableRecords = records.filter(r => r.file_path)

  const openRecordInNewTab = (rec: RecordItem) => {
    openFile(rec.file_path!, rec.filename, 'records')
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (gpxDropRef.current && !gpxDropRef.current.contains(t)) setGpxOpen(false)
      if (actionsDropRef.current && !actionsDropRef.current.contains(t)) setPdfOpen(false)
      if (recDropRef.current && !recDropRef.current.contains(t)) setRecOpen(false)
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

  const screenshots: string[] = []
  if (exp.preview_image) {
    const name = String(exp.preview_image).split('/').pop() ?? ''
    if (name) screenshots.push(name)
  }

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
          {/* Label row: "★ 地圖 MAP ★" + GPX dropdown overlapping from the right */}
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '30px', marginLeft: '2%', position: 'relative', zIndex: 5 }}>
            <div className="d-map-label" style={{ margin: 0, flexShrink: 0 }}>★ 地圖 MAP ★</div>
            {gpxFiles.length > 0 && (
              <div style={{ position: 'relative', marginLeft: '-10px', zIndex: 6 }} ref={gpxDropRef}>
                <button
                  className="d-dl-btn b2"
                  onClick={() => { setGpxOpen(o => !o); setPdfOpen(false) }}
                >
                  <span className="big">{gpxLabel} {gpxOpen ? '▲' : '▼'}</span>
                </button>
                {gpxOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 50,
                    background: 'var(--bg)', border: '4px solid var(--hot)',
                    boxShadow: '6px 6px 0 var(--yellow)', minWidth: '100%',
                  }}>
                    {gpxFiles.map((g, i) => {
                      const isSelected = activeGpxes.has(g.file_path)
                      const dotColor = TRACK_COLORS[i % TRACK_COLORS.length]
                      return (
                        <button key={i}
                          className="d-dl-item"
                          style={{
                            display: 'flex', width: '100%', padding: '10px 16px',
                            alignItems: 'center', gap: '10px',
                            background: isSelected ? 'var(--hot)' : 'var(--yellow)',
                            color: 'var(--bg)', border: 'none', cursor: 'pointer',
                            textAlign: 'left', fontFamily: 'inherit',
                          }}
                          onClick={() => toggleGpx(g.file_path)}
                        >
                          <span style={{
                            width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                            background: isSelected ? dotColor : 'transparent',
                            border: `2px solid ${dotColor}`,
                            display: 'inline-block',
                          }} />
                          {g.filename}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="d-map-wrap">
            <HangbaoMap
              activePaths={[...activeGpxes]}
              colorMap={gpxColorMap}
              entryTown={exp.region}
              entryCounty={exp.county}
            />
          </div>
          <div className="d-map-corner">山協 siak-phānn</div>

          {/* 地圖 DOWNLOAD + 紀錄 DOWNLOAD dropdowns below map */}
          {(() => {
            const mapFileItems = mapFiles.filter(f => /\.(pdf|png|jpg|jpeg|webp)$/i.test(f.filename))
            if (mapFileItems.length === 0 && downloadableRecords.length === 0) return null
            return (
              <div className="d-map-actions">
                {mapFileItems.length > 0 && (
                  <div style={{ position: 'relative' }} ref={actionsDropRef}>
                    <button
                      className="d-dl-btn b3"
                      onClick={() => { setPdfOpen(o => !o); setGpxOpen(false); setRecOpen(false) }}
                    >
                      <span className="big">地圖 DOWNLOAD {pdfOpen ? '▲' : '▼'}</span>
                    </button>
                    {pdfOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, zIndex: 50,
                        background: 'var(--bg)', border: '4px solid var(--bg)',
                        boxShadow: '6px 6px 0 var(--cyan)', minWidth: '100%',
                      }}>
                        {mapFileItems.map((f, i) => (
                          <button key={i}
                            className="d-dl-item"
                            style={{
                              display: 'block', width: '100%', padding: '10px 16px',
                              background: 'var(--cyan)', color: 'var(--bg)',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                            onClick={() => { openFile(f.file_path, f.filename, 'maps'); setPdfOpen(false) }}
                          >
                            {f.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {downloadableRecords.length > 0 && (
                  <div style={{ position: 'relative' }} ref={recDropRef}>
                    <button
                      className="d-dl-btn b1"
                      onClick={() => { setRecOpen(o => !o); setGpxOpen(false); setPdfOpen(false) }}
                    >
                      <span className="big">紀錄 DOWNLOAD {recOpen ? '▲' : '▼'}</span>
                    </button>
                    {recOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, zIndex: 50,
                        background: 'var(--bg)', border: '4px solid var(--hot)',
                        boxShadow: '6px 6px 0 var(--yellow)', minWidth: '100%',
                      }}>
                        {downloadableRecords.map((r, i) => (
                          <button key={i}
                            className="d-dl-item"
                            style={{
                              display: 'block', width: '100%', padding: '10px 16px',
                              background: 'var(--hot)', color: 'white',
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                            onClick={() => { openRecordInNewTab(r); setRecOpen(false) }}
                          >
                            {r.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
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
