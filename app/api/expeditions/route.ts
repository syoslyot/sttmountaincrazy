import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const { data, error } = await supabase.rpc('list_expeditions', {
    p_q:         sp.get('q')       ?? '',
    p_county:    sp.get('county')  ?? '',
    p_counties:  sp.get('counties') ? sp.get('counties')!.split(',') : [],
    p_start:     sp.get('start')   ?? '',
    p_end:       sp.get('end')     ?? '',
    p_page:      parseInt(sp.get('page') ?? '1', 10),
    p_page_size: 20,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
