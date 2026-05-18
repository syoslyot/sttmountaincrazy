'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'

const COUNTY_NORMALIZE: Record<string, string> = {
  '台北市': '台北', '臺北市': '台北', '新北市': '新北', '基隆市': '基隆',
  '宜蘭縣': '宜蘭', '桃園市': '桃園', '新竹市': '新竹', '新竹縣': '新竹',
  '苗栗縣': '苗栗', '台中市': '台中', '臺中市': '台中', '花蓮縣': '花蓮',
  '彰化縣': '彰化', '南投縣': '南投', '雲林縣': '雲林', '嘉義市': '嘉義',
  '嘉義縣': '嘉義', '台南市': '台南', '臺南市': '台南', '高雄市': '高雄',
  '屏東縣': '屏東', '台東縣': '台東',
}
const ISLANDS = new Set(['澎湖縣', '金門縣', '連江縣'])

function seededRand(seed: number) { return Math.abs(Math.sin(seed + 1) * 10000) % 1 }
function nameHash(s: string) { return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) }

interface CountyPiece {
  name: string
  pathD: string
  viewBox: string
  displayW: number
  displayH: number
  x: number
  y: number
  rotation: number
  zIndex: number
  fallDuration: number
  fallDelay: number
}

interface Props {
  selected: string[]
  onSelect: (counties: string[]) => void
  variant: 'puzzle' | 'fall'
  fillNormal: string
  fillSelected: string
  stroke: string
  glowColor?: string
  maxPx?: number
}

export function ScatteredTaiwanMap({ selected, onSelect, variant, fillNormal, fillSelected, stroke, glowColor, maxPx = 140 }: Props) {
  const [pieces, setPieces]         = useState<CountyPiece[]>([])
  const [hovered, setHovered]       = useState<string | null>(null)
  const [overrides, setOverrides]   = useState<Map<number, { x: number; y: number }>>(new Map())
  const [snapCandidate, setSnapCandidate] = useState<string | null>(null)

  const piecesRef       = useRef<CountyPiece[]>([])
  const overridesRef    = useRef<Map<number, { x: number; y: number }>>(new Map())
  const adjacencyRef    = useRef<Map<string, Set<string>>>(new Map())
  const snapRef         = useRef<string | null>(null)
  const selectedRef     = useRef<string[]>(selected)
  const onSelectRef     = useRef<(c: string[]) => void>(onSelect)

  const dragRef = useRef<{
    idx: number; name: string
    startX: number; startY: number
    origX: number; origY: number
    moved: boolean
  } | null>(null)

  useEffect(() => { piecesRef.current = pieces }, [pieces])
  useEffect(() => { overridesRef.current = overrides }, [overrides])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // Global drag handlers — only for puzzle variant, stable (no deps re-register)
  useEffect(() => {
    if (variant !== 'puzzle') return

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (e.clientX - d.startX) / window.innerWidth * 100
      const dy = (e.clientY - d.startY) / window.innerHeight * 100
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) d.moved = true
      const newX = d.origX + dx
      const newY = d.origY + dy
      setOverrides(prev => new Map(prev).set(d.idx, { x: newX, y: newY }))

      const adj = adjacencyRef.current.get(d.name)
      let found: string | null = null
      if (adj && d.moved) {
        for (let j = 0; j < piecesRef.current.length; j++) {
          const piece = piecesRef.current[j]
          if (piece.name === d.name || !adj.has(piece.name)) continue
          const pPos = overridesRef.current.get(j) ?? { x: piece.x, y: piece.y }
          if (Math.hypot(newX - pPos.x, newY - pPos.y) < 15) { found = piece.name; break }
        }
      }
      if (found !== snapRef.current) {
        snapRef.current = found
        setSnapCandidate(found)
      }
    }

    const onUp = () => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null

      const sel = selectedRef.current
      if (!d.moved) {
        // click: toggle
        onSelectRef.current(sel.includes(d.name) ? sel.filter(c => c !== d.name) : [...sel, d.name])
      } else if (snapRef.current) {
        // snap merge
        onSelectRef.current([...new Set([...sel, d.name, snapRef.current])])
      }
      snapRef.current = null
      setSnapCandidate(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [variant])

  useEffect(() => {
    let alive = true
    Promise.all([
      import('d3'),
      import('topojson-client'),
      fetch('https://cdn.jsdelivr.net/npm/taiwan-atlas/counties-10t.json').then(r => r.json()),
    ]).then(([d3lib, topoClient, tw]) => {
      if (!alive) return
      const countiesGeo = (topoClient as any).feature(tw, tw.objects.counties)
      const main = countiesGeo.features.filter((f: any) => !ISLANDS.has(f.properties.COUNTYNAME))

      const proj = (d3lib as any).geoMercator().fitExtent([[0, 0], [1000, 1600]], { type: 'FeatureCollection', features: main })
      const pathGen = (d3lib as any).geoPath().projection(proj)

      // Group features by normalized county name
      const nameToFeatures = new Map<string, any[]>()
      main.forEach((f: any) => {
        const name = COUNTY_NORMALIZE[f.properties.COUNTYNAME] ?? f.properties.COUNTYNAME
        if (!nameToFeatures.has(name)) nameToFeatures.set(name, [])
        nameToFeatures.get(name)!.push(f)
      })

      // Adjacency from TopoJSON arc sharing
      const arcToNames = new Map<number, Set<string>>()
      tw.objects.counties.geometries.forEach((g: any) => {
        if (ISLANDS.has(g.properties.COUNTYNAME)) return
        const name = COUNTY_NORMALIZE[g.properties.COUNTYNAME] ?? g.properties.COUNTYNAME
        const flatArcs = (arcs: any[]): number[] => {
          if (!Array.isArray(arcs) || arcs.length === 0) return []
          if (typeof arcs[0] === 'number') return arcs.map((a: number) => (a < 0 ? ~a : a))
          return arcs.flatMap(flatArcs)
        }
        flatArcs(g.arcs ?? []).forEach(a => {
          if (!arcToNames.has(a)) arcToNames.set(a, new Set())
          arcToNames.get(a)!.add(name)
        })
      })
      const adj = new Map<string, Set<string>>()
      arcToNames.forEach(names => {
        if (names.size < 2) return
        const list = [...names]
        list.forEach((a, i) => list.forEach((b, j) => {
          if (i >= j) return
          if (!adj.has(a)) adj.set(a, new Set())
          if (!adj.has(b)) adj.set(b, new Set())
          adj.get(a)!.add(b); adj.get(b)!.add(a)
        }))
      })
      adjacencyRef.current = adj

      const xRange  = variant === 'puzzle' ? 86 : 83
      const yBase   = variant === 'puzzle' ? 2  : 52
      const yRange  = variant === 'puzzle' ? 80 : 30
      const rotRange = variant === 'puzzle' ? 36 : 24

      let gi = 0
      const result: CountyPiece[] = []
      nameToFeatures.forEach((features, name) => {
        const target = 1 + Math.floor(seededRand(nameHash(name) % 100) * 3)
        for (let t = 0; t < target; t++) {
          const f = features[t % features.length]
          const i = gi++
          const bounds = pathGen.bounds(f)
          const [x0, y0] = bounds[0]; const [x1, y1] = bounds[1]
          const natW = x1 - x0; const natH = y1 - y0
          const scale = Math.min(maxPx / natW, maxPx / natH)
          const xOff = t > 0 ? (seededRand(nameHash(name) + t * 7) - 0.5) * 14 : 0
          const yOff = t > 0 ? (seededRand(nameHash(name) + t * 13) - 0.5) * 10 : 0

          result.push({
            name,
            pathD: pathGen(f) ?? '',
            viewBox: `${x0} ${y0} ${natW} ${natH}`,
            displayW: natW * scale,
            displayH: natH * scale,
            x: Math.max(1, Math.min(94, 2 + seededRand(i * 3) * xRange + xOff)),
            y: Math.max(1, Math.min(89, yBase + seededRand(i * 3 + 1) * yRange + yOff)),
            rotation: (seededRand(i * 3 + 2) - 0.5) * rotRange,
            zIndex: 5 + (i % 8),
            fallDuration: 700 + seededRand(i) * 400,
            fallDelay: i * 55,
          })
        }
      })

      if (alive) setPieces(result)
    })
    return () => { alive = false }
  }, [variant, maxPx])

  if (pieces.length === 0) return null

  const fallCSS = variant === 'fall'
    ? pieces.map((_, i) => `@keyframes county-fall-${i} { from { transform: translateY(-120vh); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`).join('\n')
    : ''

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      {variant === 'fall' && <style>{fallCSS}</style>}

      {pieces.map((p, i) => {
        const isSel = selected.includes(p.name)
        const isHov = hovered === p.name
        const isSnap = snapCandidate === p.name
        const isDragging = dragRef.current?.idx === i
        const pos = overrides.get(i) ?? { x: p.x, y: p.y }

        let shadow: string
        if (glowColor) {
          shadow = isSel
            ? `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 24px ${glowColor}88)`
            : isHov ? `drop-shadow(0 0 5px ${glowColor}88)` : 'none'
        } else {
          shadow = isSel
            ? 'drop-shadow(0 6px 20px rgba(0,0,0,0.5))'
            : isHov ? 'drop-shadow(2px 6px 14px rgba(0,0,0,0.38))' : 'drop-shadow(2px 4px 8px rgba(0,0,0,0.2))'
        }

        const label = (
          <div style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 9, whiteSpace: 'nowrap', color: stroke, opacity: isSel ? 0.9 : 0.45, letterSpacing: '0.05em', pointerEvents: 'none', fontFamily: 'monospace' }}>
            {p.name}
          </div>
        )

        if (variant === 'puzzle') {
          const scaleXY = isSel ? ' scale(1.12) translateY(-4px)' : isSnap ? ' scale(1.1)' : isHov ? ' scale(1.06) translateY(-2px)' : ''
          return (
            <div key={`${p.name}-${i}`}
              style={{
                position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
                width: p.displayW, height: p.displayH,
                zIndex: p.zIndex + (isDragging ? 30 : isSel ? 20 : isHov ? 10 : 0),
                cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all',
                transform: `rotate(${p.rotation}deg)${scaleXY}`,
                filter: shadow,
                transition: isDragging ? 'none' : 'transform 0.2s ease, filter 0.2s ease',
                userSelect: 'none',
              }}
              onMouseDown={e => {
                e.preventDefault()
                const cur = overrides.get(i) ?? { x: p.x, y: p.y }
                dragRef.current = { idx: i, name: p.name, startX: e.clientX, startY: e.clientY, origX: cur.x, origY: cur.y, moved: false }
              }}
              onMouseEnter={() => setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
            >
              <svg viewBox={p.viewBox} width={p.displayW} height={p.displayH} style={{ display: 'block', overflow: 'visible' }}>
                <path d={p.pathD}
                  fill={isSel ? fillSelected : fillNormal}
                  stroke={stroke}
                  strokeWidth={isSel ? 1.5 : isSnap ? 2 : 0.8}
                  strokeDasharray={isSnap ? '4 2' : undefined}
                  style={{ transition: 'fill 0.15s' }}
                />
              </svg>
              {label}
            </div>
          )
        }

        // fall variant — click-only (no drag)
        const innerScale = isSel ? ' scale(1.12)' : isHov ? ' scale(1.06)' : ''
        return (
          <div key={`${p.name}-${i}`}
            style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, pointerEvents: 'none', zIndex: p.zIndex + (isSel ? 20 : isHov ? 10 : 0), animation: `county-fall-${i} ${p.fallDuration}ms cubic-bezier(0.4, 0, 0.2, 1.3) ${p.fallDelay}ms both` }}>
            <div
              onClick={() => onSelectRef.current(isSel ? selectedRef.current.filter(c => c !== p.name) : [...selectedRef.current, p.name])}
              onMouseEnter={() => setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: 'relative', width: p.displayW, height: p.displayH, cursor: 'pointer', pointerEvents: 'all', transform: `rotate(${p.rotation}deg)${innerScale}`, filter: shadow, transition: 'transform 0.2s ease, filter 0.2s ease' }}>
              <svg viewBox={p.viewBox} width={p.displayW} height={p.displayH} style={{ display: 'block', overflow: 'visible' }}>
                <path d={p.pathD} fill={isSel ? fillSelected : fillNormal} stroke={stroke} strokeWidth={isSel ? 1.5 : 0.8} style={{ transition: 'fill 0.15s' }} />
              </svg>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
