import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const PAGE_SIZE = 20

const BASE_SELECT = `
  SELECT
    e.*,
    GROUP_CONCAT(DISTINCT ec.county) AS all_counties,
    GROUP_CONCAT(DISTINCT g.file_path) AS gpx_paths
  FROM expeditions e
  LEFT JOIN expedition_counties ec ON ec.expedition_id = e.id
  LEFT JOIN gpx_files g ON g.expedition_id = e.id
`

export function GET(req: NextRequest) {
  const db = getDb()
  const { searchParams } = req.nextUrl

  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q     = searchParams.get('q')?.trim() ?? ''
  const county = searchParams.get('county')?.trim() ?? ''
  const start = searchParams.get('start')?.trim() ?? ''
  const end   = searchParams.get('end')?.trim() ?? ''
  const offset = (page - 1) * PAGE_SIZE

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (q) {
    where += ' AND (e.name LIKE ? OR e.region LIKE ? OR e.county LIKE ? OR e.description LIKE ?)'
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (county) {
    where += ' AND e.id IN (SELECT expedition_id FROM expedition_counties WHERE county = ?)'
    params.push(county)
  }
  if (start) { where += ' AND e.date_start >= ?'; params.push(start) }
  if (end)   { where += ' AND e.date_start <= ?'; params.push(end) }

  const sql = `${BASE_SELECT} ${where} GROUP BY e.id ORDER BY e.date_start DESC LIMIT ? OFFSET ?`
  const rows = db.prepare(sql).all(...params, PAGE_SIZE, offset)

  const countSql = `SELECT COUNT(DISTINCT e.id) as n FROM expeditions e LEFT JOIN expedition_counties ec ON ec.expedition_id = e.id ${where}`
  const total = (db.prepare(countSql).get(...params) as { n: number }).n

  return NextResponse.json({ expeditions: rows, total, page, pageSize: PAGE_SIZE })
}
