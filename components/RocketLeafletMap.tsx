'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface ElevPoint { dist: number; ele: number; lat: number; lng: number }
interface Waypoint { lat: number; lng: number; name: string }

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

function parseGpx(text: string): { latlngs: [number, number][]; elevs: ElevPoint[]; waypoints: Waypoint[] } {
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

function parseKml(text: string): { latlngs: [number, number][]; elevs: ElevPoint[]; waypoints: Waypoint[] } {
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
    return { dist: cumDist, ele: eleRaw[i] ?? 0, lat: ll[0], lng: ll[1] }
  })
  return { latlngs, elevs, waypoints: [] }
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
  const minEle = Math.min(...eles)
  const maxEle = Math.max(...eles)
  const eleRange = maxEle - minEle || 1

  const scaleX = (d: number) => PAD.left + (d / maxDist) * innerW
  const scaleY = (e: number) => PAD.top + innerH - ((e - minEle) / eleRange) * innerH

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${scaleX(p.dist).toFixed(1)},${scaleY(p.ele).toFixed(1)}`
  ).join(' ')
  const areaD = `${pathD} L${scaleX(maxDist).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`

  // Stats
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
      {/* Stats bar */}
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

        {/* Hover cursor */}
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

async function loadTrackOnMap(
  map: any,
  L: any,
  activeGpx: string,
  trackLayersRef: React.MutableRefObject<any[]>,
  setElevPoints: (pts: ElevPoint[]) => void
) {
  trackLayersRef.current.forEach(l => l.remove())
  trackLayersRef.current = []
  setElevPoints([])

  const isKml = activeGpx.toLowerCase().endsWith('.kml')
  const url = `/api/gpx?file=${encodeURIComponent(activeGpx)}`

  try {
    const res = await fetch(url)
    if (!res.ok) return
    const text = await res.text()

    const { latlngs, elevs, waypoints } = isKml ? parseKml(text) : parseGpx(text)
    if (latlngs.length === 0) return

    const line = L.polyline(latlngs, { color: '#e65100', weight: 3.5, opacity: 0.9 })
    line.addTo(map)
    trackLayersRef.current.push(line)

    if (latlngs[0]) {
      const startIcon = L.divIcon({
        className: '',
        html: '<div style="background:#3a7d44;color:#fffde7;padding:4px 8px;font-weight:900;font-family:\'Bebas Neue\',sans-serif;font-size:13px;border:2px solid #fffde7;box-shadow:0 2px 6px rgba(0,0,0,0.4)">起</div>',
        iconSize: [30, 26], iconAnchor: [15, 13],
      })
      const start = L.marker(latlngs[0], { icon: startIcon })
      start.addTo(map)
      trackLayersRef.current.push(start)
    }
    if (latlngs.at(-1)) {
      const endIcon = L.divIcon({
        className: '',
        html: '<div style="background:#0066cc;color:#fffde7;padding:4px 8px;font-weight:900;font-family:\'Bebas Neue\',sans-serif;font-size:13px;border:2px solid #fffde7;box-shadow:0 2px 6px rgba(0,0,0,0.4)">終</div>',
        iconSize: [30, 26], iconAnchor: [15, 13],
      })
      const end = L.marker(latlngs.at(-1)!, { icon: endIcon })
      end.addTo(map)
      trackLayersRef.current.push(end)
    }

    for (const wpt of waypoints) {
      if (!wpt.name) continue
      const wptIcon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;background:#e65100;border:2px solid #1a1000;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer"></div>',
        iconSize: [12, 12], iconAnchor: [6, 6],
      })
      const marker = L.marker([wpt.lat, wpt.lng], { icon: wptIcon })
        .bindTooltip(wpt.name, {
          direction: 'top', offset: [0, -8],
          className: 'rocket-wpt-tip',
        })
      marker.addTo(map)
      trackLayersRef.current.push(marker)
    }

    map.fitBounds(latlngs as any, { padding: [24, 24] })
    setElevPoints(elevs)
  } catch {
    // network error — leave map as-is
  }
}

export function RocketLeafletMap({ activeGpx }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const trackLayersRef = useRef<any[]>([])
  const hoverMarkerRef = useRef<any>(null)
  const activeGpxRef = useRef(activeGpx)
  const [elevPoints, setElevPoints] = useState<ElevPoint[]>([])

  activeGpxRef.current = activeGpx

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

  // Clean up hover marker when track changes
  useEffect(() => {
    hoverMarkerRef.current?.remove()
    hoverMarkerRef.current = null
  }, [activeGpx])

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

      // Inject waypoint tooltip styles once
      if (!document.getElementById('rocket-wpt-style')) {
        const s = document.createElement('style')
        s.id = 'rocket-wpt-style'
        s.textContent = `.rocket-wpt-tip{background:#fffde7!important;color:#1a1000!important;border:2px solid #e65100!important;border-radius:0!important;font-family:'Bebas Neue',sans-serif!important;font-size:13px!important;letter-spacing:.08em!important;padding:3px 10px!important;box-shadow:3px 3px 0 #e65100!important;white-space:nowrap}.rocket-wpt-tip::before{border-top-color:#e65100!important}`
        document.head.appendChild(s)
      }

      map.setView([23.5, 121], 7)

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

  useEffect(() => {
    if (!activeGpx || !mapRef.current || !leafletRef.current) return
    loadTrackOnMap(mapRef.current, leafletRef.current, activeGpx, trackLayersRef, setElevPoints)
  }, [activeGpx])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      {elevPoints.length >= 2 && (
        <RocketElevationChart
          points={elevPoints}
          onHover={handleChartHover}
          onLeave={handleChartLeave}
        />
      )}
    </div>
  )
}
