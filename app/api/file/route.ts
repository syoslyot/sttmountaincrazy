import { NextRequest, NextResponse } from 'next/server'

const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`
const ALLOWED_BUCKETS = new Set(['records', 'maps', 'gpx'])

export async function GET(req: NextRequest) {
  const bucket = req.nextUrl.searchParams.get('bucket')
  const filePath = req.nextUrl.searchParams.get('path')
  const name = req.nextUrl.searchParams.get('name')

  if (!bucket || !filePath) return NextResponse.json({ error: 'missing params' }, { status: 400 })
  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  if (filePath.includes('..') || filePath.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const upstream = await fetch(`${STORAGE_BASE}/${bucket}/${filePath}`)
  if (!upstream.ok) return NextResponse.json({ error: 'file not found' }, { status: upstream.status })

  const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream'
  const disposition = name
    ? `inline; filename*=UTF-8''${encodeURIComponent(name)}`
    : 'inline'

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
    },
  })
}
