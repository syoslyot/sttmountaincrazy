'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Props {
  activeGpxes: string[]
  colorMap?: Record<string, string>
  entryTown?: string | null
  entryCounty?: string | null
}

type ParsedTrack = {
  coords: [number, number, number][]
  points: { lng: number; lat: number; ele: number; dist: number; time?: number }[]
  waypoints: { lng: number; lat: number; name: string; ele?: number; time?: number }[]
}

const TW_COORDS: Record<string, [number, number]> = {
  '仁愛鄉': [121.10, 23.98], '信義鄉': [120.85, 23.68], '魚池鄉': [120.93, 23.88],
  '秀林鄉': [121.55, 24.15], '萬榮鄉': [121.40, 23.72], '卓溪鄉': [121.27, 23.33],
  '海端鄉': [121.07, 23.12], '延平鄉': [121.02, 23.22], '大同鄉': [121.40, 24.62],
  '南澳鄉': [121.68, 24.51], '復興區': [121.37, 24.79], '尖石鄉': [121.30, 24.73],
  '五峰鄉': [121.08, 24.65], '泰安鄉': [121.05, 24.48], '和平區': [121.00, 24.38],
  '阿里山鄉': [120.73, 23.52], '桃源區': [120.80, 23.20],
  '南投縣': [120.97, 23.83], '花蓮縣': [121.45, 23.70], '台東縣': [121.06, 22.93],
  '宜蘭縣': [121.75, 24.70], '台中市': [120.68, 24.15], '臺中市': [120.68, 24.15],
  '嘉義縣': [120.45, 23.46], '高雄市': [120.30, 22.63], '屏東縣': [120.55, 22.55],
}

const trackCache = new Map<string, ParsedTrack>()

function haversineDist(a: [number, number], b: [number, number]) {
  const R = 6371000, dLat = (b[1]-a[1])*Math.PI/180, dLon = (b[0]-a[0])*Math.PI/180
  const s = Math.sin(dLat/2)**2 + Math.cos(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s))
}

function formatElapsed(ms: number) {
  const totalMins = Math.max(0, Math.round(ms / 60000))
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours <= 0) return `${mins} 分`
  return `${hours} 小時 ${mins} 分`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function parseGpx(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  let dist = 0
  const points = trkpts.map((p, i) => {
    const lat = parseFloat(p.getAttribute('lat') ?? '0')
    const lng = parseFloat(p.getAttribute('lon') ?? '0')
    const ele = parseFloat(p.querySelector('ele')?.textContent ?? '0')
    const timeRaw = p.querySelector('time')?.textContent ?? ''
    const time = timeRaw ? Date.parse(timeRaw) : NaN
    if (i > 0) {
      const prev = trkpts[i - 1]
      dist += haversineDist(
        [parseFloat(prev.getAttribute('lon') ?? '0'), parseFloat(prev.getAttribute('lat') ?? '0')],
        [lng, lat]
      )
    }
    return { lng, lat, ele: Number.isFinite(ele) ? ele : 0, dist, time: Number.isFinite(time) ? time : undefined }
  })
  const coords = points.map(p => [p.lng, p.lat, p.ele] as [number, number, number])
  const waypoints = Array.from(doc.querySelectorAll('wpt')).map(w => ({
    lat: parseFloat(w.getAttribute('lat') ?? '0'),
    lng: parseFloat(w.getAttribute('lon') ?? '0'),
    name: w.querySelector('name')?.textContent ?? '',
    ele: (() => {
      const ele = parseFloat(w.querySelector('ele')?.textContent ?? 'NaN')
      return Number.isFinite(ele) ? ele : undefined
    })(),
    time: (() => {
      const timeRaw = w.querySelector('time')?.textContent ?? ''
      const time = timeRaw ? Date.parse(timeRaw) : NaN
      return Number.isFinite(time) ? time : undefined
    })(),
  })).filter(w => w.name)
  return { coords, points, waypoints }
}

function parseKml(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const coords: [number, number, number][] = []
  const points: ParsedTrack['points'] = []
  let dist = 0
  for (const node of Array.from(doc.querySelectorAll('coordinates'))) {
    for (const raw of (node.textContent ?? '').trim().split(/\s+/)) {
      const [lng, lat, ele = 0] = raw.split(',').map(Number)
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        if (points.length) dist += haversineDist([points.at(-1)!.lng, points.at(-1)!.lat], [lng, lat])
        coords.push([lng, lat, ele])
        points.push({ lng, lat, ele, dist })
      }
    }
  }
  return { coords, points, waypoints: [] }
}

async function fetchTrack(path: string): Promise<ParsedTrack | null> {
  if (trackCache.has(path)) return trackCache.get(path)!
  try {
    const res = await fetch(`/api/gpx?file=${encodeURIComponent(path)}`)
    if (!res.ok) return null
    const text = await res.text()
    const parsed = path.toLowerCase().endsWith('.kml') ? parseKml(text) : parseGpx(text)
    trackCache.set(path, parsed)
    return parsed
  } catch {
    return null
  }
}

function boundsForTracks(tracks: ParsedTrack[]) {
  const coords = tracks.flatMap(t => t.coords)
  if (!coords.length) return null
  const first: [number, number] = [coords[0][0], coords[0][1]]
  const bounds = new maplibregl.LngLatBounds(first, first)
  coords.forEach(c => bounds.extend([c[0], c[1]]))
  return bounds
}

function markerElement(label: string, bg: string, fg = '#f6f4ef') {
  const el = document.createElement('div')
  el.className = 'formal-3d-track-marker'
  el.textContent = label
  el.style.background = bg
  el.style.color = fg
  el.style.borderColor = fg
  el.style.zIndex = '20'
  return el
}

function waypointElement(color: string, label: string) {
  const el = document.createElement('div')
  el.className = 'formal-3d-waypoint-marker'
  el.textContent = label
  el.style.background = color
  el.style.zIndex = '10'
  if (label.length >= 3) {
    el.style.width = '33px'
    el.style.height = '33px'
  }
  return el
}

function nearestTrackPoint(points: ParsedTrack['points'], waypoint: ParsedTrack['waypoints'][number]) {
  return points.reduce((best, pt) => {
    const d = haversineDist([waypoint.lng, waypoint.lat], [pt.lng, pt.lat])
    return d < best.d ? { pt, d } : best
  }, { pt: points[0], d: Infinity }).pt
}

function waypointPopupHtml(label: string, waypoint: ParsedTrack['waypoints'][number], nearest: ParsedTrack['points'][number], startTime?: number) {
  const ele = waypoint.ele ?? nearest.ele
  const time = waypoint.time ?? nearest.time
  const elapsed = typeof time === 'number' && typeof startTime === 'number'
    ? formatElapsed(time - startTime)
    : null
  const stats = [
    `↔ ${(nearest.dist / 1000).toFixed(1)} km`,
    `▲ ${Math.round(ele)} m`,
    elapsed ? `◷ ${elapsed}` : null,
  ].filter(Boolean).join(' · ')
  return `<div style="font-family:var(--mono,monospace);line-height:1.45;letter-spacing:.04em">
    <div style="color:var(--fg);font-weight:700">#${label} ${escapeHtml(waypoint.name)}</div>
    <div style="color:var(--muted);margin-top:2px">${stats}</div>
  </div>`
}

export function FormalMapLibre3D({ activeGpxes, colorMap, entryTown, entryCounty }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const renderSeqRef = useRef(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center = TW_COORDS[entryTown ?? ''] ?? TW_COORDS[entryCounty ?? ''] ?? [121, 23.5]
    const map = new maplibregl.Map({
      container: containerRef.current,
      center,
      zoom: activeGpxes.length ? 10 : 8,
      pitch: 62,
      bearing: -18,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
          terrain: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 15,
            encoding: 'terrarium',
            attribution: '© AWS Terrain Tiles',
          },
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' },
          {
            id: 'terrain-shade',
            type: 'hillshade',
            source: 'terrain',
            paint: {
              'hillshade-exaggeration': 0.7,
              'hillshade-shadow-color': '#5f594f',
              'hillshade-highlight-color': '#ffffff',
              'hillshade-accent-color': '#9b4f1c',
            },
          },
        ],
        terrain: { source: 'terrain', exaggeration: 2.4 },
      },
    })
    map.once('idle', () => setLoading(false))
    mapRef.current = map

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const currentMap = map
    const seq = ++renderSeqRef.current
    let cancelled = false

    async function renderTracks() {
      setLoading(true)
      await new Promise<void>(resolve => {
        if (currentMap.loaded()) resolve()
        else currentMap.once('load', () => resolve())
      })
      if (cancelled || renderSeqRef.current !== seq || !mapRef.current) {
        return
      }

      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      for (const id of [...currentMap.getStyle().layers].map(l => l.id)) {
        if (id.startsWith('track-line-')) currentMap.removeLayer(id)
      }
      for (const id of Object.keys(currentMap.getStyle().sources)) {
        if (id.startsWith('track-source-')) currentMap.removeSource(id)
      }

      const tracks = (await Promise.all(activeGpxes.map(fetchTrack))).filter(Boolean) as ParsedTrack[]
      if (cancelled || renderSeqRef.current !== seq || !mapRef.current) {
        return
      }

      tracks.forEach((track, i) => {
        const path = activeGpxes[i]
        const color = colorMap?.[path] ?? ['#9b4f1c', '#0055a5', '#3a7d44', '#6d2a7c'][i % 4]
        const sourceId = `track-source-${i}`
        currentMap.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: track.coords },
          },
        })
        currentMap.addLayer({
          id: `track-line-${i}`,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': 4, 'line-opacity': 0.92 },
        })
        const start = track.coords[0]
        const end = track.coords[track.coords.length - 1]
        const timedPoints = track.points.filter(p => typeof p.time === 'number')
        const startTime = timedPoints[0]?.time
        for (const [i, w] of track.waypoints.entries()) {
          const label = String(i + 1)
          const nearest = nearestTrackPoint(track.points, w)
          const el = waypointElement(color, label)
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 16,
            className: 'formal-3d-waypoint-popup',
          }).setHTML(waypointPopupHtml(label, w, nearest, startTime))
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([w.lng, w.lat])
            .setPopup(popup)
            .addTo(currentMap)
          el.addEventListener('mouseenter', () => popup.setLngLat([w.lng, w.lat]).addTo(currentMap))
          el.addEventListener('mouseleave', () => popup.remove())
          markersRef.current.push(marker)
        }
        if (start) {
          markersRef.current.push(
            new maplibregl.Marker({
              element: markerElement('起', activeGpxes.length === 1 ? '#f6f4ef' : color, activeGpxes.length === 1 ? color : '#f6f4ef'),
              anchor: 'center',
            })
              .setLngLat([start[0], start[1]])
              .addTo(currentMap)
          )
        }
        if (end) {
          markersRef.current.push(
            new maplibregl.Marker({ element: markerElement('終', '#f6f4ef', color), anchor: 'center' })
              .setLngLat([end[0], end[1]])
              .addTo(currentMap)
          )
        }
      })

      const bounds = boundsForTracks(tracks)
      if (bounds) {
        currentMap.fitBounds(bounds, { padding: 90, pitch: 76, bearing: -28, duration: 500 })
        currentMap.once('moveend', () => currentMap.easeTo({ pitch: 76, bearing: -28, duration: 250 }))
      }
      setLoading(false)
    }

    renderTracks()
    return () => { cancelled = true }
  }, [activeGpxes, colorMap])

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
