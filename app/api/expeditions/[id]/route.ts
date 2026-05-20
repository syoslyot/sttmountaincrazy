import { NextRequest, NextResponse } from 'next/server'
import { fetchExpeditionById } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const exp = await fetchExpeditionById(id)
  if (!exp) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(exp)
}
