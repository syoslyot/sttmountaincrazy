import { notFound } from 'next/navigation'
import { fetchExpeditionById } from '@/lib/supabase'
import { FormalEditClient } from '@/components/themes/formal/FormalEditClient'
import { SetTheme } from '@/components/SetTheme'

export const metadata = { title: '編輯出隊紀錄 · 成大山協' }
export const dynamic = 'force-dynamic'

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const exp = await fetchExpeditionById(id)
  if (!exp) notFound()
  return (
    <>
      <SetTheme theme="formal" />
      <FormalEditClient expeditionId={id} initialData={exp} />
    </>
  )
}
