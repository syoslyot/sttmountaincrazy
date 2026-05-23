'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface Expedition {
  id: number
  name: string
  date_start: string
  date_end: string | null
  region_entry_county: string | null
  region_entry_town:   string | null
  region_exit_county:  string | null
  region_exit_town:    string | null
  leader: string | null
  gpx_count: number
  map_count: number
  rec_count: number
}

export type FilterMode = 'recent' | 'county' | 'counties' | 'date' | 'search'

export interface ExpeditionFilter {
  mode: FilterMode
  county?: string
  counties?: string[]
  query?: string
  months?: number
  start?: string
  end?: string
}

function buildParams(filter: ExpeditionFilter, page: number): URLSearchParams {
  const p = new URLSearchParams({ page: String(page) })
  if (filter.county) p.set('county', filter.county)
  if (filter.counties?.length) p.set('counties', filter.counties.join(','))
  if (filter.query) p.set('q', filter.query)
  if (filter.start) p.set('start', filter.start)
  if (filter.end) p.set('end', filter.end)
  if (!filter.start && !filter.end && filter.months) {
    const d = new Date()
    d.setMonth(d.getMonth() - filter.months)
    p.set('start', d.toISOString().slice(0, 10))
    p.set('end', new Date().toISOString().slice(0, 10))
  }
  return p
}

export function useExpeditions(filter: ExpeditionFilter) {
  const [exps, setExps]       = useState<Expedition[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const pageRef               = useRef(1)
  const filterRef             = useRef(filter)

  const load = useCallback(async (reset: boolean) => {
    if (loading) return
    const page = reset ? 1 : pageRef.current
    setLoading(true)
    try {
      const res  = await fetch(`/api/expeditions?${buildParams(filterRef.current, page)}`)
      const data = await res.json()
      setExps(prev => reset ? data.expeditions : [...prev, ...data.expeditions])
      setTotal(data.total)
      pageRef.current = page + 1
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    filterRef.current = filter
    pageRef.current = 1
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset list on filter change
    setExps([])
    load(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.mode, filter.county, filter.counties?.join(','), filter.query, filter.months, filter.start, filter.end])

  const loadMore = useCallback(() => {
    if (!loading && exps.length < total) load(false)
  }, [loading, exps.length, total, load])

  return { exps, total, loading, loadMore }
}
