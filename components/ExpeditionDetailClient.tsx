'use client'

import dynamic from 'next/dynamic'

const RocketExpeditionDetailClient = dynamic(
  () => import('./themes/rocket/RocketExpeditionDetailClient').then(m => m.RocketExpeditionDetailClient),
  { ssr: false }
)

interface Props {
  exp: Record<string, unknown>
  gpxPaths: string[]
  mapFiles: { file_path: string }[]
  records: { filename: string; content: string }[]
}

export function ExpeditionDetailClient({ exp, gpxPaths, mapFiles, records }: Props) {
  return <RocketExpeditionDetailClient exp={exp} gpxPaths={gpxPaths} mapFiles={mapFiles} records={records} />
}
