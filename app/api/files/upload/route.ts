import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL_    = process.env.SUPABASE_URL         ?? 'http://localhost'
const ANON    = process.env.SUPABASE_ANON_KEY    ?? 'anon'
const SERVICE = process.env.SUPABASE_SERVICE_KEY ?? 'anon'

type Bucket = 'gpx' | 'maps' | 'records'
const TABLE: Record<Bucket, string> = { gpx: 'gpx_files', maps: 'map_files', records: 'record_files' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkPermission(adminClient: any, userId: string, expeditionId: number) {
  const [{ data: member }, { data: profile }] = await Promise.all([
    adminClient.from('expedition_members').select('id')
      .eq('expedition_id', expeditionId).eq('user_id', userId).eq('status', 'approved')
      .or('role.eq.leader,can_edit.eq.true').maybeSingle(),
    adminClient.from('user_profiles').select('id').eq('user_id', userId).eq('role', 'staff').maybeSingle(),
  ])
  return !!(member || profile)
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const anonClient  = createClient(URL_, ANON)
  const adminClient = createClient(URL_, SERVICE)

  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file          = form.get('file') as File | null
  const expeditionId  = Number(form.get('expedition_id'))
  const bucket        = form.get('bucket') as Bucket

  if (!file || !expeditionId || !TABLE[bucket])
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  if (file.size > 100 * 1024 * 1024)
    return NextResponse.json({ error: 'file too large (max 100 MB)' }, { status: 413 })

  const canUpload = await checkPermission(adminClient, user.id, expeditionId)
  if (!canUpload) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const ext       = file.name.split('.').pop() ?? ''
  const uid       = crypto.randomUUID()
  const filePath  = `${expeditionId}/${uid}${ext ? `.${ext}` : ''}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await adminClient.storage.from(bucket).upload(filePath, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: row, error: dbErr } = await adminClient.from(TABLE[bucket]).insert({
    expedition_id: expeditionId,
    drive_file_id: `upload_${uid}`,
    filename:      file.name,
    file_path:     filePath,
  }).select('id, filename, file_path').single()

  if (dbErr) {
    await adminClient.storage.from(bucket).remove([filePath])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json(row)
}
