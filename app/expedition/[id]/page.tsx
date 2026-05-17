import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import { Navbar } from '@/components/Navbar'
import { ExpeditionDetailClient } from '@/components/ExpeditionDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExpeditionPage({ params }: Props) {
  const { id } = await params
  const db = getDb()

  const exp = db.prepare(`
    SELECT e.*,
      GROUP_CONCAT(DISTINCT ec.county) AS all_counties,
      GROUP_CONCAT(DISTINCT g.file_path) AS gpx_paths
    FROM expeditions e
    LEFT JOIN expedition_counties ec ON ec.expedition_id = e.id
    LEFT JOIN gpx_files g ON g.expedition_id = e.id
    WHERE e.id = ?
    GROUP BY e.id
  `).get(id) as Record<string, unknown> | undefined

  if (!exp) notFound()

  const records = db.prepare(
    'SELECT filename, content FROM records WHERE expedition_id = ?'
  ).all(id) as { filename: string; content: string }[]

  const gpxPaths = ((exp.gpx_paths as string | null) ?? '').split(',').filter(Boolean)

  return (
    <>
      <Navbar />
      <ExpeditionDetailClient exp={exp} gpxPaths={gpxPaths} records={records} />
    </>
  )
}
