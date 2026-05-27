import { NextRequest, NextResponse } from 'next/server'
import { isPublicStorageFile } from '@/lib/supabase'

const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`
const ALLOWED_BUCKETS = new Set(['records', 'maps', 'gpx', 'previews'])

// URL 結構：/api/file/{bucket}/{...actualPath}/{displayName}
// 例：/api/file/records/27/d3de645703a9.docx/丹大Day6-8.docx
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  if (path.length < 3) return NextResponse.json({ error: 'invalid path' }, { status: 400 })

  const bucket = path[0]
  const displayName = path[path.length - 1]
  const filePath = path.slice(1, -1).join('/')

  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  if (filePath.includes('..')) return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  if (!await isPublicStorageFile(bucket as 'records' | 'maps' | 'gpx' | 'previews', filePath)) {
    return NextResponse.json({ error: 'file not found' }, { status: 404 })
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
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(decodeURIComponent(displayName))}`,
    },
  })
}
