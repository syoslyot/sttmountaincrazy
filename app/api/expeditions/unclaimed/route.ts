import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const { data, error } = await supabase.rpc('list_unclaimed_expeditions', {
    p_q:     sp.get('q')     ?? '',
    p_grade: sp.get('grade') ?? '',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expeditions: data ?? [] })
}
