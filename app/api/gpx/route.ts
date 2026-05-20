import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GPX_DIR = process.env.STATIC_BASE
  ? path.join(process.env.STATIC_BASE, 'gpx')
  : path.resolve(process.cwd(), '../sttmountain/app/static/gpx')

export function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })

  // Allow {exp_id}/{filename} (new) or plain {filename} (backward compat)
  const subpathMatch = filename.match(/^(\d+)\/([^/\\]+)$/)
  const abs = subpathMatch
    ? path.join(GPX_DIR, subpathMatch[1], subpathMatch[2])
    : path.join(GPX_DIR, path.basename(filename))

  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const content = fs.readFileSync(abs, 'utf-8')
  return new NextResponse(content, {
    headers: { 'Content-Type': 'application/gpx+xml' },
  })
}
