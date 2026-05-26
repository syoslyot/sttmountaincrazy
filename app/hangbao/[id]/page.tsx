import { notFound } from 'next/navigation'
import { fetchExpeditionById } from '@/lib/supabase'
import { HangbaoDetail } from '@/components/themes/hangbao/HangbaoDetail'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function HangbaoDetailPage({ params }: Props) {
  const { id } = await params
  const exp = await fetchExpeditionById(id)
  if (!exp) notFound()

  return (
    <>
      <HangbaoDetail exp={exp} gpxFiles={exp.gpx_files} records={exp.records} mapFiles={exp.map_files} storageBase={`${process.env.SUPABASE_URL}/storage/v1/object/public`} />
    </>
  )
}
