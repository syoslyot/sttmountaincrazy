'use client'

import dynamic from 'next/dynamic'

const RocketExpeditionDetailClient = dynamic(
  () => import('./themes/rocket/RocketExpeditionDetailClient').then(m => m.RocketExpeditionDetailClient),
  { ssr: false }
)

interface GpxFile { file_path: string; filename: string }

interface Props {
  exp: Record<string, unknown>
  gpxFiles: GpxFile[]
  mapFiles: { file_path: string; filename: string }[]
  records: { filename: string; content: string }[]
}

export function ExpeditionDetailClient({ exp, gpxFiles, mapFiles, records }: Props) {
  return <RocketExpeditionDetailClient exp={exp} gpxFiles={gpxFiles} mapFiles={mapFiles} records={records} />
}
