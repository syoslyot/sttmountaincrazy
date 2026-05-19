import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PREVIEW_DIR = path.resolve(process.cwd(), '../sttmountain/app/static/previews')
const MAPS_DIR    = path.resolve(process.cwd(), '../sttmountain/app/static/maps')

export function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })

  const safe = path.basename(filename)
  const abs = [PREVIEW_DIR, MAPS_DIR].map(d => path.join(d, safe)).find(p => fs.existsSync(p)) ?? null

  if (!abs) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const ext = path.extname(safe).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp'

  return new NextResponse(fs.readFileSync(abs as string), {
    headers: { 'Content-Type': mime },
  })
}
