import { NextRequest, NextResponse } from 'next/server'
import { isPublicStorageFile } from '@/lib/supabase'

const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (filename.includes('..') || filename.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }
  if (!await isPublicStorageFile('maps', filename)) {
    return NextResponse.json({ error: 'file not found' }, { status: 404 })
  }
  return NextResponse.redirect(`${STORAGE_BASE}/maps/${filename}`)
}
