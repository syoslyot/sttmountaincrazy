import { createClient } from '@supabase/supabase-js'

// Fallback keeps `npm run build` from crashing when env vars aren't present.
// Real values are injected by Render at runtime; build never makes actual API calls.
export const supabase = createClient(
  process.env.SUPABASE_URL      ?? 'http://localhost',
  process.env.SUPABASE_ANON_KEY ?? 'anon'
)

// Server-side only — bypasses RLS for trusted server reads.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL         ?? 'http://localhost',
  process.env.SUPABASE_SERVICE_KEY ?? 'anon'
)

export type GpxFile = { file_path: string; filename: string }
export type MapFile = { file_path: string; filename: string }
export type RecordFile = { filename: string; content: string; file_path: string | null }
type County = { county: string }

export interface ExpeditionDetail {
  id: number
  name: string
  date_start: string
  date_end: string | null
  county: string | null
  region: string | null
  county_exit: string | null
  region_exit: string | null
  leader: string | null
  description: string | null
  preview_image: string | null
  created_at: string
  gpx_files: GpxFile[]
  all_counties: string | null
  map_files: MapFile[]
  records: RecordFile[]
}

export async function fetchExpeditionById(id: string): Promise<ExpeditionDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('expeditions')
    .select('*, gpx_files(file_path, filename), map_files(file_path, filename), records(filename, content, file_path), expedition_counties(county)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id:            data.id,
    name:          data.name,
    date_start:    data.date_start,
    date_end:      data.date_end,
    county:        data.region_entry_county,
    region:        data.region_entry_town,
    county_exit:   data.region_exit_county,
    region_exit:   data.region_exit_town,
    leader:        data.leader,
    description:   null,
    preview_image: data.preview_image,
    created_at:    data.created_at,
    gpx_files:     data.gpx_files as GpxFile[],
    all_counties:  (data.expedition_counties as County[]).map(ec => ec.county).join(',') || null,
    map_files:     data.map_files as MapFile[],
    records:       data.records as RecordFile[],
  }
}
