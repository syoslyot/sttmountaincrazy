import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { sttFetch } from '@/lib/api'

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })

  const safe = path.basename(filename)
  if (!safe || safe.includes('..')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  for (const dir of ['previews', 'maps']) {
    const res = await sttFetch(`/static/${dir}/${safe}`)
    if (res.ok) {
      const ext = path.extname(safe).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp'
      return new NextResponse(res.body, { headers: { 'Content-Type': mime } })
    }
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 })
}
