import { SetTheme } from '@/components/SetTheme'
import { FormalDetailClient } from '@/components/themes/formal/FormalDetailClient'
import { fetchExpeditionById } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FormalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const exp = await fetchExpeditionById(id)
  if (!exp) notFound()

  return (
    <>
      <SetTheme theme="formal" />
      <FormalDetailClient exp={exp} />
    </>
  )
}
