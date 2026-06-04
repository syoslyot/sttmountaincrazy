import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL_    = process.env.SUPABASE_URL         ?? 'http://localhost'
const ANON    = process.env.SUPABASE_ANON_KEY    ?? 'anon'
const SERVICE = process.env.SUPABASE_SERVICE_KEY ?? 'anon'

type Bucket = 'gpx' | 'maps' | 'records'
const TABLE: Record<Bucket, string> = { gpx: 'gpx_files', maps: 'map_files', records: 'record_files' }

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const anonClient  = createClient(URL_, ANON)
  const adminClient = createClient(URL_, SERVICE)

  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { dbId, filePath, bucket, expeditionId } = await req.json() as {
    dbId: number; filePath: string; bucket: Bucket; expeditionId: number
  }
  if (!dbId || !filePath || !TABLE[bucket] || !expeditionId)
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })

  // Permission check
  const [{ data: member }, { data: profile }] = await Promise.all([
    adminClient.from('expedition_members').select('id')
      .eq('expedition_id', expeditionId).eq('user_id', user.id).eq('status', 'approved')
      .or('role.eq.leader,can_edit.eq.true').maybeSingle(),
    adminClient.from('user_profiles').select('id').eq('user_id', user.id).eq('role', 'staff').maybeSingle(),
  ])
  if (!member && !profile) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { error: updateErr } = await adminClient
    .from(TABLE[bucket])
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', dbId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
