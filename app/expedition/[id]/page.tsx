import { notFound } from 'next/navigation'
import { fetchExpeditionById } from '@/lib/supabase'
import { Navbar } from '@/components/themes/rocket/Navbar'
import { RocketExpeditionDetailClient } from '@/components/themes/rocket/RocketExpeditionDetailClient'
import { SetTheme } from '@/components/SetTheme'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExpeditionPage({ params }: Props) {
  const { id } = await params
  const exp = await fetchExpeditionById(id)
  if (!exp) notFound()

  return (
    <>
      <SetTheme theme="rocket" />
      <Navbar />
      <RocketExpeditionDetailClient
        exp={exp as unknown as Record<string, unknown>}
        gpxFiles={exp.gpx_files}
        mapFiles={exp.map_files}
        records={exp.records}
        storageBase={`${process.env.SUPABASE_URL}/storage/v1/object/public`}
      />
    </>
  )
}
