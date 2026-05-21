'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface ElevPoint { dist: number; ele: number; lat: number; lng: number }
interface Waypoint { lat: number; lng: number; name: string }
interface ParsedTrack { latlngs: [number, number][]; elevs: ElevPoint[]; waypoints: Waypoint[] }

interface Props {
  activeGpxes: string[]
}

const TRACK_COLORS = ['#e65100', '#0066cc', '#3a7d44', '#8b0000', '#9c27b0']

// Module-level cache — persists across re-renders, cleared on page refresh
const gpxCache = new Map<string, ParsedTrack>()

function haversineDist(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLon = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function parseGpx(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const pts = Array.from(doc.querySelectorAll('trkpt'))
  const latlngs: [number, number][] = pts.map(p => [
    parseFloat(p.getAttribute('lat') ?? '0'),
    parseFloat(p.getAttribute('lon') ?? '0'),
  ])
  let cumDist = 0
  const elevs: ElevPoint[] = pts.map((p, i) => {
    if (i > 0) cumDist += haversineDist(latlngs[i - 1], latlngs[i])
    const ele = parseFloat(p.querySelector('ele')?.textContent ?? 'NaN')
    return { dist: cumDist, ele: isNaN(ele) ? 0 : ele, lat: latlngs[i][0], lng: latlngs[i][1] }
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
  const coordNodes = Array.from(doc.querySelectorAll('coordinates'))
  const latlngs: [number, number][] = []
  const eleRaw: number[] = []
  for (const node of coordNodes) {
    const tuples = (node.textContent ?? '').trim().split(/\s+/)
    for (const tuple of tuples) {
      const parts = tuple.split(',').map(Number)
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        latlngs.push([parts[1], parts[0]])
        eleRaw.push(parts[2] ?? 0)
      }
    }
  }
  let cumDist = 0
  const elevs: ElevPoint[] = latlngs.map((ll, i) => {
    if (i > 0) cumDist += haversineDist(latlngs[i - 1], ll)
    return { dist: cumDist, ele: eleRaw[i] ?? 0, lat: ll[0], lng: ll[1] }
  })
  return { latlngs, elevs, waypoints: [] }
}

// Iterative RDP — avoids call stack overflow on large arrays
function rdpSimplify(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    let maxDist = 0, maxIdx = start
    const dx = points[end][0] - points[start][0]
    const dy = points[end][1] - points[start][1]
    const lenSq = dx * dx + dy * dy
    for (let i = start + 1; i < end; i++) {
      let d: number
      if (lenSq === 0) {
        d = Math.hypot(points[i][0] - points[start][0], points[i][1] - points[start][1])
      } else {
        const t = Math.max(0, Math.min(1,
          ((points[i][0] - points[start][0]) * dx + (points[i][1] - points[start][1]) * dy) / lenSq
        ))
        d = Math.hypot(points[i][0] - points[start][0] - t * dx, points[i][1] - points[start][1] - t * dy)
      }
      if (d > maxDist) { maxDist = d; maxIdx = i }
    }
    if (maxDist > epsilon) {
      keep[maxIdx] = 1
      stack.push([start, maxIdx], [maxIdx, end])
    }
  }
  return points.filter((_, i) => keep[i])
}

// Uniform subsample for SVG chart rendering — no benefit past chart pixel width
function subsampleElevs(points: ElevPoint[], max: number): ElevPoint[] {
  if (points.length <= max) return points
  const step = Math.ceil(points.length / max)
  return points.filter((_, i) => i % step === 0 || i === points.length - 1)
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}k` : `${Math.round(m)}`
}

function RocketElevationChart({
  points,
  onHover,
  onLeave,
}: {
  points: ElevPoint[]
  onHover?: (pt: ElevPoint) => void
  onLeave?: () => void
}) {
  const [hoverPt, setHoverPt] = useState<ElevPoint | null>(null)
  if (points.length < 2) return null

  const W = 600
  const H = 100
  const PAD = { top: 10, right: 12, bottom: 22, left: 44 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxDist = points[points.length - 1].dist
  const eles = points.map(p => p.ele)
  const minEle = eles.reduce((a, b) => a < b ? a : b)
  const maxEle = eles.reduce((a, b) => a > b ? a : b)
  const eleRange = maxEle - minEle || 1

  const scaleX = (d: number) => PAD.left + (d / maxDist) * innerW
  const scaleY = (e: number) => PAD.top + innerH - ((e - minEle) / eleRange) * innerH

  // Use subsampled points for SVG path only
  const chartPts = subsampleElevs(points, 600)
  const pathD = chartPts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${scaleX(p.dist).toFixed(1)},${scaleY(p.ele).toFixed(1)}`
  ).join(' ')
  const areaD = `${pathD} L${scaleX(maxDist).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`

  // Stats from full points
  let gain = 0, loss = 0
  const THRESH = 5
  let prevEle = points[0].ele
  for (let i = 1; i < points.length; i++) {
    const d = points[i].ele - prevEle
    if (Math.abs(d) > THRESH) { d > 0 ? gain += d : loss -= d; prevEle = points[i].ele }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const targetDist = Math.max(0, Math.min(maxDist, ((svgX - PAD.left) / innerW) * maxDist))
    let best = points[0], bestDiff = Infinity
    for (const p of points) {
      const diff = Math.abs(p.dist - targetDist)
      if (diff < bestDiff) { bestDiff = diff; best = p }
    }
    setHoverPt(best)
    onHover?.(best)
  }

  const handleMouseLeave = () => { setHoverPt(null); onLeave?.() }

  const yTicks = 3

  return (
    <div style={{ background: 'rgba(255,253,231,0.92)', borderTop: '2px solid #e65100' }}>
      <div style={{
        display: 'flex', gap: '1.4rem', padding: '2px 12px 2px 44px',
        fontSize: '0.62rem', fontFamily: "'Courier Prime', monospace", color: '#5a4a00',
        borderBottom: '1px solid rgba(230,81,0,0.18)',
      }}>
        <span>↔ {fmtDist(maxDist)}m</span>
        <span>↑ {Math.round(gain)}m</span>
        <span>↓ {Math.round(loss)}m</span>
        <span>▲ {Math.round(maxEle)}m</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}>

        <path d={areaD} fill="rgba(230,81,0,0.18)" />
        <path d={pathD} fill="none" stroke="#e65100" strokeWidth="2" strokeLinejoin="round" />

        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const e = minEle + (eleRange * i) / yTicks
          const y = scaleY(e)
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#e6510022" strokeWidth="1" />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#5a4a00"
                fontFamily="'Courier Prime', monospace">{Math.round(e)}</text>
            </g>
          )
        })}

        {Array.from({ length: 5 }, (_, i) => {
          const d = (maxDist * i) / 4
          const x = scaleX(d)
          return (
            <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#5a4a00"
              fontFamily="'Courier Prime', monospace">
              {fmtDist(d)}m
            </text>
          )
        })}

        <text x={8} y={PAD.top + innerH / 2}
          transform={`rotate(-90,8,${PAD.top + innerH / 2})`}
          textAnchor="middle" fontSize="9" fill="#e65100"
          fontFamily="'Bebas Neue', sans-serif" letterSpacing="0.1em">高度m</text>

        {hoverPt && (() => {
          const hx = scaleX(hoverPt.dist)
          const hy = scaleY(hoverPt.ele)
          const label = `${fmtDist(hoverPt.dist)}m · ${Math.round(hoverPt.ele)}m`
          const tipW = label.length * 5.5 + 10
          const tipX = hx + 6 + tipW > W ? hx - tipW - 6 : hx + 6
          return (
            <g>
              <line x1={hx} y1={PAD.top} x2={hx} y2={PAD.top + innerH}
                stroke="#0066cc" strokeWidth="1" strokeDasharray="3,2" />
              <circle cx={hx} cy={hy} r={4} fill="#0066cc" stroke="#fff" strokeWidth="1.5" />
              <rect x={tipX} y={hy - 18} width={tipW} height={14}
                fill="rgba(255,253,231,0.95)" stroke="#0066cc" strokeWidth="1" rx={2} />
              <text x={tipX + 5} y={hy - 7} fontSize="9" fill="#0066cc"
                fontFamily="'Courier Prime', monospace">{label}</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

async function fetchAndParse(path: string): Promise<ParsedTrack | null> {
  const cached = gpxCache.get(path)
  if (cached) return cached
  try {
    const res = await fetch(`/api/gpx?file=${encodeURIComponent(path)}`)
    if (!res.ok) return null
    const text = await res.text()
    const parsed = path.toLowerCase().endsWith('.kml') ? parseKml(text) : parseGpx(text)
    gpxCache.set(path, parsed)
    return parsed
  } catch {
    return null
  }
}

function addTrackLayers(
  map: any, L: any, parsed: ParsedTrack, color: string, single: boolean
): any[] {
  const { latlngs, waypoints } = parsed
  if (latlngs.length === 0) return []

  const simplified = rdpSimplify(latlngs, 0.0001)
  const layers: any[] = []

  const line = L.polyline(simplified, { color, weight: 3.5, opacity: 0.9 })
  line.addTo(map)
  layers.push(line)

  if (latlngs[0]) {
    const startBg = single ? '#3a7d44' : color
    const startIcon = L.divIcon({
      className: '',
      html: `<div style="background:${startBg};color:#fffde7;padding:4px 8px;font-weight:900;font-family:'Bebas Neue',sans-serif;font-size:13px;border:2px solid #fffde7;box-shadow:0 2px 6px rgba(0,0,0,0.4)">起</div>`,
      iconSize: [30, 26], iconAnchor: [15, 13],
    })
    const start = L.marker(latlngs[0], { icon: startIcon })
    start.addTo(map)
    layers.push(start)
  }
  if (latlngs.at(-1)) {
    const endBg = single ? '#0066cc' : color
    const endBorder = single ? '2px' : '3px'
    const endIcon = L.divIcon({
      className: '',
      html: `<div style="background:${endBg};color:#fffde7;padding:4px 8px;font-weight:900;font-family:'Bebas Neue',sans-serif;font-size:13px;border:${endBorder} solid #fffde7;box-shadow:0 2px 6px rgba(0,0,0,0.4)">終</div>`,
      iconSize: [30, 26], iconAnchor: [15, 13],
    })
    const end = L.marker(latlngs.at(-1)!, { icon: endIcon })
    end.addTo(map)
    layers.push(end)
  }

  for (const wpt of waypoints) {
    if (!wpt.name) continue
    const wptBg = single ? '#e65100' : color
    const wptIcon = L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;background:${wptBg};border:2px solid #1a1000;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer"></div>`,
      iconSize: [12, 12], iconAnchor: [6, 6],
    })
    const marker = L.marker([wpt.lat, wpt.lng], { icon: wptIcon })
      .bindTooltip(wpt.name, { direction: 'top', offset: [0, -8], className: 'rocket-wpt-tip' })
    marker.addTo(map)
    layers.push(marker)
  }

  return layers
}

export function RocketLeafletMap({ activeGpxes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const trackLayersRef = useRef<Map<string, any[]>>(new Map())
  const colorAssignRef = useRef<Map<string, string>>(new Map())
  const nextColorRef = useRef(0)
  const prevCountRef = useRef(activeGpxes.length)
  const hoverMarkerRef = useRef<any>(null)
  const activeGpxesRef = useRef(activeGpxes)
  const [elevPoints, setElevPoints] = useState<ElevPoint[]>([])

  activeGpxesRef.current = activeGpxes

  const handleChartHover = useCallback((pt: ElevPoint) => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.setLatLng([pt.lat, pt.lng])
    } else {
      hoverMarkerRef.current = L.circleMarker([pt.lat, pt.lng], {
        radius: 7, color: '#0066cc', fillColor: '#fff', fillOpacity: 1, weight: 2,
      }).addTo(mapRef.current)
    }
  }, [])

  const handleChartLeave = useCallback(() => {
    hoverMarkerRef.current?.remove()
    hoverMarkerRef.current = null
  }, [])

  // Map init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || mapRef.current) return
      leafletRef.current = L
      const map = L.map(containerRef.current!, { zoomControl: true })
      mapRef.current = map

      const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap, © OpenTopoMap', maxZoom: 17,
      })
      const nlscEmap = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { attribution: '© 國土測繪中心', maxZoom: 20 }
      )
      const nlscSatellite = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { attribution: '© 國土測繪中心', maxZoom: 20 }
      )
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      })
      const carto = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap contributors, © CARTO', maxZoom: 18 }
      )
      const nlscContour = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/CONTOUR/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { attribution: '© 國土測繪中心', maxZoom: 20, opacity: 0.6 }
      )

      openTopo.addTo(map)
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
          const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control')
          btn.innerHTML = '⛶'
          btn.title = '全螢幕'
          btn.style.cssText = 'font-size:16px;padding:4px 8px;cursor:pointer;background:white;border:none;line-height:1;display:flex;align-items:center;justify-content:center;font-family:sans-serif'
          L.DomEvent.on(btn, 'click', () => {
            const el = map.getContainer()
            if (!document.fullscreenElement) el.requestFullscreen()
            else document.exitFullscreen()
          })
          return btn
        },
      })
      new FullscreenCtrl().addTo(map)

      if (!document.getElementById('rocket-wpt-style')) {
        const s = document.createElement('style')
        s.id = 'rocket-wpt-style'
        s.textContent = `.rocket-wpt-tip{background:#fffde7!important;color:#1a1000!important;border:2px solid #e65100!important;border-radius:0!important;font-family:'Bebas Neue',sans-serif!important;font-size:13px!important;letter-spacing:.08em!important;padding:3px 10px!important;box-shadow:3px 3px 0 #e65100!important;white-space:nowrap}.rocket-wpt-tip::before{border-top-color:#e65100!important}`
        document.head.appendChild(s)
      }

      map.setView([23.5, 121], 7)

      // Load initial tracks
      const paths = activeGpxesRef.current
      if (paths.length > 0) {
        Promise.all(paths.map(async path => {
          if (cancelled) return
          if (!colorAssignRef.current.has(path)) {
            colorAssignRef.current.set(path, TRACK_COLORS[nextColorRef.current % TRACK_COLORS.length])
            nextColorRef.current++
          }
          const color = colorAssignRef.current.get(path)!
          const parsed = await fetchAndParse(path)
          if (!parsed || cancelled) return
          const layers = addTrackLayers(map, L, parsed, color, paths.length === 1)
          trackLayersRef.current.set(path, layers)
          return parsed
        })).then(results => {
          if (cancelled) return
          // Fit bounds
          const bounds: any[] = []
          for (const layers of trackLayersRef.current.values()) {
            for (const layer of layers) {
              if (layer.getBounds) bounds.push(layer.getBounds())
            }
          }
          if (bounds.length > 0) {
            const combined = bounds.reduce((acc: any, b: any) => acc.extend(b))
            map.fitBounds(combined, { padding: [24, 24] })
          }
          // Set elevation if single track
          if (paths.length === 1 && results[0]) {
            setElevPoints(results[0].elevs)
          }
        })
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      leafletRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track management when activeGpxes changes
  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    if (!map || !L) return

    let cancelled = false
    const prevCount = prevCountRef.current
    const single = activeGpxes.length === 1
    prevCountRef.current = activeGpxes.length

    const prevPaths = new Set(trackLayersRef.current.keys())
    const nextPaths = new Set(activeGpxes)

    // Remove deselected tracks
    for (const path of prevPaths) {
      if (!nextPaths.has(path)) {
        trackLayersRef.current.get(path)?.forEach(l => l.remove())
        trackLayersRef.current.delete(path)
      }
    }

    // Clear hover marker and elevation when multi-select
    hoverMarkerRef.current?.remove()
    hoverMarkerRef.current = null
    if (!single) setElevPoints([])

    // Detect single↔multi mode change — must redraw all existing tracks
    const modeChanged = prevCount > 0 && (prevCount === 1) !== single
    if (modeChanged) {
      for (const path of nextPaths) {
        if (prevPaths.has(path)) {
          trackLayersRef.current.get(path)?.forEach(l => l.remove())
          trackLayersRef.current.delete(path)
        }
      }
    }

    // Paths to load (not yet on map, or forcibly cleared above)
    const toLoad = modeChanged
      ? [...activeGpxes]
      : activeGpxes.filter(p => !prevPaths.has(p))

    // If single track already loaded, show its elevation from cache
    if (activeGpxes.length === 1 && toLoad.length === 0) {
      const cached = gpxCache.get(activeGpxes[0])
      if (cached) setElevPoints(cached.elevs)
      return
    }

    if (toLoad.length === 0) return

    Promise.all(toLoad.map(async path => {
      if (!colorAssignRef.current.has(path)) {
        colorAssignRef.current.set(path, TRACK_COLORS[nextColorRef.current % TRACK_COLORS.length])
        nextColorRef.current++
      }
      const color = colorAssignRef.current.get(path)!
      const parsed = await fetchAndParse(path)
      if (!parsed || cancelled) return null
      const layers = addTrackLayers(map, L, parsed, color, single)
      trackLayersRef.current.set(path, layers)
      return parsed
    })).then(results => {
      if (cancelled) return

      // Fit bounds to all visible tracks
      const bounds: any[] = []
      for (const layers of trackLayersRef.current.values()) {
        for (const layer of layers) {
          if (layer.getBounds) bounds.push(layer.getBounds())
        }
      }
      if (bounds.length > 0) {
        const combined = bounds.reduce((acc: any, b: any) => acc.extend(b))
        map.fitBounds(combined, { padding: [24, 24] })
      }

      // Elevation only for single track
      if (activeGpxes.length === 1) {
        const cached = gpxCache.get(activeGpxes[0])
        if (cached && !cancelled) setElevPoints(cached.elevs)
      }

      void results
    })

    return () => { cancelled = true }
  }, [activeGpxes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      {elevPoints.length >= 2 && activeGpxes.length === 1 && (
        <RocketElevationChart
          points={elevPoints}
          onHover={handleChartHover}
          onLeave={handleChartLeave}
        />
      )}
    </div>
  )
}
