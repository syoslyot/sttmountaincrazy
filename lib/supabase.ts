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

export async function fetchExpeditionYears(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_expedition_years')
  if (error || !Array.isArray(data)) return []
  return data
    .map(year => String(year))
    .filter(year => /^\d{4}$/.test(year))
}

export async function fetchExpeditionCounts(ids: number[]): Promise<Map<number, { gpx: number; map: number; rec: number }>> {
  if (ids.length === 0) return new Map()
  const [gpxRes, mapRes, recRes] = await Promise.all([
    supabaseAdmin.from('gpx_files').select('expedition_id').in('expedition_id', ids),
    supabaseAdmin.from('map_files').select('expedition_id').in('expedition_id', ids),
    supabaseAdmin.from('records').select('expedition_id').in('expedition_id', ids),
  ])
  const result = new Map<number, { gpx: number; map: number; rec: number }>()
  ids.forEach(id => result.set(id, { gpx: 0, map: 0, rec: 0 }))
  gpxRes.data?.forEach((r: { expedition_id: number }) => { const c = result.get(r.expedition_id); if (c) c.gpx++ })
  mapRes.data?.forEach((r: { expedition_id: number }) => { const c = result.get(r.expedition_id); if (c) c.map++ })
  recRes.data?.forEach((r: { expedition_id: number }) => { const c = result.get(r.expedition_id); if (c) c.rec++ })
  return result
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
