'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TaiwanMap } from './TaiwanMap'
import { ExpeditionCard } from './ExpeditionCard'

type Tab = 'map' | 'date' | 'search'

interface Expedition {
  id: number
  name: string
  date_start: string
  county: string | null
  region: string | null
  leader: string | null
}

const PRESETS = [
  { label: '最近一月',  months: 1 },
  { label: '最近半年', months: 6 },
  { label: '最近一年', months: 12 },
  { label: '最近三年', months: 36 },
]

function subtractMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

const COUNTIES = [
  '台北','新北','基隆','宜蘭','桃園','新竹',
  '苗栗','台中','花蓮','彰化','南投','雲林',
  '嘉義','台南','台東','高雄','屏東',
]

export function HomeClient() {
  const [tab, setTab]             = useState<Tab>('map')
  const [county, setCounty]       = useState<string | null>(null)
  const [query, setQuery]         = useState('')
  const [preset, setPreset]       = useState<number | null>(null)
  const [exps, setExps]           = useState<Expedition[]>([])
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const sentinelRef               = useRef<HTMLDivElement>(null)
  const searchTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildParams = useCallback((p: number) => {
    const params = new URLSearchParams({ page: String(p) })
    if (tab === 'map' && county)    params.set('county', county)
    if (tab === 'search' && query)  params.set('q', query)
    if (tab === 'date' && preset !== null) {
      params.set('start', subtractMonths(preset))
      params.set('end', new Date().toISOString().slice(0, 10))
    }
    return params
  }, [tab, county, query, preset])

  const load = useCallback(async (reset: boolean) => {
    if (loading) return
    const p = reset ? 1 : page
    setLoading(true)
    try {
      const res = await fetch(`/api/expeditions?${buildParams(p)}`)
      const data = await res.json()
      setExps(prev => reset ? data.expeditions : [...prev, ...data.expeditions])
      setTotal(data.total)
      setPage(p + 1)
    } finally {
      setLoading(false)
    }
  }, [loading, page, buildParams])

  // Reset + reload when filter changes
  useEffect(() => {
    setPage(1)
    setExps([])
    load(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, county, preset])

  // Search debounce
  useEffect(() => {
    if (tab !== 'search') return
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => { setPage(1); setExps([]); load(true) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && exps.length < total) load(false)
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading, exps.length, total, load])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'map')    { setQuery(''); setPreset(null) }
    if (t === 'date')   { setCounty(null); setQuery('') }
    if (t === 'search') { setCounty(null); setPreset(null) }
  }

  return (
    <div className="home-layout">
      {/* ── 左側 ── */}
      <div className="home-left">
        <div className="tab-bar">
          {(['map', 'date', 'search'] as Tab[]).map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => handleTabChange(t)}
            >
              {t === 'map' ? '地區' : t === 'date' ? '日期' : '關鍵字'}
            </button>
          ))}
        </div>

        {/* 地區 tab */}
        {tab === 'map' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, minHeight: 0, padding: '0.5rem' }}>
              <TaiwanMap selected={county} onSelect={setCounty} />
            </div>
            <div className="county-grid" style={{ flexShrink: 0 }}>
              {COUNTIES.map(c => (
                <button
                  key={c}
                  className={`county-btn ${county === c ? 'active' : ''}`}
                  onClick={() => setCounty(county === c ? null : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 日期 tab */}
        {tab === 'date' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>快速選擇</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {PRESETS.map(p => (
                <button
                  key={p.months}
                  className={`date-preset-btn ${preset === p.months ? 'active' : ''}`}
                  onClick={() => setPreset(preset === p.months ? null : p.months)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 搜尋 tab */}
        {tab === 'search' && (
          <div style={{ padding: '1rem' }}>
            <input
              className="search-input"
              placeholder="輸入山名、地區、隊長…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* ── 右側：列表 ── */}
      <div className="home-right">
        <div style={{ padding: '0.75rem 1rem', borderBottom: 'var(--border)', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
          {total > 0 ? `共 ${total} 筆` : loading ? '載入中…' : '沒有符合的出隊'}
        </div>
        {exps.map(e => (
          <ExpeditionCard key={e.id} {...e} />
        ))}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loading && (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
            載入中…
          </div>
        )}
      </div>
    </div>
  )
}
