import { SetTheme } from '@/components/SetTheme'
import { FormalDetailClient } from '@/components/themes/formal/FormalDetailClient'
import { fetchExpeditionById } from '@/lib/supabase'
import { getServerUserRole } from '@/lib/serverAuth'
import { hasRole } from '@/lib/auth'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FormalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let exp = await fetchExpeditionById(id)
  if (!exp) {
    // Allow ranger+/curator to preview unclaimed (non-public) expeditions from the claim page.
    const role = await getServerUserRole()
    if (hasRole(role, 'ranger')) exp = await fetchExpeditionById(id, { allowPrivate: true })
  }
  if (!exp) notFound()

  return (
    <>
      <SetTheme theme="formal" />
      <FormalDetailClient exp={exp} />
    </>
  )
}
