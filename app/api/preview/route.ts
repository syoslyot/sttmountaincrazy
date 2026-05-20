import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PREVIEW_DIR = process.env.STATIC_BASE
  ? path.join(process.env.STATIC_BASE, 'previews')
  : path.resolve(process.cwd(), '../sttmountain/app/static/previews')

export function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })

  const safe = path.basename(filename)
  const abs = path.join(PREVIEW_DIR, safe)

  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const ext = path.extname(safe).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp'

  return new NextResponse(fs.readFileSync(abs), {
    headers: { 'Content-Type': mime },
  })
}
