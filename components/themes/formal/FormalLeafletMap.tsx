'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { ElevPoint } from './FormalElevationChart'

interface Waypoint  { lat: number; lng: number; name: string }
interface ParsedTrack { latlngs: [number, number][]; elevs: ElevPoint[]; waypoints: Waypoint[] }

export type TileLayerKey = 'topo' | 'sat' | 'osm' | 'emap' | 'rudy' | 'google' | 'jm1924' | 'jm1916'

interface Props {
  activeGpxes: string[]
  colorMap?: Record<string, string>
  entryTown?: string | null
  entryCounty?: string | null
  tileLayer?: TileLayerKey
  onElevationData?: (points: ElevPoint[]) => void
  mapHoverRef?: React.MutableRefObject<((pt: ElevPoint) => void) | undefined>
  mapLeaveRef?: React.MutableRefObject<(() => void) | undefined>
}

const TW_COORDS: Record<string, [number, number]> = {
  '仁愛鄉': [23.98, 121.10], '信義鄉': [23.68, 120.85], '魚池鄉': [23.88, 120.93],
  '國姓鄉': [24.06, 120.87], '埔里鎮': [23.97, 120.97], '竹山鎮': [23.75, 120.67],
  '秀林鄉': [24.15, 121.55], '萬榮鄉': [23.72, 121.40], '卓溪鄉': [23.33, 121.27],
  '花蓮市': [23.97, 121.60], '吉安鄉': [23.96, 121.57], '壽豐鄉': [23.83, 121.53],
  '海端鄉': [23.12, 121.07], '延平鄉': [23.22, 121.02], '達仁鄉': [22.48, 120.87],
  '台東市': [22.75, 121.14], '臺東市': [22.75, 121.14], '長濱鄉': [23.33, 121.44],
  '大同鄉': [24.62, 121.40], '南澳鄉': [24.51, 121.68], '三星鄉': [24.66, 121.65],
  '復興區': [24.79, 121.37], '尖石鄉': [24.73, 121.30], '五峰鄉': [24.65, 121.08],
  '泰安鄉': [24.48, 121.05], '南庄鄉': [24.62, 120.97], '和平區': [24.38, 121.00],
  '阿里山鄉': [23.52, 120.73], '桃源區': [23.20, 120.80], '茂林區': [22.91, 120.72],
  '三地門鄉': [22.72, 120.66], '獅子鄉': [22.50, 120.73], '牡丹鄉': [22.44, 120.81],
  '金峰鄉': [22.60, 120.89],
  // County fallbacks
  '南投縣': [23.83, 120.97], '花蓮縣': [23.70, 121.45], '台東縣': [22.93, 121.06],
  '宜蘭縣': [24.70, 121.75], '台中市': [24.15, 120.68], '臺中市': [24.15, 120.68],
  '嘉義縣': [23.46, 120.45], '高雄市': [22.63, 120.30], '屏東縣': [22.55, 120.55],
}

const formalGpxCache = new Map<string, ParsedTrack>()

// ─── ElevPoint re-export (defined in FormalElevationChart) ───────────────────
export type { ElevPoint }

function haversineDist(a: [number, number], b: [number, number]) {
  const R = 6371000, dLat = (b[0]-a[0])*Math.PI/180, dLon = (b[1]-a[1])*Math.PI/180
  const s = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s))
}

function parseGpx(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const pts = Array.from(doc.querySelectorAll('trkpt'))
  const latlngs: [number, number][] = pts.map(p => [
    parseFloat(p.getAttribute('lat') ?? '0'), parseFloat(p.getAttribute('lon') ?? '0'),
  ])
  let cum = 0
  const elevs: ElevPoint[] = pts.map((p, i) => {
    if (i > 0) cum += haversineDist(latlngs[i-1], latlngs[i])
    const ele = parseFloat(p.querySelector('ele')?.textContent ?? 'NaN')
    return { dist: cum, ele: isNaN(ele) ? 0 : ele, lat: latlngs[i][0], lng: latlngs[i][1] }
  })
  const waypoints: Waypoint[] = Array.from(doc.querySelectorAll('wpt')).map(w => ({
    lat: parseFloat(w.getAttribute('lat') ?? '0'),
    lng: parseFloat(w.getAttribute('lon') ?? '0'),
    name: w.querySelector('name')?.textContent ?? '',
  }))
  return { latlngs, elevs, waypoints }
}

function parseKml(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const latlngs: [number, number][] = []
  const eleRaw: number[] = []
  for (const node of Array.from(doc.querySelectorAll('coordinates'))) {
    for (const t of (node.textContent ?? '').trim().split(/\s+/)) {
      const p = t.split(',').map(Number)
      if (p.length >= 2 && !isNaN(p[0])) { latlngs.push([p[1], p[0]]); eleRaw.push(p[2] ?? 0) }
    }
  }
  let cum = 0
  const elevs: ElevPoint[] = latlngs.map((ll, i) => {
    if (i > 0) cum += haversineDist(latlngs[i-1], ll)
    return { dist: cum, ele: eleRaw[i] ?? 0, lat: ll[0], lng: ll[1] }
  })
  return { latlngs, elevs, waypoints: [] }
}

function rdpSimplify(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length-1] = 1
  const stack: [number,number][] = [[0, pts.length-1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    let max = 0, idx = s
    const dx = pts[e][0]-pts[s][0], dy = pts[e][1]-pts[s][1], ls = dx*dx+dy*dy
    for (let i = s+1; i < e; i++) {
      const t = ls ? Math.max(0, Math.min(1, ((pts[i][0]-pts[s][0])*dx+(pts[i][1]-pts[s][1])*dy)/ls)) : 0
      const d = Math.hypot(pts[i][0]-pts[s][0]-t*dx, pts[i][1]-pts[s][1]-t*dy)
      if (d > max) { max = d; idx = i }
    }
    if (max > eps) { keep[idx] = 1; stack.push([s,idx],[idx,e]) }
  }
  return pts.filter((_,i) => keep[i])
}

async function fetchAndParse(path: string): Promise<ParsedTrack | null> {
  if (formalGpxCache.has(path)) return formalGpxCache.get(path)!
  try {
    const res = await fetch(`/api/gpx?file=${encodeURIComponent(path)}`)
    if (!res.ok) return null
    const text = await res.text()
    const parsed = path.toLowerCase().endsWith('.kml') ? parseKml(text) : parseGpx(text)
    formalGpxCache.set(path, parsed)
    return parsed
  } catch { return null }
}

function addTrackLayers(map: any, L: any, parsed: ParsedTrack, color: string, single: boolean) {
  const { latlngs, waypoints } = parsed
  if (!latlngs.length) return []
  const layers: any[] = []
  const simple = rdpSimplify(latlngs, 0.0001)
  const line = L.polyline(simple, { color, weight: 3, opacity: 0.9 })
  line.addTo(map); layers.push(line)

  const mkIcon = (bg: string, fg: string, label: string) => L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:${fg};padding:3px 7px;font-family:var(--mono,monospace);font-size:11px;border:1px solid ${fg};letter-spacing:.06em">${label}</div>`,
    iconSize: [28, 22], iconAnchor: [14, 11],
  })
  // Waypoints first so start/end render on top
  for (const w of waypoints) {
    if (!w.name) continue
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:11px;height:11px;background:${color};border:1.5px solid #f6f4ef;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
      iconSize: [11,11], iconAnchor: [5.5,5.5],
    })
    const marker = L.marker([w.lat,w.lng],{icon})
      .bindTooltip(w.name,{direction:'top',offset:[0,-6], sticky: true, opacity: 0.96})
      .addTo(map)
    marker.on('mouseover', () => marker.openTooltip())
    marker.on('mouseout', () => marker.closeTooltip())
    layers.push(marker)
  }
  if (latlngs[0]) {
    layers.push(L.marker(latlngs[0], { icon: mkIcon(single ? '#3a7d44' : color, '#f6f4ef', '起'), zIndexOffset: 1000 }).addTo(map))
  }
  if (latlngs.at(-1)) {
    layers.push(L.marker(latlngs.at(-1)!, { icon: mkIcon(single ? color : '#f6f4ef', single ? '#f6f4ef' : color, '終'), zIndexOffset: 1000 }).addTo(map))
  }
  return layers
}

// ─── Main Map Component ───────────────────────────────────────────────────────

const TILE_URLS: Record<TileLayerKey, { url: string; attr: string; maxZoom: number; minZoom?: number; subdomains?: string }> = {
  topo:   { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',      attr: '© OpenTopoMap', maxZoom: 17 },
  sat:    { url: 'https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}', attr: '© 國土測繪中心', maxZoom: 20 },
  osm:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',    attr: '© OpenStreetMap', maxZoom: 19 },
  emap:   { url: 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',     attr: '© 國土測繪中心 EMAP', maxZoom: 20 },
  rudy:   { url: 'https://tile.happyman.idv.tw/map/moi_osm/{z}/{x}/{y}.png', attr: '© Taiwan TOPO contributors', maxZoom: 20 },
  google: { url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',  attr: '© Google', maxZoom: 20, subdomains: '0123' },
  jm1924: { url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=JM50K_1924_new-png-{z}-{x}-{y}', attr: '© 中央研究院 WMTS', minZoom: 8, maxZoom: 16 },
  jm1916: { url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=JM50K_1916-jpg-{z}-{x}-{y}', attr: '© 中央研究院 WMTS', minZoom: 8, maxZoom: 16 },
}

export function FormalLeafletMap({ activeGpxes, colorMap, entryTown, entryCounty, tileLayer = 'topo', onElevationData, mapHoverRef, mapLeaveRef }: Props) {
  const containerRef      = useRef<HTMLDivElement>(null)
  const mapRef            = useRef<any>(null)
  const leafletRef        = useRef<any>(null)
  const tileLayerRef      = useRef<any>(null)
  const trackLayersRef    = useRef<Map<string, any[]>>(new Map())
  const colorAssignRef    = useRef<Map<string, string>>(new Map())
  const nextColorRef      = useRef(0)
  const colorMapRef       = useRef(colorMap)
  const activeGpxesRef    = useRef(activeGpxes)
  const hoverMarkerRef    = useRef<any>(null)
  const [elevPoints, setElevPoints] = useState<ElevPoint[]>([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => { activeGpxesRef.current = activeGpxes })
  useEffect(() => { colorMapRef.current = colorMap })

  const onChartHover = useCallback((pt: ElevPoint) => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    if (hoverMarkerRef.current) hoverMarkerRef.current.setLatLng([pt.lat, pt.lng])
    else hoverMarkerRef.current = L.circleMarker([pt.lat, pt.lng], {
      radius: 12, color: 'var(--accent)', fillColor: 'var(--bg)', fillOpacity: 1, weight: 2.5,
    }).addTo(mapRef.current)
  }, [])
  const onChartLeave = useCallback(() => { hoverMarkerRef.current?.remove(); hoverMarkerRef.current = null }, [])

  // Expose hover handlers to parent
  useEffect(() => {
    if (mapHoverRef) mapHoverRef.current = onChartHover
    if (mapLeaveRef) mapLeaveRef.current = onChartLeave
  })

  // Notify parent when elevation data changes
  useEffect(() => { onElevationData?.(elevPoints) }, [elevPoints, onElevationData])

  // Switch tile layer
  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    if (!map || !L) return
    if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null }
    const cfg = TILE_URLS[tileLayer]
    tileLayerRef.current = L.tileLayer(cfg.url, { attribution: cfg.attr, minZoom: cfg.minZoom, maxZoom: cfg.maxZoom, subdomains: cfg.subdomains ?? 'abc' }).addTo(map)
  }, [tileLayer])

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || mapRef.current) return
      leafletRef.current = L
      const map = L.map(containerRef.current!, { zoomControl: false, attributionControl: true })
      mapRef.current = map

      const cfg = TILE_URLS[tileLayer]
      tileLayerRef.current = L.tileLayer(cfg.url, { attribution: cfg.attr, minZoom: cfg.minZoom, maxZoom: cfg.maxZoom, subdomains: cfg.subdomains ?? 'abc' }).addTo(map)
      L.control.scale({ metric: true, imperial: false }).addTo(map)

      const initCoords = TW_COORDS[entryTown ?? ''] ?? TW_COORDS[entryCounty ?? ''] ?? null
      if (initCoords && activeGpxesRef.current.length === 0) map.setView(initCoords, 11)
      else map.setView([23.5, 121], 7)

      const paths = activeGpxesRef.current
      if (paths.length) {
        setLoading(true)
        Promise.all(paths.map(async path => {
          if (cancelled) return null
          const c = colorMapRef.current?.[path] ?? ['#9b4f1c','#0055a5','#3a7d44','#6d2a7c'][nextColorRef.current % 4]
          if (!colorAssignRef.current.has(path)) { colorAssignRef.current.set(path, c); nextColorRef.current++ }
          const parsed = await fetchAndParse(path)
          if (!parsed || cancelled) return null
          const layers = addTrackLayers(map, L, parsed, colorAssignRef.current.get(path)!, paths.length === 1)
          trackLayersRef.current.set(path, layers)
          return parsed
        })).then(results => {
          if (cancelled) return
          setLoading(false)
          const bounds: any[] = []
          for (const ls of trackLayersRef.current.values())
            for (const l of ls) if (l.getBounds) bounds.push(l.getBounds())
          if (bounds.length) map.fitBounds(bounds.reduce((a:any,b:any)=>a.extend(b)), { padding: [24,24] })
          if (paths.length === 1 && results[0]) setElevPoints(results[0].elevs)
        })
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null; leafletRef.current = null; tileLayerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle tracks
  useEffect(() => {
    const map = mapRef.current, L = leafletRef.current
    if (!map || !L) return
    let cancelled = false
    const prev = new Set(trackLayersRef.current.keys())
    const next = new Set(activeGpxes)

    // Remove deselected
    for (const path of prev) {
      if (!next.has(path)) { for (const l of trackLayersRef.current.get(path)??[]) l.remove(); trackLayersRef.current.delete(path) }
    }
    // Add new
    const toAdd = activeGpxes.filter(p => !prev.has(p))
    if (!toAdd.length) {
      // Update elevation data when settling on a single track
      if (activeGpxes.length === 1) {
        const cached = formalGpxCache.get(activeGpxes[0])
        if (cached) queueMicrotask(() => setElevPoints(cached.elevs))
      }
      // When multiple tracks active, keep last single-track elevation data;
      // the parent gates display on activeGpxes.length === 1 anyway.
      return
    }
    // Only show spinner for uncached tracks
    const needsFetch = toAdd.some(p => !formalGpxCache.has(p))
    if (needsFetch) setLoading(true)
    Promise.all(toAdd.map(async path => {
      const c = colorMapRef.current?.[path] ?? colorAssignRef.current.get(path) ?? '#9b4f1c'
      if (!colorAssignRef.current.has(path)) { colorAssignRef.current.set(path, c); nextColorRef.current++ }
      const parsed = await fetchAndParse(path)
      if (!parsed || cancelled) return null
      trackLayersRef.current.set(path, addTrackLayers(map, L, parsed, colorAssignRef.current.get(path)!, activeGpxes.length === 1))
      return parsed
    })).then(() => {
      if (cancelled) return
      setLoading(false)
      if (activeGpxes.length === 1) {
        const cached = formalGpxCache.get(activeGpxes[0])
        if (cached) setElevPoints(cached.elevs)
      }
      // Don't clear when multiple tracks — parent controls visibility
    })
    return () => { cancelled = true }
  }, [activeGpxes])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div className="formal-map-loading">
          <div className="formal-spinner" />
        </div>
      )}
    </div>
  )
}
