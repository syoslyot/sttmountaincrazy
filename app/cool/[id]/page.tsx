import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import { CoolDetail } from '@/components/themes/cool/CoolDetail'

interface Props { params: Promise<{ id: string }> }

export default async function CoolDetailPage({ params }: Props) {
  const { id } = await params
  const db = getDb()

  const exp = db.prepare(`
    SELECT e.*,
      GROUP_CONCAT(DISTINCT g.file_path) AS gpx_paths
    FROM expeditions e
    LEFT JOIN gpx_files g ON g.expedition_id = e.id
    WHERE e.id = ?
    GROUP BY e.id
  `).get(id) as Record<string, unknown> | undefined

  if (!exp) notFound()

  const records = db.prepare(
    'SELECT filename, content FROM records WHERE expedition_id = ?'
  ).all(id) as { filename: string; content: string }[]

  const mapFiles = db.prepare(
    'SELECT file_path FROM map_files WHERE expedition_id = ?'
  ).all(id) as { file_path: string }[]

  const gpxPaths = ((exp.gpx_paths as string | null) ?? '').split(',').filter(Boolean)

  return <CoolDetail exp={exp as any} gpxPaths={gpxPaths} records={records} mapFiles={mapFiles} />
}
