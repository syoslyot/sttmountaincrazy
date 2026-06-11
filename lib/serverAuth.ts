import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { MemberRole } from '@/lib/auth'

/** Reads the current user's role from the session cookie. Server components only. */
export async function getServerUserRole(): Promise<MemberRole | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return (data?.role as MemberRole) ?? null
}
