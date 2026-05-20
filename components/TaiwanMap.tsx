'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react'

const COUNTY_NORMALIZE: Record<string, string> = {
  '台北市': '台北', '臺北市': '台北', '新北市': '新北', '基隆市': '基隆',
  '宜蘭縣': '宜蘭', '桃園市': '桃園', '新竹市': '新竹', '新竹縣': '新竹',
  '苗栗縣': '苗栗', '台中市': '台中', '臺中市': '台中', '花蓮縣': '花蓮',
  '彰化縣': '彰化', '南投縣': '南投', '雲林縣': '雲林', '嘉義市': '嘉義',
  '嘉義縣': '嘉義', '台南市': '台南', '臺南市': '台南', '高雄市': '高雄',
  '屏東縣': '屏東', '台東縣': '台東',
}
const ISLANDS = new Set(['澎湖縣', '金門縣', '連江縣'])

interface Props {
  selected: string | null
  onSelect: (county: string | null) => void
}

export function TaiwanMap({ selected, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const stateRef = useRef({ selected, onSelect, g: null as any, getColor: null as any })
  // eslint-disable-next-line react-hooks/refs
  stateRef.current.selected = selected
  // eslint-disable-next-line react-hooks/refs
  stateRef.current.onSelect = onSelect

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    let alive = true

    Promise.all([
      import('d3'),
      import('topojson-client'),
      fetch('https://cdn.jsdelivr.net/npm/taiwan-atlas/counties-10t.json').then(r => r.json()),
    ]).then(([d3, topo, tw]) => {
      if (!alive || !svgRef.current) return
      const w = svgEl.clientWidth || 280
      const h = svgEl.clientHeight || 460
      const d3svg = d3.select(svgEl)
      d3svg.selectAll('*').remove()

      const counties: any = (topo as any).feature(tw, tw.objects.counties)
      const main = counties.features.filter((f: any) => !ISLANDS.has(f.properties.COUNTYNAME))
      const proj = d3.geoMercator().fitExtent([[16, 16], [w - 16, h - 16]], { type: 'FeatureCollection', features: main } as any)
      const pathGen = d3.geoPath().projection(proj)

      const g = d3svg.append('g')
      stateRef.current.g = g

      const getColor = (f: any) => {
        const name = f.properties.COUNTYNAME
        if (ISLANDS.has(name)) return 'var(--bg-alt)'
        const display = COUNTY_NORMALIZE[name]
        return display === stateRef.current.selected ? 'var(--accent)' : 'var(--accent2)'
      }
      stateRef.current.getColor = getColor

      const paths = g.selectAll('path').data(counties.features).join('path')
        .attr('d', (d: any) => pathGen(d) ?? '')
        .attr('fill', getColor)
        .attr('stroke', 'var(--bg)')
        .attr('stroke-width', 0.7)
        .style('pointer-events', 'none')

      // Canvas hit-test
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      const pathCanvas = d3.geoPath().projection(proj).context(ctx)

      let hovered: any = null

      const hit = (mx: number, my: number) =>
        counties.features.find((f: any) => {
          if (ISLANDS.has(f.properties.COUNTYNAME)) return false
          ctx.beginPath(); pathCanvas(f)
          return ctx.isPointInPath(mx, my)
        }) ?? null

      const recolor = () => paths.attr('fill', (d: any) => d === hovered
        ? (ISLANDS.has(d.properties.COUNTYNAME) ? 'var(--bg-alt)' : 'var(--fg-muted)')
        : getColor(d))

      const toXY = (e: MouseEvent) => {
        const r = svgEl.getBoundingClientRect()
        return [(e.clientX - r.left) * w / r.width, (e.clientY - r.top) * h / r.height] as const
      }

      const onMove = (e: MouseEvent) => {
        const [mx, my] = toXY(e)
        const f = hit(mx, my)
        if (f === hovered) return
        hovered = f
        svgEl.style.cursor = f ? 'pointer' : 'default'
        recolor()
      }
      const onClick = (e: MouseEvent) => {
        const [mx, my] = toXY(e)
        const f = hit(mx, my)
        if (!f) return
        const display = COUNTY_NORMALIZE[f.properties.COUNTYNAME] ?? null
        stateRef.current.onSelect(display === stateRef.current.selected ? null : display)
      }
      const onLeave = () => { hovered = null; svgEl.style.cursor = 'default'; recolor() }

      svgEl.addEventListener('mousemove', onMove)
      svgEl.addEventListener('click', onClick)
      svgEl.addEventListener('mouseleave', onLeave)

      return () => {
        svgEl.removeEventListener('mousemove', onMove)
        svgEl.removeEventListener('click', onClick)
        svgEl.removeEventListener('mouseleave', onLeave)
      }
    })

    return () => { alive = false }
  }, [])

  // Re-color on selection change
  useEffect(() => {
    const { g, getColor } = stateRef.current
    if (g && getColor) g.selectAll('path').attr('fill', getColor)
  }, [selected])

  return <svg ref={svgRef} style={{ width: '100%', height: '100%', maxHeight: '100%' }} />
}
