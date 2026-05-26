import { SetTheme } from '@/components/SetTheme'
import { FormalHome } from '@/components/themes/formal/FormalHome'
import { fetchExpeditionYears } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function FormalPage() {
  const years = await fetchExpeditionYears()
  return (
    <>
      <SetTheme theme="formal" />
      <FormalHome years={years} />
    </>
  )
}
