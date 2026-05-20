import { NextRequest, NextResponse } from 'next/server'
import { sttFetch } from '@/lib/api'

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })
  if (filename.includes('..') || filename.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const res = await sttFetch(`/static/gpx/${filename}`)
  if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return new NextResponse(res.body, {
    headers: { 'Content-Type': 'application/gpx+xml' },
  })
}
