import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GPX_DIR = path.resolve(process.cwd(), '../sttmountain/app/static/gpx')

export function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })

  // Strip any path traversal attempts
  const safe = path.basename(filename)
  const abs = path.join(GPX_DIR, safe)

  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const content = fs.readFileSync(abs, 'utf-8')
  return new NextResponse(content, {
    headers: { 'Content-Type': 'application/gpx+xml' },
  })
}
