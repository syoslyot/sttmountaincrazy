'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Props {
  gpxPaths: string[]
}


export function LeafletMap({ gpxPaths }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then(L => {
      const map = L.map(containerRef.current!, { zoomControl: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)

      map.setView([23.5, 121], 7)

      if (gpxPaths.length === 0) return

      // Load GPX via omnivore-style parsing (use fetch + leaflet polyline)
      const bounds: [number, number][] = []
      const colors = ['#e65100', '#0066cc', '#2d4a2d', '#8b0000']

      Promise.all(
        gpxPaths.map(async (p, i) => {
          // Serve GPX from sttmount static via Next.js API or directly
          // For local dev: read from filesystem via API
          const filename = p.split('/').pop() ?? p
          const url = `/api/gpx?file=${encodeURIComponent(filename)}`
          const res = await fetch(url)
          if (!res.ok) return
          const text = await res.text()
          const parser = new DOMParser()
          const doc = parser.parseFromString(text, 'application/xml')
          const trkpts = Array.from(doc.querySelectorAll('trkpt'))
          if (trkpts.length === 0) return
          const latlngs: [number, number][] = trkpts.map(pt => [
            parseFloat(pt.getAttribute('lat') ?? '0'),
            parseFloat(pt.getAttribute('lon') ?? '0'),
          ])
          latlngs.forEach(ll => bounds.push(ll))
          L.polyline(latlngs, { color: colors[i % colors.length], weight: 3, opacity: 0.85 }).addTo(map)
          if (latlngs[0]) L.circleMarker(latlngs[0], { radius: 6, color: '#fff', fillColor: colors[i % colors.length], fillOpacity: 1, weight: 2 }).addTo(map)
          if (latlngs.at(-1)) L.circleMarker(latlngs.at(-1)!, { radius: 6, color: '#fff', fillColor: '#333', fillOpacity: 1, weight: 2 }).addTo(map)
        })
      ).then(() => {
        if (bounds.length > 0) {
          map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [24, 24] })
        }
      })
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

