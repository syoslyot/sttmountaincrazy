import { NextRequest, NextResponse } from 'next/server'
import { supabase, fetchExpeditionCounts } from '@/lib/supabase'

type ExpeditionSort = 'latest' | 'oldest'
type ExpeditionRow = {
  id: number
  name?: string | null
  grade?: string | null
  date_start?: string | null
  date_end?: string | null
  gpx_count?: number | null
  map_count?: number | null
  rec_count?: number | null
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
  const baseArgs = {
    p_q:         sp.get('q')       ?? '',
    p_county:    sp.get('county')  ?? '',
    p_counties:  sp.get('counties') ? sp.get('counties')!.split(',') : [],
    p_start:     sp.get('start')   || null,
    p_end:       sp.get('end')     || null,
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
