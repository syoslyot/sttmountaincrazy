import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const MAPS_DIR = path.resolve(process.cwd(), '../sttmount/app/static/maps')

export function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get('file')
  if (!filename) return NextResponse.json({ error: 'missing file' }, { status: 400 })

  const safe = path.basename(filename)
  const abs = path.join(MAPS_DIR, safe)

  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return new NextResponse(fs.readFileSync(abs), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
    },
  })
}
