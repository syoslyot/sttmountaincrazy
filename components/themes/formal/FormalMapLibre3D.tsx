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
  waypoints: { lng: number; lat: number; name: string }[]
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

function parseGpx(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const coords = Array.from(doc.querySelectorAll('trkpt')).map(p => {
    const lat = parseFloat(p.getAttribute('lat') ?? '0')
    const lng = parseFloat(p.getAttribute('lon') ?? '0')
    const ele = parseFloat(p.querySelector('ele')?.textContent ?? '0')
    return [lng, lat, Number.isFinite(ele) ? ele : 0] as [number, number, number]
  })
  const waypoints = Array.from(doc.querySelectorAll('wpt')).map(w => ({
    lat: parseFloat(w.getAttribute('lat') ?? '0'),
    lng: parseFloat(w.getAttribute('lon') ?? '0'),
    name: w.querySelector('name')?.textContent ?? '',
  })).filter(w => w.name)
  return { coords, waypoints }
}

function parseKml(text: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const coords: [number, number, number][] = []
  for (const node of Array.from(doc.querySelectorAll('coordinates'))) {
    for (const raw of (node.textContent ?? '').trim().split(/\s+/)) {
      const [lng, lat, ele = 0] = raw.split(',').map(Number)
      if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push([lng, lat, ele])
    }
  }
  return { coords, waypoints: [] }
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

export function FormalMapLibre3D({ activeGpxes, colorMap, entryTown, entryCounty }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
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
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
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
    let cancelled = false

    async function renderTracks() {
      setLoading(true)
      await new Promise<void>(resolve => {
        if (currentMap.loaded()) resolve()
        else currentMap.once('load', () => resolve())
      })
      if (cancelled) {
        setLoading(false)
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
      if (cancelled) {
        setLoading(false)
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
        for (const w of track.waypoints) {
          const el = document.createElement('div')
          el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #f6f4ef;box-shadow:0 1px 5px rgba(0,0,0,.35)`
          markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([w.lng, w.lat]).setPopup(new maplibregl.Popup().setText(w.name)).addTo(currentMap))
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
