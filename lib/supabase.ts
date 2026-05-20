import { createClient } from '@supabase/supabase-js'

// Fallback keeps `npm run build` from crashing when env vars aren't present.
// Real values are injected by Render at runtime; build never makes actual API calls.
export const supabase = createClient(
  process.env.SUPABASE_URL      ?? 'http://localhost',
  process.env.SUPABASE_ANON_KEY ?? 'anon'
)

type GpxFile = { file_path: string }
type MapFile = { file_path: string; filename: string }
type Record  = { filename: string; content: string }
type Member  = { name: string; role: string | null; department: string | null; experience: string | null }
type County  = { county: string }

export interface ExpeditionDetail {
  id: number
  name: string
  date_start: string
  date_end: string | null
  county: string | null
  region: string | null
  region_exit: string | null
  leader: string | null
  description: string | null
  preview_image: string | null
  created_at: string
  gpx_paths: string | null
  all_counties: string | null
  map_files: MapFile[]
  records: Record[]
  members: Member[]
}

export async function fetchExpeditionById(id: string): Promise<ExpeditionDetail | null> {
  const { data, error } = await supabase
    .from('expeditions')
    .select('*, gpx_files(file_path), map_files(file_path, filename), records(filename, content), members(name, role, department, experience), expedition_counties(county)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id:            data.id,
    name:          data.name,
    date_start:    data.date_start,
    date_end:      data.date_end,
    county:        data.county,
    region:        data.region,
    region_exit:   data.region_exit,
    leader:        data.leader,
    description:   data.description,
    preview_image: data.preview_image,
    created_at:    data.created_at,
    gpx_paths:     (data.gpx_files as GpxFile[]).map(g => g.file_path).join(',') || null,
    all_counties:  (data.expedition_counties as County[]).map(ec => ec.county).join(',') || null,
    map_files:     data.map_files as MapFile[],
    records:       data.records as Record[],
    members:       data.members as Member[],
  }
}
