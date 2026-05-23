import { unstable_cache } from 'next/cache'
import { SetTheme } from '@/components/SetTheme'
import { FormalHome } from '@/components/themes/formal/FormalHome'
import { fetchExpeditionYears } from '@/lib/supabase'

const getCachedYears = unstable_cache(
  fetchExpeditionYears,
  ['expedition-years'],
  { revalidate: 86400 }
)

export default async function FormalPage() {
  const years = await getCachedYears()
  return (
    <>
      <SetTheme theme="formal" />
      <FormalHome years={years} />
    </>
  )
}
