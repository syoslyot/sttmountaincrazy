import { notFound } from 'next/navigation'
import { fetchExpeditionById } from '@/lib/supabase'
import { HangbaoDetail } from '@/components/themes/hangbao/HangbaoDetail'

interface Props { params: Promise<{ id: string }> }

export default async function HangbaoDetailPage({ params }: Props) {
  const { id } = await params
  const exp = await fetchExpeditionById(id)
  if (!exp) notFound()

  return <HangbaoDetail exp={exp} gpxPaths={(exp.gpx_paths ?? '').split(',').filter(Boolean)} records={exp.records} mapFiles={exp.map_files} />
}
