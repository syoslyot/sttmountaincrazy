import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { isPublicStorageFile } from '@/lib/supabase'

const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  const safe = path.basename(filename)
  if (!safe || safe.includes('..')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }
  if (!await isPublicStorageFile('previews', safe)) {
    return NextResponse.json({ error: 'file not found' }, { status: 404 })
  }
  return NextResponse.redirect(`${STORAGE_BASE}/previews/${safe}`)
}
