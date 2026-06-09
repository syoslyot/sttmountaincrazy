import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type MemberRole = 'curator' | 'ranger' | 'cadet' | 'associate'

export interface UserProfile {
  id: string
  user_id: string
  role: MemberRole
  name: string | null
  nickname: string | null
  contact: string | null
  avatar_url: string | null
  email: string | null
  joined_at: string | null
  created_at: string
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  curator:   '山協資料組',
  ranger:    '山協隊員',
  cadet:     '山協新生',
  associate: '山協會員',
}

// Higher rank = broader access
const ROLE_RANK: Record<MemberRole, number> = {
  curator:   3,
  ranger:    2,
  cadet:     1,
  associate: 0,
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
  if (error || !data) {
    console.warn('[fetchUserProfile] failed', { userId, error })
    return null
  }
  return data as UserProfile
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: Error | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const client = getAuthClient()

  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload(path, file, { upsert: true })
  if (uploadError) return { url: null, error: uploadError }

  const { data } = client.storage.from('avatars').getPublicUrl(path)
  const { error: updateError } = await client.rpc('update_own_avatar', { p_avatar_url: data.publicUrl })
  return { url: data.publicUrl, error: updateError }
}

export async function updateUserProfile(
  _userId: string,
  fields: Partial<Pick<UserProfile, 'name' | 'nickname' | 'contact'>>,
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().rpc('update_own_profile', {
    p_name:     fields.name     ?? null,
    p_nickname: fields.nickname ?? null,
    p_contact:  fields.contact  ?? null,
  })
  return { error }
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
        ? `${window.location.origin}/auth/callback`
        : undefined,
    },
  })
}

export async function signOut(): Promise<void> {
  await getAuthClient().auth.signOut()
}

export interface MyMembership {
  id: number
  role: 'leader' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  expedition: {
    id: number
    name: string
    date_start: string
    date_end: string | null
    leader_display: string | null
  } | null
}

export async function listMyMemberships(): Promise<{ data: MyMembership[]; error: Error | null }> {
  const { data, error } = await getAuthClient()
    .from('expedition_members')
    .select('id, role, status, expeditions(id, name, date_start, date_end, leader_display)')
    .order('created_at', { ascending: false })
  if (error) return { data: [], error }

  const rows = (data ?? []).map((row: Record<string, unknown>) => ({
    id:         row.id as number,
    role:       row.role as MyMembership['role'],
    status:     row.status as MyMembership['status'],
    expedition: row.expeditions as MyMembership['expedition'],
  }))

  // Deduplicate by expedition_id: prefer leader role, then approved status
  const seen = new Map<number, MyMembership>()
  for (const m of rows) {
    if (!m.expedition) continue
    const eid = m.expedition.id
    const prev = seen.get(eid)
    if (!prev) { seen.set(eid, m); continue }
    if (m.role === 'leader' && prev.role !== 'leader') { seen.set(eid, m); continue }
    if (m.status === 'approved' && prev.status !== 'approved' && prev.role !== 'leader') { seen.set(eid, m) }
  }

  return { data: Array.from(seen.values()), error: null }
}

export interface PendingClaim {
  id: number
  expedition_id: number
  expedition_name: string
  date_start: string
  grade: string | null
  evidence: string | null
  claimant_name: string
  created_at: string
}

export async function listPendingClaims(): Promise<{ data: PendingClaim[]; error: Error | null }> {
  const { data, error } = await getAuthClient().rpc('list_pending_claims')
  return { data: Array.isArray(data) ? (data as PendingClaim[]) : [], error }
}

export async function reviewClaim(
  claimId: number,
  action: 'approved' | 'rejected',
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().rpc('review_expedition_claim', {
    p_claim_id: claimId,
    p_action:   action,
  })
  return { error }
}

export interface ExpeditionUpdateFields {
  name: string
  grade: string
  date_start: string
  date_end: string | null
  region_entry_county: string | null
  region_entry_town: string | null
  region_exit_county: string | null
  region_exit_town: string | null
  leader_display: string | null
  transport: string | null
  keeper: string | null
  participants: number | null
}

export async function updateExpedition(
  id: number,
  fields: ExpeditionUpdateFields,
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().rpc('update_expedition', {
    p_id:                   id,
    p_name:                 fields.name,
    p_grade:                fields.grade,
    p_date_start:           fields.date_start,
    p_date_end:             fields.date_end,
    p_region_entry_county:  fields.region_entry_county,
    p_region_entry_town:    fields.region_entry_town,
    p_region_exit_county:   fields.region_exit_county,
    p_region_exit_town:     fields.region_exit_town,
    p_leader_display:       fields.leader_display,
    p_transport:            fields.transport,
    p_keeper:               fields.keeper,
    p_participants:         fields.participants,
    p_sync_locked:          true,
  })
  return { error }
}

export interface MemberProfile {
  user_id: string
  name: string | null
  nickname: string | null
  role: string | null
}

export async function listMemberProfiles(): Promise<{ data: MemberProfile[]; error: Error | null }> {
  const { data, error } = await getAuthClient()
    .from('user_profiles')
    .select('user_id, name, nickname, role')
  return { data: Array.isArray(data) ? (data as MemberProfile[]) : [], error }
}

export interface ExpeditionMember {
  user_id: string
  role: string              // 'leader' | 'member'
  expedition_role: string | null  // 嚮導 / 隊員 / 新生
  can_edit: boolean
  name: string | null
  nickname: string | null
}

export async function getExpeditionMembers(
  expeditionId: number,
): Promise<{ data: ExpeditionMember[]; error: Error | null }> {
  const { data, error } = await getAuthClient().rpc('get_expedition_members', {
    p_expedition_id: expeditionId,
  })
  return { data: Array.isArray(data) ? (data as ExpeditionMember[]) : [], error }
}

export async function syncExpeditionMembers(
  expeditionId: number,
  members: Array<{ user_id: string; expedition_role: string; can_edit: boolean }>,
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().rpc('sync_expedition_members', {
    p_expedition_id: expeditionId,
    p_members:       members,
  })
  return { error }
}

export async function saveExpeditionJournal(
  expeditionId: number,
  blocks: object[],
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().rpc('save_expedition_journal', {
    p_expedition_id: expeditionId,
    p_blocks:        blocks,
  })
  return { error }
}

export async function submitClaim(
  expeditionId: number,
  evidence: string,
): Promise<{ error: Error | null }> {
  const { error } = await getAuthClient().rpc('submit_expedition_claim', {
    p_expedition_id: expeditionId,
    p_evidence:      evidence.trim() || null,
  })
  return { error }
}
