import { NextRequest, NextResponse } from 'next/server'
import { supabase, fetchExpeditionCounts } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const { data, error } = await supabase.rpc('list_expeditions', {
    p_q:         sp.get('q')       ?? '',
    p_county:    sp.get('county')  ?? '',
    p_counties:  sp.get('counties') ? sp.get('counties')!.split(',') : [],
    p_start:     sp.get('start')   || null,
    p_end:       sp.get('end')     || null,
    p_page:      parseInt(sp.get('page') ?? '1', 10),
    p_page_size: 20,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const expeditions = (data as { expeditions: { id: number }[]; total: number }).expeditions
  const ids = expeditions.map(e => e.id)
  const counts = await fetchExpeditionCounts(ids)

  const enriched = expeditions.map(e => ({
    ...e,
    gpx_count: counts.get(e.id)?.gpx ?? 0,
    map_count: counts.get(e.id)?.map ?? 0,
    rec_count: counts.get(e.id)?.rec ?? 0,
  }))

  return NextResponse.json({ ...(data as object), expeditions: enriched })
}
