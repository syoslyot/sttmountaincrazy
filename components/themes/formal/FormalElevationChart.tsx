'use client'

import { useState } from 'react'

export interface ElevPoint { dist: number; ele: number; lat: number; lng: number }

function subsample(pts: ElevPoint[], max: number) {
  if (pts.length <= max) return pts
  const step = Math.ceil(pts.length / max)
  return pts.filter((_,i) => i % step === 0 || i === pts.length-1)
}

export function FormalElevationChart({ points, onHover, onLeave }: {
  points: ElevPoint[]
  onHover?: (pt: ElevPoint) => void
  onLeave?: () => void
}) {
  const [hoverPt, setHoverPt] = useState<ElevPoint | null>(null)
  if (points.length < 2) return null

  const W = 800, H = 112
  const PAD = { top: 14, right: 16, bottom: 30, left: 54 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const maxDist = points[points.length-1].dist
  const eles = points.map(p => p.ele)
  const minE = Math.min(...eles), maxE = Math.max(...eles), eRange = maxE - minE || 1
  const sx = (d: number) => PAD.left + (d/maxDist)*iW
  const sy = (e: number) => PAD.top + iH - ((e-minE)/eRange)*iH
  const chartPts = subsample(points, 800)
  const pathD = chartPts.map((p,i) => `${i===0?'M':'L'}${sx(p.dist).toFixed(1)},${sy(p.ele).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${sx(maxDist).toFixed(1)},${(PAD.top+iH).toFixed(1)} L${PAD.left},${(PAD.top+iH).toFixed(1)} Z`

  let gain = 0, loss = 0, prev = points[0].ele
  for (let i = 1; i < points.length; i++) {
    const d = points[i].ele - prev
    if (Math.abs(d) > 5) { d > 0 ? gain+=d : loss-=d; prev = points[i].ele }
  }

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const tgt = Math.max(0, Math.min(maxDist, ((e.clientX-r.left)/r.width*W - PAD.left)/iW*maxDist))
    const best = points.reduce((a,p) => Math.abs(p.dist-tgt) < Math.abs(a.dist-tgt) ? p : a)
    setHoverPt(best); onHover?.(best)
  }

  // Y-axis grid: 4 ticks
  const yTicks = [0,1,2,3].map(i => minE + eRange*i/3)
  // X-axis labels: up to 6 ticks
  const xTickCount = Math.min(6, Math.floor(maxDist/10000) + 1)
  const xTicks = Array.from({ length: xTickCount }, (_, i) => maxDist * i / (xTickCount - 1))

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--bg)',
      borderTop: '0.5px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '8px 20px 4px',
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.18em', color: 'var(--muted)',
      }}>
        <span>海拔圖 · ELEVATION</span>
        <span style={{ display: 'flex', gap: 20 }}>
          <span>↔ {(maxDist/1000).toFixed(1)} km</span>
          <span>↑ {Math.round(gain)} m</span>
          <span>↓ {Math.round(loss)} m</span>
          <span>▲ {Math.round(maxE)} m</span>
        </span>
      </div>
      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={() => { setHoverPt(null); onLeave?.() }}>

        <path d={areaD} fill="color-mix(in oklch, var(--accent) 15%, transparent)" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />

        {yTicks.map((e, i) => {
          const y = sy(e)
          return <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left+iW} y2={y}
              stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.left-6} y={y+4} textAnchor="end" fontSize="10"
              fill="var(--muted)" fontFamily="var(--mono)">{Math.round(e)}</text>
          </g>
        })}

        {xTicks.map((d, i) => (
          <text key={i} x={sx(d)} y={H-6} textAnchor="middle" fontSize="10"
            fill="var(--muted)" fontFamily="var(--mono)">
            {(d/1000).toFixed(0)}k
          </text>
        ))}

        {hoverPt && (() => {
          const hx = sx(hoverPt.dist), hy = sy(hoverPt.ele)
          const lbl = `${(hoverPt.dist/1000).toFixed(1)}km · ${Math.round(hoverPt.ele)}m`
          const tw = lbl.length*5.5+12, tx = hx+8+tw>W ? hx-tw-8 : hx+8
          return <g>
            <line x1={hx} y1={PAD.top} x2={hx} y2={PAD.top+iH}
              stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={hx} cy={hy} r={4} fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
            <rect x={tx} y={hy-17} width={tw} height={14}
              fill="var(--bg)" stroke="var(--accent)" strokeWidth="0.5" rx={1} />
            <text x={tx+6} y={hy-6} fontSize="10" fill="var(--accent)"
              fontFamily="var(--mono)">{lbl}</text>
          </g>
        })()}
      </svg>
    </div>
  )
}
