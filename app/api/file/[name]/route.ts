import { NextRequest, NextResponse } from 'next/server'

const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`
const ALLOWED_BUCKETS = new Set(['records', 'maps', 'gpx'])

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const bucket = req.nextUrl.searchParams.get('bucket')
  const filePath = req.nextUrl.searchParams.get('path')

  if (!bucket || !filePath) return NextResponse.json({ error: 'missing params' }, { status: 400 })
  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  if (filePath.includes('..') || filePath.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${STORAGE_BASE}/${bucket}/${filePath}`)
  } catch (e) {
    console.error('[api/file] fetch error', e)
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
  if (!upstream.ok) return NextResponse.json({ error: 'file not found' }, { status: upstream.status })

  const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream'
  const buffer = await upstream.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(decodeURIComponent(name))}`,
    },
  })
}
