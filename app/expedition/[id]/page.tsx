import { notFound } from 'next/navigation'
import { sttFetch } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { ExpeditionDetailClient } from '@/components/ExpeditionDetailClient'
import { SetTheme } from '@/components/SetTheme'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExpeditionPage({ params }: Props) {
  const { id } = await params

  const res = await sttFetch(`/api/expeditions/${id}`)
  if (!res.ok) notFound()

  const data = await res.json() as Record<string, unknown>

  const records = data.records as { filename: string; content: string }[]
  const mapFiles = data.map_files as { file_path: string }[]
  const gpxPaths = ((data.gpx_paths as string | null) ?? '').split(',').filter(Boolean)

  return (
    <>
      <SetTheme theme="rocket" />
      <Navbar />
      <ExpeditionDetailClient exp={data} gpxPaths={gpxPaths} mapFiles={mapFiles} records={records} />
    </>
  )
}
