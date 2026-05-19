'use client'

import dynamic from 'next/dynamic'
import { useTheme } from './ThemeProvider'

const BrutalHome = dynamic(() => import('./themes/brutal/BrutalHome').then(m => m.BrutalHome), { ssr: false })
const ShowaHome  = dynamic(() => import('./themes/showa/ShowaHome').then(m => m.ShowaHome),   { ssr: false })
const NeonHome   = dynamic(() => import('./themes/neon/NeonHome').then(m => m.NeonHome),       { ssr: false })
const RocketHome = dynamic(() => import('./themes/rocket/RocketHome').then(m => m.RocketHome), { ssr: false })
const TopoHome   = dynamic(() => import('./themes/topo/TopoHome').then(m => m.TopoHome),       { ssr: false })

export function HomeClient() {
  const theme = useTheme()

  switch (theme) {
    case 'brutal': return <BrutalHome />
    case 'showa':  return <ShowaHome />
    case 'neon':   return <NeonHome />
    case 'rocket': return <RocketHome />
    case 'topo':   return <TopoHome />
  }
}
