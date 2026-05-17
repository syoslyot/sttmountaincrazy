import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const db = getDb()
    const exp = db.prepare(`
      SELECT
        e.*,
        GROUP_CONCAT(DISTINCT ec.county) AS all_counties,
        GROUP_CONCAT(DISTINCT g.file_path) AS gpx_paths
      FROM expeditions e
      LEFT JOIN expedition_counties ec ON ec.expedition_id = e.id
      LEFT JOIN gpx_files g ON g.expedition_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `).get(id)

    if (!exp) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const records = db.prepare(
      'SELECT filename, content FROM records WHERE expedition_id = ?'
    ).all(id)

    return NextResponse.json({ ...exp as object, records })
  })
}
