'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface ElevPoint { dist: number; ele: number }

interface Props {
  activeGpx: string | null
}

function haversineDist(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLon = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function parseGpx(text: string): { latlngs: [number, number][]; elevs: ElevPoint[] } {
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
    return { dist: cumDist, ele: isNaN(ele) ? 0 : ele }
  })
  return { latlngs, elevs }
}

function parseKml(text: string): { latlngs: [number, number][]; elevs: ElevPoint[] } {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const coordNodes = Array.from(doc.querySelectorAll('coordinates'))
  const latlngs: [number, number][] = []
  const eleRaw: number[] = []
  for (const node of coordNodes) {
    const tuples = (node.textContent ?? '').trim().split(/\s+/)
    for (const tuple of tuples) {
      const parts = tuple.split(',').map(Number)
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        latlngs.push([parts[1], parts[0]])  // KML: lon,lat → lat,lon
        eleRaw.push(parts[2] ?? 0)
      }
    }
  }
  let cumDist = 0
  const elevs: ElevPoint[] = latlngs.map((ll, i) => {
    if (i > 0) cumDist += haversineDist(latlngs[i - 1], ll)
    return { dist: cumDist, ele: eleRaw[i] ?? 0 }
  })
  return { latlngs, elevs }
}

function RisoElevationChart({ points }: { points: ElevPoint[] }) {
  if (points.length < 2) return null

  const W = 600
  const H = 110
  const PAD = { top: 12, right: 12, bottom: 24, left: 44 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxDist = points[points.length - 1].dist
  const eles = points.map(p => p.ele)
  const minEle = Math.min(...eles)
  const maxEle = Math.max(...eles)
  const eleRange = maxEle - minEle || 1

  const scaleX = (d: number) => PAD.left + (d / maxDist) * innerW
  const scaleY = (e: number) => PAD.top + innerH - ((e - minEle) / eleRange) * innerH

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${scaleX(p.dist).toFixed(1)},${scaleY(p.ele).toFixed(1)}`
  ).join(' ')

  const areaD = `${pathD} L${scaleX(maxDist).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`

  const yTicks = 3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
      style={{ display: 'block', background: 'rgba(255,253,231,0.92)', borderTop: '2px solid #e65100' }}>
      {/* area fill */}
      <path d={areaD} fill="rgba(230,81,0,0.18)" />
      {/* line */}
      <path d={pathD} fill="none" stroke="#e65100" strokeWidth="2" strokeLinejoin="round" />

      {/* y-axis ticks */}
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

      {/* x-axis dist labels */}
      {Array.from({ length: 5 }, (_, i) => {
        const d = (maxDist * i) / 4
        const x = scaleX(d)
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#5a4a00"
            fontFamily="'Courier Prime', monospace">
            {d >= 1000 ? `${(d / 1000).toFixed(1)}k` : Math.round(d)}m
          </text>
        )
      })}

      {/* y-axis label */}
      <text x={8} y={PAD.top + innerH / 2}
        transform={`rotate(-90,8,${PAD.top + innerH / 2})`}
        textAnchor="middle" fontSize="9" fill="#e65100"
        fontFamily="'Bebas Neue', sans-serif" letterSpacing="0.1em">高度m</text>
    </svg>
  )
}

async function loadTrackOnMap(
  map: any,
  L: any,
  activeGpx: string,
  trackLayersRef: React.MutableRefObject<any[]>,
  setElevPoints: (pts: ElevPoint[]) => void
) {
  // Clear previous track layers
  trackLayersRef.current.forEach(l => l.remove())
  trackLayersRef.current = []
  setElevPoints([])

  const filename = activeGpx.split('/').pop() ?? activeGpx
  const isKml = filename.toLowerCase().endsWith('.kml')
  const url = `/api/gpx?file=${encodeURIComponent(filename)}`

  try {
    const res = await fetch(url)
    if (!res.ok) return
    const text = await res.text()

    const { latlngs, elevs } = isKml ? parseKml(text) : parseGpx(text)
    if (latlngs.length === 0) return

    const line = L.polyline(latlngs, { color: '#e65100', weight: 3.5, opacity: 0.9 })
    line.addTo(map)
    trackLayersRef.current.push(line)

    if (latlngs[0]) {
      const start = L.circleMarker(latlngs[0], { radius: 6, color: '#fff', fillColor: '#3a7d44', fillOpacity: 1, weight: 2 })
      start.addTo(map)
      trackLayersRef.current.push(start)
    }
    if (latlngs.at(-1)) {
      const end = L.circleMarker(latlngs.at(-1)!, { radius: 6, color: '#fff', fillColor: '#1a1000', fillOpacity: 1, weight: 2 })
      end.addTo(map)
      trackLayersRef.current.push(end)
    }

    map.fitBounds(latlngs as any, { padding: [24, 24] })
    setElevPoints(elevs)
  } catch {
    // network error — leave map as-is
  }
}

export function RisoLeafletMap({ activeGpx }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const trackLayersRef = useRef<any[]>([])
  const activeGpxRef = useRef(activeGpx)
  const [elevPoints, setElevPoints] = useState<ElevPoint[]>([])

  // Keep ref in sync so map init can read the latest value
  activeGpxRef.current = activeGpx

  // Init map once; load initial track after map is ready
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
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      })
      const nlscContour = L.tileLayer(
        'https://wmts.nlsc.gov.tw/wmts/CONTOUR/default/GoogleMapsCompatible/{z}/{y}/{x}',
        { attribution: '© 國土測繪中心', maxZoom: 20, opacity: 0.6 }
      )

      openTopo.addTo(map)
      L.control.layers(
        { 'OpenTopoMap（等高線）': openTopo, 'NLSC 通用電子地圖': nlscEmap, 'OpenStreetMap': osm },
        { 'NLSC 等高線 Overlay': nlscContour }
      ).addTo(map)
      L.control.scale({ metric: true, imperial: false }).addTo(map)
      map.setView([23.5, 121], 7)

      // Load initial track now that map is ready
      if (activeGpxRef.current) {
        loadTrackOnMap(map, L, activeGpxRef.current, trackLayersRef, setElevPoints)
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      leafletRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload track when activeGpx changes (after initial mount)
  useEffect(() => {
    if (!activeGpx || !mapRef.current || !leafletRef.current) return
    loadTrackOnMap(mapRef.current, leafletRef.current, activeGpx, trackLayersRef, setElevPoints)
  }, [activeGpx])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      {elevPoints.length >= 2 && <RisoElevationChart points={elevPoints} />}
    </div>
  )
}
