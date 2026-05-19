import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export function GET() {
  const db = getDb()
  const row = db.prepare(`
    SELECT
      MIN(date_start) AS min_date,
      MAX(COALESCE(date_end, date_start)) AS max_date
    FROM expeditions
  `).get() as { min_date: string | null; max_date: string | null }
  return NextResponse.json({ min_date: row.min_date ?? '', max_date: row.max_date ?? '' })
}
