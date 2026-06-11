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

export type GpxFile    = { id: number; file_path: string; filename: string }
export type MapFile    = { id: number; file_path: string; filename: string }
export type RecordFile = { id: number; filename: string; content: string; file_path: string | null }

type GpxFileRaw    = GpxFile    & { deleted_at: string | null }
type MapFileRaw    = MapFile    & { deleted_at: string | null }
type RecordFileRaw = RecordFile & { deleted_at: string | null }
type County = { county: string }
type StorageBucket = 'gpx' | 'maps' | 'records' | 'previews'

export interface ExpeditionDetail {
  id: number
  name: string
  grade: string | null
  date_start: string
  date_end: string | null
  county: string | null
  region: string | null
  county_exit: string | null
  region_exit: string | null
  leader_display: string | null
  description: string | null
  preview_image: string | null
  created_at: string
  transport: string | null
  keeper: string | null
  participants: number | null
  sync_locked: boolean
  journal_blocks: object[]
  gpx_files: GpxFile[]
  all_counties: string | null
  map_files: MapFile[]
  record_files: RecordFile[]
}

export async function fetchExpeditionYears(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_expedition_years')
  const rpcYears = Array.isArray(data)
    ? data.map(year => String(year)).filter(year => /^\d{4}$/.test(year))
    : []
  if (!error && rpcYears.length > 0) return rpcYears

  const { data: listData, error: listError } = await supabase.rpc('list_expeditions', {
    p_q: '',
    p_county: '',
    p_counties: [],
    p_start: null,
    p_end: null,
    p_page: 1,
    p_page_size: 500,
    p_sort: 'latest',
  })
  if (listError || typeof listData !== 'object' || !listData) return []

  const expeditions = (listData as { expeditions?: { date_start?: string | null; date_end?: string | null }[] }).expeditions ?? []
  return [...new Set(expeditions
    .map(exp => (exp.date_start ?? exp.date_end ?? '').slice(0, 4))
    .filter(year => /^\d{4}$/.test(year))
  )]
    .map(year => String(year))
    .sort((a, b) => b.localeCompare(a))
}

export async function fetchExpeditionCounts(ids: number[]): Promise<Map<number, { gpx: number; map: number; rec: number }>> {
  if (ids.length === 0) return new Map()
  const [gpxRes, mapRes, recRes] = await Promise.all([
    supabaseAdmin.from('gpx_files').select('expedition_id').in('expedition_id', ids).is('deleted_at', null),
    supabaseAdmin.from('map_files').select('expedition_id').in('expedition_id', ids).is('deleted_at', null),
    supabaseAdmin.from('record_files').select('expedition_id').in('expedition_id', ids).is('deleted_at', null),
  ])
  const result = new Map<number, { gpx: number; map: number; rec: number }>()
  ids.forEach(id => result.set(id, { gpx: 0, map: 0, rec: 0 }))
  gpxRes.data?.forEach((r: { expedition_id: number }) => { const c = result.get(r.expedition_id); if (c) c.gpx++ })
  mapRes.data?.forEach((r: { expedition_id: number }) => { const c = result.get(r.expedition_id); if (c) c.map++ })
  recRes.data?.forEach((r: { expedition_id: number }) => { const c = result.get(r.expedition_id); if (c) c.rec++ })
  return result
}

export async function fetchExpeditionById(id: string, opts?: { allowPrivate?: boolean }): Promise<ExpeditionDetail | null> {
  let query = supabaseAdmin
    .from('expeditions')
    .select('*, journal_blocks, gpx_files(id, file_path, filename, deleted_at), map_files(id, file_path, filename, deleted_at), record_files(id, filename, content, file_path, deleted_at), expedition_counties(county)')
    .eq('id', id)
  if (!opts?.allowPrivate) query = query.eq('is_public', true)
  const { data, error } = await query.single()

  if (error || !data) return null

  return {
    id:             data.id,
    name:           data.name,
    grade:          data.grade ?? null,
    date_start:     data.date_start,
    date_end:       data.date_end,
    county:         data.region_entry_county,
    region:         data.region_entry_town,
    county_exit:    data.region_exit_county,
    region_exit:    data.region_exit_town,
    leader_display: data.leader_display,
    description:    null,
    preview_image:  data.preview_image,
    created_at:     data.created_at,
    transport:      data.transport ?? null,
    keeper:         data.keeper ?? null,
    participants:   data.participants ?? null,
    sync_locked:    data.sync_locked ?? false,
    journal_blocks: Array.isArray(data.journal_blocks) ? data.journal_blocks : [],
    gpx_files:      (data.gpx_files as GpxFileRaw[]).filter(f => !f.deleted_at),
    all_counties:   (data.expedition_counties as County[]).map(ec => ec.county).join(',') || null,
    map_files:      (data.map_files as MapFileRaw[]).filter(f => !f.deleted_at),
    record_files:   (data.record_files as RecordFileRaw[]).filter(f => !f.deleted_at),
  }
}

export async function isPublicStorageFile(bucket: StorageBucket, filePath: string): Promise<boolean> {
  if (!filePath || filePath.includes('..') || filePath.startsWith('/')) return false

  if (bucket === 'previews') {
    const safeName = filePath.split('/').pop()
    if (!safeName || safeName !== filePath) return false
    const { data, error } = await supabaseAdmin
      .from('expeditions')
      .select('id')
      .eq('preview_image', safeName)
      .eq('is_public', true)
      .maybeSingle()
    return !error && !!data
  }

  const table = bucket === 'gpx'
    ? 'gpx_files'
    : bucket === 'maps'
      ? 'map_files'
      : 'record_files'

  const { data, error } = await supabaseAdmin
    .from(table)
    .select('id, expeditions!inner(id)')
    .eq('file_path', filePath)
    .is('deleted_at', null)
    .eq('expeditions.is_public', true)
    .maybeSingle()

  return !error && !!data
}
