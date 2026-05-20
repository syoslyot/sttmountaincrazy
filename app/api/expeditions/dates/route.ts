import { NextResponse } from 'next/server'
import { sttFetch } from '@/lib/api'

export async function GET() {
  const res = await sttFetch('/api/expeditions/dates')
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
