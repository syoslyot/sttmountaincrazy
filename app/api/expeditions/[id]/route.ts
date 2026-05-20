import { NextRequest, NextResponse } from 'next/server'
import { sttFetch } from '@/lib/api'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await sttFetch(`/api/expeditions/${id}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
