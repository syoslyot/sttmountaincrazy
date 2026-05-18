'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'

const COUNTY_NORMALIZE: Record<string, string> = {
  '台北市': '台北', '臺北市': '台北', '新北市': '新北', '基隆市': '基隆',
  '宜蘭縣': '宜蘭', '桃園市': '桃園', '新竹市': '新竹', '新竹縣': '新竹',
  '苗栗縣': '苗栗', '台中市': '台中', '臺中市': '台中', '花蓮縣': '花蓮',
  '彰化縣': '彰化', '南投縣': '南投', '雲林縣': '雲林', '嘉義市': '嘉義',
  '嘉義縣': '嘉義', '台南市': '台南', '臺南市': '台南', '高雄市': '高雄',
  '屏東縣': '屏東', '台東縣': '台東',
}
const ISLANDS = new Set(['澎湖縣', '金門縣', '連江縣'])

function seededRand(seed: number) {
  return Math.abs(Math.sin(seed + 1) * 10000) % 1
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

interface Props {
  selected: string | null
  onSelect: (county: string | null) => void
  variant: 'puzzle' | 'fall'
  fillNormal: string
  fillSelected: string
  stroke: string
  glowColor?: string
  maxPx?: number
}

export function ScatteredTaiwanMap({ selected, onSelect, variant, fillNormal, fillSelected, stroke, glowColor, maxPx = 140 }: Props) {
  const [pieces, setPieces] = useState<CountyPiece[]>([])
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      import('d3'),
      import('topojson-client'),
      fetch('https://cdn.jsdelivr.net/npm/taiwan-atlas/counties-10t.json').then(r => r.json()),
    ]).then(([d3lib, topoClient, tw]) => {
      if (!alive) return
      const counties = (topoClient as any).feature(tw, tw.objects.counties)
      const main = counties.features.filter((f: any) => !ISLANDS.has(f.properties.COUNTYNAME))

      const proj = (d3lib as any).geoMercator().fitExtent([[0, 0], [1000, 1600]], { type: 'FeatureCollection', features: main })
      const pathGen = (d3lib as any).geoPath().projection(proj)

      const result: CountyPiece[] = main.map((f: any, i: number) => {
        const bounds = pathGen.bounds(f)
        const [x0, y0] = bounds[0]
        const [x1, y1] = bounds[1]
        const natW = x1 - x0
        const natH = y1 - y0
        const scale = Math.min(maxPx / natW, maxPx / natH)

        const xRange = variant === 'puzzle' ? 86 : 83
        const yBase  = variant === 'puzzle' ? 2  : 52
        const yRange = variant === 'puzzle' ? 80 : 30
        const rotRange = variant === 'puzzle' ? 36 : 24

        return {
          name: COUNTY_NORMALIZE[f.properties.COUNTYNAME] ?? f.properties.COUNTYNAME,
          pathD: pathGen(f) ?? '',
          viewBox: `${x0} ${y0} ${natW} ${natH}`,
          displayW: natW * scale,
          displayH: natH * scale,
          x: 2 + seededRand(i * 3) * xRange,
          y: yBase + seededRand(i * 3 + 1) * yRange,
          rotation: (seededRand(i * 3 + 2) - 0.5) * rotRange,
          zIndex: 5 + (i % 8),
          fallDuration: 700 + seededRand(i) * 400,
          fallDelay: i * 60,
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
        const isSel = selected === p.name
        const isHov = hovered === p.name

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
          const scaleXY = isSel ? ' scale(1.12) translateY(-4px)' : isHov ? ' scale(1.06) translateY(-2px)' : ''
          return (
            <div key={p.name}
              onClick={() => onSelect(isSel ? null : p.name)}
              onMouseEnter={() => setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.displayW, height: p.displayH, zIndex: p.zIndex + (isSel ? 20 : isHov ? 10 : 0), cursor: 'pointer', pointerEvents: 'all', transform: `rotate(${p.rotation}deg)${scaleXY}`, filter: shadow, transition: 'transform 0.2s ease, filter 0.2s ease' }}>
              <svg viewBox={p.viewBox} width={p.displayW} height={p.displayH} style={{ display: 'block', overflow: 'visible' }}>
                <path d={p.pathD} fill={isSel ? fillSelected : fillNormal} stroke={stroke} strokeWidth={isSel ? 1.5 : 0.8} style={{ transition: 'fill 0.15s' }} />
              </svg>
              {label}
            </div>
          )
        }

        // fall variant — outer handles Y animation, inner handles rotation + interaction
        const innerScale = isSel ? ' scale(1.12)' : isHov ? ' scale(1.06)' : ''
        return (
          <div key={p.name}
            style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, pointerEvents: 'none', zIndex: p.zIndex + (isSel ? 20 : isHov ? 10 : 0), animation: `county-fall-${i} ${p.fallDuration}ms cubic-bezier(0.4, 0, 0.2, 1.3) ${p.fallDelay}ms both` }}>
            <div
              onClick={() => onSelect(isSel ? null : p.name)}
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
