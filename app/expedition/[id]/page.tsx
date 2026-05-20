import { notFound } from 'next/navigation'
import { fetchExpeditionById } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'
import { ExpeditionDetailClient } from '@/components/ExpeditionDetailClient'
import { SetTheme } from '@/components/SetTheme'

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
      <ExpeditionDetailClient
        exp={exp as unknown as Record<string, unknown>}
        gpxFiles={exp.gpx_files}
        mapFiles={exp.map_files}
        records={exp.records}
      />
    </>
  )
}
