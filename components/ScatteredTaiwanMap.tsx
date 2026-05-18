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

// BFS: keep counties connected to primary (sel[0]) after removing `removed`
function keepConnected(sel: string[], removed: string, adj: Map<string, Set<string>>): string[] {
  const remaining = sel.filter(c => c !== removed)
  const primary = remaining[0]
  if (!primary) return []
  const visited = new Set([primary])
  const q = [primary]
  while (q.length) {
    const cur = q.shift()!
    for (const nb of (adj.get(cur) ?? new Set<string>())) {
      if (remaining.includes(nb) && !visited.has(nb)) { visited.add(nb); q.push(nb) }
    }
  }
  return remaining.filter(c => visited.has(c))
}

// BFS: keep only counties reachable from sel[0] (used after snap to prevent disconnected groups)
function filterConnected(sel: string[], adj: Map<string, Set<string>>): string[] {
  if (sel.length <= 1) return sel
  const primary = sel[0]
  const visited = new Set([primary])
  const q = [primary]
  while (q.length) {
    const cur = q.shift()!
    for (const nb of (adj.get(cur) ?? new Set<string>())) {
      if (sel.includes(nb) && !visited.has(nb)) { visited.add(nb); q.push(nb) }
    }
  }
  return sel.filter(c => visited.has(c))
}

const PIECE_PAD = 12

function hasNoOverlap(
  xPx: number, yPx: number, w: number, h: number,
  placed: ReadonlyArray<{ x: number; y: number; w: number; h: number }>
): boolean {
  for (const q of placed) {
    if (xPx < q.x + q.w + PIECE_PAD && xPx + w + PIECE_PAD > q.x &&
        yPx < q.y + q.h + PIECE_PAD && yPx + h + PIECE_PAD > q.y) return false
  }
  return true
}

function resolveDropOverlap(
  droppedIdx: number, xPct: number, yPct: number,
  ov: Map<number, Override>, ps: CountyPiece[],
  safeMaxX: number, vw: number, vh: number
): { x: number; y: number } {
  const w = ps[droppedIdx].displayW, h = ps[droppedIdx].displayH
  let x = xPct, y = yPct
  for (let iter = 0; iter < 20; iter++) {
    const xPx = x / 100 * vw, yPx = y / 100 * vh
    let pushed = false
    for (let j = 0; j < ps.length; j++) {
      if (j === droppedIdx) continue
      const pj = ps[j]
      const jPos = ov.get(j) ?? pj
      const jx = jPos.x / 100 * vw, jy = jPos.y / 100 * vh
      if (xPx < jx + pj.displayW + PIECE_PAD && xPx + w + PIECE_PAD > jx &&
          yPx < jy + pj.displayH + PIECE_PAD && yPx + h + PIECE_PAD > jy) {
        const cx = (xPx + w / 2) - (jx + pj.displayW / 2) || 1
        const cy = (yPx + h / 2) - (jy + pj.displayH / 2) || 0.1
        const mag = Math.hypot(cx, cy)
        const olvX = Math.min(xPx + w, jx + pj.displayW) - Math.max(xPx, jx) + PIECE_PAD
        const olvY = Math.min(yPx + h, jy + pj.displayH) - Math.max(yPx, jy) + PIECE_PAD
        x += (cx / mag * Math.min(olvX, olvY)) / vw * 100
        y += (cy / mag * Math.min(olvX, olvY)) / vh * 100
        pushed = true
      }
    }
    if (!pushed) break
  }
  return {
    x: Math.max(1, Math.min(safeMaxX, x)),
    y: Math.max(1, Math.min(89, y)),
  }
}

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

interface Override { x: number; y: number; rotation?: number }

interface Props {
  selected: string[]
  onSelect: (counties: string[]) => void
  variant: 'puzzle' | 'fall'
  fillNormal: string
  fillSelected: string
  stroke: string
  glowColor?: string
  maxPx?: number
  showLabels?: boolean
}

export function ScatteredTaiwanMap({ selected, onSelect, variant, fillNormal, fillSelected, stroke, glowColor, maxPx = 140, showLabels = false }: Props) {
  const [pieces, setPieces]               = useState<CountyPiece[]>([])
  const [hovered, setHovered]             = useState<string | null>(null)
  const [overrides, setOverrides]         = useState<Map<number, Override>>(new Map())
  const [snapCandidate, setSnapCandidate] = useState<{ name: string; idx: number } | null>(null)

  const piecesRef        = useRef<CountyPiece[]>([])
  const overridesRef     = useRef<Map<number, Override>>(new Map())
  const adjacencyRef     = useRef<Map<string, Set<string>>>(new Map())
  const snapRef          = useRef<{ name: string; idx: number } | null>(null)
  const selectedRef      = useRef<string[]>(selected)
  const onSelectRef      = useRef<(c: string[]) => void>(onSelect)
  const globalScaleRef   = useRef<number>(1)
  const safeMaxXRef      = useRef<number>(62)
  const mousedownTimeRef = useRef<number>(0)
  const originalPosRef   = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastMoveXYRef    = useRef<{ idx: number; x: number; y: number } | null>(null)

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

  useEffect(() => {
    if (variant !== 'puzzle') return

    // Push non-selected pieces away from the combined group's centroid
    function recalcPush(nextSel: string[]) {
      if (piecesRef.current.length === 0) return
      const vw = window.innerWidth; const vh = window.innerHeight
      const selIdxs = piecesRef.current
        .map((p, i) => nextSel.includes(p.name) ? i : -1)
        .filter(i => i >= 0)

      if (selIdxs.length < 2) {
        if (originalPosRef.current.size === 0) return
        const nextOv = new Map(overridesRef.current)
        originalPosRef.current.forEach((orig, i) => {
          nextOv.set(i, { ...nextOv.get(i), x: orig.x, y: orig.y })
        })
        originalPosRef.current.clear()
        overridesRef.current = nextOv
        setOverrides(nextOv)
        return
      }

      let gx = 0, gy = 0
      selIdxs.forEach(i => {
        const p = piecesRef.current[i]
        const pos = overridesRef.current.get(i) ?? p
        gx += pos.x / 100 * vw + p.displayW / 2
        gy += pos.y / 100 * vh + p.displayH / 2
      })
      gx /= selIdxs.length; gy /= selIdxs.length

      const nextOv = new Map(overridesRef.current)
      const nowPushed = new Set<number>()

      piecesRef.current.forEach((p, i) => {
        if (nextSel.includes(p.name)) return
        const pos = overridesRef.current.get(i) ?? p
        const px = pos.x / 100 * vw + p.displayW / 2
        const py = pos.y / 100 * vh + p.displayH / 2
        const dist = Math.hypot(px - gx, py - gy)

        if (dist < 200) {
          if (!originalPosRef.current.has(i)) originalPosRef.current.set(i, { x: pos.x, y: pos.y })
          const ddx = px - gx || 0.1; const ddy = py - gy || 0.1
          const mag = Math.hypot(ddx, ddy)
          const pushPx = 200 - dist + 60
          nextOv.set(i, {
            ...nextOv.get(i),
            x: Math.max(1, Math.min(safeMaxXRef.current, pos.x + (ddx / mag * pushPx) / vw * 100)),
            y: Math.max(1, Math.min(89, pos.y + (ddy / mag * pushPx) / vh * 100)),
          })
          nowPushed.add(i)
        } else if (originalPosRef.current.has(i) && !nowPushed.has(i)) {
          const orig = originalPosRef.current.get(i)!
          originalPosRef.current.delete(i)
          nextOv.set(i, { ...nextOv.get(i), x: orig.x, y: orig.y })
        }
      })
      overridesRef.current = nextOv
      setOverrides(nextOv)
    }

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (e.clientX - d.startX) / window.innerWidth * 100
      const dy = (e.clientY - d.startY) / window.innerHeight * 100
      if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) d.moved = true
      const newX = d.origX + dx
      const newY = d.origY + dy
      lastMoveXYRef.current = { idx: d.idx, x: newX, y: newY }
      setOverrides(prev => new Map(prev).set(d.idx, { ...prev.get(d.idx), x: newX, y: newY }))

      const adj = adjacencyRef.current.get(d.name)
      let found: { name: string; idx: number } | null = null
      if (adj && d.moved) {
        for (let j = 0; j < piecesRef.current.length; j++) {
          const piece = piecesRef.current[j]
          if (piece.name === d.name || !adj.has(piece.name)) continue
          const pPos = overridesRef.current.get(j) ?? { x: piece.x, y: piece.y }
          const snapPx = Math.hypot(
            (newX - pPos.x) / 100 * window.innerWidth,
            (newY - pPos.y) / 100 * window.innerHeight,
          )
          if (snapPx < 150) { found = { name: piece.name, idx: j }; break }
        }
      }
      if (found?.name !== snapRef.current?.name) {
        snapRef.current = found
        setSnapCandidate(found)
      }
    }

    const onUp = () => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null

      const sel = selectedRef.current
      const snap = snapRef.current
      const elapsed = Date.now() - mousedownTimeRef.current

      if (!d.moved && elapsed < 1000) {
        // Quick click (< 1s hold)
        if (!sel.includes(d.name)) {
          // Click unselected county → replace entire selection
          onSelectRef.current([d.name])
          recalcPush([d.name])
        } else if (sel[0] === d.name) {
          // Click the primary county → deselect everything
          onSelectRef.current([])
          recalcPush([])
        } else {
          // Click non-primary in group → remove + BFS connectivity check
          const newSel = keepConnected(sel, d.name, adjacencyRef.current)
          onSelectRef.current(newSel)
          recalcPush(newSel)
        }
      } else if (d.moved && snap) {
        // Snap: position-align both pieces, accumulate selection
        const targetPiece  = piecesRef.current[snap.idx]
        const draggedPiece = piecesRef.current[d.idx]
        const targetPos = overridesRef.current.get(snap.idx) ?? { x: targetPiece.x, y: targetPiece.y }
        const [tx0, ty0] = targetPiece.viewBox.split(' ').map(Number)
        const [dx0, dy0] = draggedPiece.viewBox.split(' ').map(Number)
        const gs = globalScaleRef.current
        const newX = targetPos.x + (dx0 - tx0) * gs / window.innerWidth  * 100
        const newY = targetPos.y + (dy0 - ty0) * gs / window.innerHeight * 100

        // Update overridesRef immediately; recalcPush will call setOverrides with combined map
        const nextOv = new Map(overridesRef.current)
        nextOv.set(d.idx,    { x: newX,        y: newY,        rotation: 0 })
        nextOv.set(snap.idx, { x: targetPos.x, y: targetPos.y, rotation: 0 })
        overridesRef.current = nextOv

        const rawSel = [...new Set([...sel, d.name, snap.name])]
        const newSel = filterConnected(rawSel, adjacencyRef.current)
        onSelectRef.current(newSel)
        recalcPush(newSel)
      } else if (d.moved) {
        // Drag away (no snap) → remove + BFS connectivity check
        const newSel = keepConnected(sel, d.name, adjacencyRef.current)
        onSelectRef.current(newSel)

        // Push dropped piece away from any piece it landed on
        const last = lastMoveXYRef.current
        const fallback = overridesRef.current.get(d.idx) ?? piecesRef.current[d.idx]
        const finalX = last?.idx === d.idx ? last.x : fallback.x
        const finalY = last?.idx === d.idx ? last.y : fallback.y
        const resolved = resolveDropOverlap(d.idx, finalX, finalY, overridesRef.current, piecesRef.current, safeMaxXRef.current, window.innerWidth, window.innerHeight)
        const nextOv = new Map(overridesRef.current)
        nextOv.set(d.idx, { ...nextOv.get(d.idx), ...resolved })
        overridesRef.current = nextOv

        recalcPush(newSel)
      }
      // else: hold ≥ 1s without movement → do nothing

      snapRef.current = null
      lastMoveXYRef.current = null
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

      const allMaxDims = main.map((f: any) => {
        const b = pathGen.bounds(f)
        return Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1])
      })
      const maxNatDim = Math.max(...allMaxDims)
      const globalScale = maxPx / maxNatDim
      globalScaleRef.current = globalScale

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

      // For puzzle: restrict x to avoid the right expedition panel (≈380px)
      const panelW = variant === 'puzzle' ? 380 : 0
      const safeMaxX = variant === 'puzzle'
        ? Math.min(62, (window.innerWidth - panelW - maxPx - 20) / window.innerWidth * 100)
        : 85
      safeMaxXRef.current = safeMaxX

      const xRange   = safeMaxX - 2
      const yBase    = variant === 'puzzle' ? 2  : 52
      const yRange   = variant === 'puzzle' ? 80 : 30
      const rotRange = variant === 'puzzle' ? 36 : 24

      const vw = window.innerWidth, vh = window.innerHeight
      const placed: Array<{ x: number; y: number; w: number; h: number }> = []

      let gi = 0
      const result: CountyPiece[] = []
      nameToFeatures.forEach((features, name) => {
        const f = features[0]
        const i = gi++
        const bounds = pathGen.bounds(f)
        const [x0, y0] = bounds[0]; const [x1, y1] = bounds[1]
        const natW = x1 - x0; const natH = y1 - y0
        const w = natW * globalScale, h = natH * globalScale

        let px = 2 + Math.random() * xRange
        let py = yBase + Math.random() * yRange
        for (let att = 0; att < 400; att++) {
          const tx = 2 + Math.random() * xRange
          const ty = yBase + Math.random() * yRange
          if (hasNoOverlap(tx / 100 * vw, ty / 100 * vh, w, h, placed)) {
            px = tx; py = ty; break
          }
        }
        placed.push({ x: px / 100 * vw, y: py / 100 * vh, w, h })

        result.push({
          name,
          pathD: pathGen(f) ?? '',
          viewBox: `${x0} ${y0} ${natW} ${natH}`,
          displayW: w,
          displayH: h,
          x: Math.max(1, Math.min(safeMaxX, px)),
          y: Math.max(1, Math.min(89, py)),
          rotation: (Math.random() - 0.5) * rotRange,
          zIndex: 5 + (i % 8),
          fallDuration: 700 + Math.random() * 400,
          fallDelay: i * 55,
        })
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
        const isSnap = snapCandidate?.name === p.name
        const isDragging = dragRef.current?.idx === i
        const pos = overrides.get(i) ?? { x: p.x, y: p.y }
        const rotation = overrides.get(i)?.rotation ?? p.rotation

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
          <div style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 9, whiteSpace: 'nowrap', color: stroke, opacity: showLabels ? 1 : 0, letterSpacing: '0.05em', pointerEvents: 'none', fontFamily: 'monospace', transition: 'opacity 0.2s' }}>
            {p.name}
          </div>
        )

        if (variant === 'puzzle') {
          const scaleXY = isSel ? ' scale(1.1) translateY(-3px)' : isSnap ? ' scale(1.08)' : isHov ? ' scale(1.05) translateY(-2px)' : ''
          return (
            <div key={`${p.name}-${i}`}
              style={{
                position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
                width: p.displayW, height: p.displayH,
                zIndex: p.zIndex + (isDragging ? 60 : isSel ? 50 : isSnap ? 40 : isHov ? 10 : 0),
                cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all',
                transform: `rotate(${rotation}deg)${scaleXY}`,
                filter: shadow,
                transition: isDragging ? 'none' : 'transform 0.2s ease, filter 0.2s ease, left 0.35s ease, top 0.35s ease',
                userSelect: 'none',
              }}
              onMouseDown={e => {
                e.preventDefault()
                mousedownTimeRef.current = Date.now()
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
        const innerScale = isSel ? ' scale(1.1)' : isHov ? ' scale(1.05)' : ''
        return (
          <div key={`${p.name}-${i}`}
            style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, pointerEvents: 'none', zIndex: p.zIndex + (isSel ? 50 : isHov ? 10 : 0), animation: `county-fall-${i} ${p.fallDuration}ms cubic-bezier(0.4, 0, 0.2, 1.3) ${p.fallDelay}ms both` }}>
            <div
              onClick={() => onSelectRef.current(isSel ? selectedRef.current.filter(c => c !== p.name) : [...selectedRef.current, p.name])}
              onMouseEnter={() => setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: 'relative', width: p.displayW, height: p.displayH, cursor: 'pointer', pointerEvents: 'all', transform: `rotate(${rotation}deg)${innerScale}`, filter: shadow, transition: 'transform 0.2s ease, filter 0.2s ease' }}>
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
