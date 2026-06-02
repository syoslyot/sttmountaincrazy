import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type MemberRole = 'staff' | 'member' | 'newcomer' | 'partner'

export interface UserProfile {
  id: string
  user_id: string
  role: MemberRole
  display_name: string | null
  created_at: string
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  staff:    '資料組管理員',
  member:   '山協隊員',
  newcomer: '山協新生',
  partner:  '校外夥伴',
}

// Higher rank = broader access
const ROLE_RANK: Record<MemberRole, number> = {
  staff:    3,
  member:   2,
  newcomer: 1,
  partner:  0,
}

/** Returns true if userRole meets or exceeds minRole in the permission hierarchy. */
export function hasRole(userRole: MemberRole | null, minRole: MemberRole): boolean {
  if (!userRole) return false
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}

// Singleton browser-side client — auth operations only.
// Data queries must continue to use the server-side client in supabase.ts.
let _browserClient: SupabaseClient | null = null

export function getAuthClient(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _browserClient
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await getAuthClient()
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data as UserProfile
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().auth.signInWithPassword({ email, password })
  return { error }
}

export async function signInWithOAuth(provider: 'google' | 'facebook'): Promise<void> {
  await getAuthClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/member`
        : undefined,
    },
  })
}

export async function signOut(): Promise<void> {
  await getAuthClient().auth.signOut()
}
