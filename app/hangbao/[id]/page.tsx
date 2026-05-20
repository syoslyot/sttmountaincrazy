import { notFound } from 'next/navigation'
import { sttFetch } from '@/lib/api'
import { HangbaoDetail, type ExpData } from '@/components/themes/hangbao/HangbaoDetail'

interface Props { params: Promise<{ id: string }> }

export default async function HangbaoDetailPage({ params }: Props) {
  const { id } = await params

  const res = await sttFetch(`/api/expeditions/${id}`)
  if (!res.ok) notFound()

  const data = await res.json() as Record<string, unknown>

  const records = data.records as { filename: string; content: string }[]
  const mapFiles = data.map_files as { file_path: string }[]
  const gpxPaths = ((data.gpx_paths as string | null) ?? '').split(',').filter(Boolean)

  return <HangbaoDetail exp={data as unknown as ExpData} gpxPaths={gpxPaths} records={records} mapFiles={mapFiles} />
}
