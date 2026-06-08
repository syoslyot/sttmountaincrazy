import { NextRequest, NextResponse } from 'next/server'
import { supabase, fetchExpeditionCounts } from '@/lib/supabase'

type ExpeditionSort = 'latest' | 'oldest'
type ExpeditionRow = {
  id: number
  name?: string | null
  grade?: string | null
  date_start?: string | null
  date_end?: string | null
  region_entry_county?: string | null
  region_entry_town?: string | null
  region_exit_county?: string | null
  region_exit_town?: string | null
  leader_display?: string | null
  gpx_count?: number | null
  map_count?: number | null
  rec_count?: number | null
  expedition_counties?: { county?: string | null }[] | null
}
type ExpeditionList = {
  expeditions: ExpeditionRow[]
  total: number
  page: number
  pageSize: number
}
type RpcResult = {
  data: unknown
  error: { message: string } | null
}

const GRADE_RE = /^[\[［]\d+([ABCDabcd])/

function matchesGrade(e: ExpeditionRow, grade: string) {
  if (e.grade) return e.grade.toUpperCase() === grade
  const m = GRADE_RE.exec(e.name ?? '')
  return m?.[1]?.toUpperCase() === grade
}

function isMissingGradeParam(error: { message?: string } | null) {
  return !!error?.message?.includes('p_grade')
}

function isMissingSortParam(error: { message?: string } | null) {
  return !!error?.message?.includes('p_sort')
}

function sanitizeSort(value: string | null): ExpeditionSort {
  return value === 'oldest' ? 'oldest' : 'latest'
}

function sortExpeditions(rows: ExpeditionRow[], sort: ExpeditionSort) {
  const direction = sort === 'oldest' ? 1 : -1
  return [...rows].sort((a, b) => {
    const ad = a.date_end ?? a.date_start ?? ''
    const bd = b.date_end ?? b.date_start ?? ''
    return ad.localeCompare(bd) * direction
  })
}

function matchesSearch(e: ExpeditionRow, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return [
    e.name,
    e.leader_display,
    e.region_entry_county,
    e.region_entry_town,
    e.region_exit_county,
    e.region_exit_town,
  ].some(value => value?.toLowerCase().includes(q))
}

function expeditionCounties(e: ExpeditionRow) {
  return [
    e.region_entry_county,
    e.region_exit_county,
    ...(e.expedition_counties ?? []).map(ec => ec.county),
  ].filter((county): county is string => !!county)
}

function matchesCounty(e: ExpeditionRow, county: string) {
  if (!county) return true
  return expeditionCounties(e).includes(county)
}

function matchesCounties(e: ExpeditionRow, counties: string[]) {
  if (counties.length === 0) return true
  const rowCounties = expeditionCounties(e)
  return counties.some(county => rowCounties.includes(county))
}

function matchesDateRange(e: ExpeditionRow, start: string | null, end: string | null) {
  const date = e.date_end ?? e.date_start
  if (!date) return false
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

function pageRows(rows: ExpeditionRow[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

async function listPublicExpeditionsFallback(
  params: {
    query: string
    county: string
    counties: string[]
    start: string | null
    end: string | null
    page: number
    pageSize: number
    grade: string
    sort: ExpeditionSort
  }
): Promise<{ data: ExpeditionList | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('expeditions')
    .select('id, name, grade, date_start, date_end, region_entry_county, region_entry_town, region_exit_county, region_exit_town, leader_display, expedition_counties(county)')
    .eq('is_public', true)

  if (error) return { data: null, error: { message: error.message } }

  const filtered = ((data ?? []) as ExpeditionRow[])
    .filter(e => matchesSearch(e, params.query))
    .filter(e => matchesCounty(e, params.county))
    .filter(e => matchesCounties(e, params.counties))
    .filter(e => matchesDateRange(e, params.start, params.end))
    .filter(e => !params.grade || matchesGrade(e, params.grade))

  const sorted = sortExpeditions(filtered, params.sort)
  return {
    data: {
      expeditions: pageRows(sorted, params.page, params.pageSize),
      total: sorted.length,
      page: params.page,
      pageSize: params.pageSize,
    },
    error: null,
  }
}

async function listWithLegacyGradeFallback(
  baseArgs: Record<string, string | string[] | number | null>,
  page: number,
  pageSize: number,
  grade: string,
  sort: ExpeditionSort
): Promise<{ data: ExpeditionList | null; error: { message: string } | null }> {
  const legacyPageSize = 200
  const matched: ExpeditionRow[] = []
  let currentPage = 1
  let totalSeen = 0
  let total = 0

  do {
    const { data, error } = await supabase.rpc('list_expeditions', {
      ...baseArgs,
      p_page: currentPage,
      p_page_size: legacyPageSize,
    })
    if (error) return { data: null, error }

    const chunk = data as ExpeditionList
    total = chunk.total
    totalSeen += chunk.expeditions.length
    matched.push(...chunk.expeditions.filter(e => matchesGrade(e, grade)))
    currentPage++
  } while (totalSeen < total)

  const start = (page - 1) * pageSize
  const sorted = sortExpeditions(matched, sort)
  return {
    data: {
      expeditions: sorted.slice(start, start + pageSize),
      total: matched.length,
      page,
      pageSize,
    },
    error: null,
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get('page') ?? '1', 10)
  const pageSize = 20
  const grade = sp.get('grade')?.trim().toUpperCase() ?? ''
  const sort = sanitizeSort(sp.get('sort'))
  const query = sp.get('q') ?? ''
  const county = sp.get('county') ?? ''
  const counties = sp.get('counties') ? sp.get('counties')!.split(',') : []
  const start = sp.get('start') || null
  const end = sp.get('end') || null
  const baseArgs = {
    p_q:         query,
    p_county:    county,
    p_counties:  counties,
    p_start:     start,
    p_end:       end,
    p_page:      page,
    p_page_size: pageSize,
  }

  let result: RpcResult = await supabase.rpc('list_expeditions', grade ? { ...baseArgs, p_sort: sort, p_grade: grade } : { ...baseArgs, p_sort: sort })
  if (isMissingSortParam(result.error)) {
    result = await supabase.rpc('list_expeditions', grade ? { ...baseArgs, p_grade: grade } : baseArgs)
  }
  if (grade && isMissingGradeParam(result.error)) {
    result = await listWithLegacyGradeFallback(baseArgs, page, pageSize, grade, sort)
  }

  if (!result.error && (result.data as ExpeditionList | null)?.total === 0) {
    const fallback = await listPublicExpeditionsFallback({
      query,
      county,
      counties,
      start,
      end,
      page,
      pageSize,
      grade,
      sort,
    })
    if (!fallback.error && fallback.data && fallback.data.total > 0) {
      result = fallback
    }
  }

  const { data, error } = result
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const expeditions = (data as ExpeditionList).expeditions
  const hasCounts = expeditions.every(e =>
    typeof e.gpx_count === 'number'
    && typeof e.map_count === 'number'
    && typeof e.rec_count === 'number'
  )
  const counts = hasCounts ? new Map<number, { gpx: number; map: number; rec: number }>() : await fetchExpeditionCounts(expeditions.map(e => e.id))

  const enriched = expeditions.map(e => ({
    ...e,
    gpx_count: typeof e.gpx_count === 'number' ? e.gpx_count : counts.get(e.id)?.gpx ?? 0,
    map_count: typeof e.map_count === 'number' ? e.map_count : counts.get(e.id)?.map ?? 0,
    rec_count: typeof e.rec_count === 'number' ? e.rec_count : counts.get(e.id)?.rec ?? 0,
  }))

  return NextResponse.json({ ...(data as object), expeditions: enriched })
}
