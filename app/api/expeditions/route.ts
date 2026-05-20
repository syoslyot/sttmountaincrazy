import { NextRequest, NextResponse } from 'next/server'
import { sttFetch } from '@/lib/api'

export async function GET(req: NextRequest) {
  const res = await sttFetch(`/api/expeditions${req.nextUrl.search}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
