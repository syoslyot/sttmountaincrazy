'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import './hangbao.css'
import { HangbaoDatePicker } from './HangbaoDatePicker'

const SHAPES = [
  'shape-rect','shape-square','shape-circle','shape-triangle','shape-tall',
  'shape-hex','shape-skew','shape-blob','shape-ribbon','shape-star',
]
const COUNTIES = ['台北','新北','基隆','宜蘭','桃園','新竹','苗栗','台中','花蓮','彰化','南投','雲林','嘉義','台南','台東','高雄','屏東']

interface Exp {
  id: number
  name: string
  date_start: string
  date_end: string | null
  region_entry_county: string | null
  region_entry_town:   string | null
  region_exit_county:  string | null
  region_exit_town:    string | null
  leader: string | null
}

function regionLabel(e: Exp): string {
  const entryC = e.region_entry_county ?? ''
  const entryT = e.region_entry_town   ?? ''
  const exitC  = e.region_exit_county  ?? ''
  const exitT  = e.region_exit_town    ?? ''
  const from = entryC && entryT ? `${entryC}・${entryT}` : (entryC || entryT || '')
  const to   = exitC  && exitT  ? `${exitC}・${exitT}`   : (exitC  || exitT  || '')
  if (!from && !to) return ''
  if (!to || from === to) return from
  return `${from}→${to}`
}

function fmtDate(d: string | null | undefined): string {
  return d ?? ''
}

export function HangbaoHome() {
  const [selectedCounties, setSelectedCounties] = useState<string[]>([])
  const [countyOpen, setCountyOpen]             = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [query, setQuery]       = useState('')
  const [activeRange, setActiveRange] = useState<number | null>(null)
  const [exps, setExps]         = useState<Exp[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const pageRef     = useRef(1)
  const loadingRef  = useRef(false)
  const filterRef   = useRef({ selectedCounties, dateFrom, dateTo, query })
  const sentinelRef = useRef<HTMLDivElement>(null)
  const countyPanelRef = useRef<HTMLDivElement>(null)

  // Fetch date range once on mount for defaults
  useEffect(() => {
    fetch('/api/expeditions/dates')
      .then(r => r.json())
      .then(({ min_date, max_date }: { min_date: string; max_date: string }) => {
        if (min_date) setDateFrom(min_date)
        if (max_date) setDateTo(max_date)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const page = reset ? 1 : pageRef.current
    const { selectedCounties, dateFrom, dateTo, query } = filterRef.current
    try {
      const p = new URLSearchParams({ page: String(page) })
      if (selectedCounties.length > 0) p.set('counties', selectedCounties.join(','))
      if (dateFrom)     p.set('start', dateFrom)
      if (dateTo)       p.set('end', dateTo)
      if (query.trim()) p.set('q', query.trim())
      const res  = await fetch(`/api/expeditions?${p}`)
      const data = await res.json()
      setExps(prev => reset ? data.expeditions : [...prev, ...data.expeditions])
      setTotal(data.total)
      pageRef.current = page + 1
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    filterRef.current = { selectedCounties, dateFrom, dateTo, query }
    pageRef.current = 1
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset list on filter change
    setExps([])
    load(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCounties, dateFrom, dateTo, query])

  const loadMore = useCallback(() => {
    if (!loadingRef.current) load(false)
  }, [load])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore() })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  // Close county panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countyPanelRef.current && !countyPanelRef.current.contains(e.target as Node)) {
        setCountyOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const setQuickRange = (months: number) => {
    setActiveRange(months)
    const end = new Date(), start = new Date()
    start.setMonth(start.getMonth() - months)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setDateFrom(fmt(start))
    setDateTo(fmt(end))
  }

  const toggleCounty = (c: string) => {
    setSelectedCounties(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  const reset = () => {
    setSelectedCounties([])
    setDateFrom('')
    setDateTo('')
    setQuery('')
    setActiveRange(null)
  }

  return (
    <div id="hangbao-root">
      <div className="neon-marquee">
        <div className="track">
          <span>來爬山阿</span><span>山協資料組夯爆系統</span><span>下山慶功宴吃什麼</span>
          <span>成大山協</span><span>爬過的山老多了</span><span>安全第ㄧ•管理風險</span>
          <span>來阿，一起快樂爬山</span><span>成大山社夯爆系統</span><span>小甜甜為你展示出隊資料</span>
          <span>超 ㄅ一ㄤˋ 的啦</span><span>爬過的山老多了</span><span>平安下山</span>
        </div>
      </div>

      <header className="neon-hero">
        <h1>
          <span className="w1">登</span>
          <span className="w2">山</span>
          <span className="w3">夯</span>
          <span className="w4">爆</span>
          <span className="w4">了</span>
        </h1>
        <div className="subtitle-row">
          <span className="sub-tag">★ 成大山協 ★</span>
          <span className="sub-tag">歷年出隊資料</span>
          <span className="sub-tag">夯爆資料庫</span>
        </div>
      </header>

      <section className="neon-search">
        <div className="neon-card">
          <h2><span className="badge">1</span>選地區</h2>
          <div className="county-select" ref={countyPanelRef}>
            <button
              className="county-trigger"
              onClick={() => setCountyOpen(o => !o)}
            >
              {selectedCounties.length === 0
                ? '★ 全台灣 都來 ★'
                : `已選 ${selectedCounties.length} 個縣市 ▼`}
            </button>
            {countyOpen && (
              <div className="county-panel">
                {COUNTIES.map(c => (
                  <button
                    key={c}
                    className={`county-chip${selectedCounties.includes(c) ? ' active' : ''}`}
                    onClick={() => toggleCounty(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="search-btn" onClick={() => setSelectedCounties([])}>不挑了全部都看</button>
        </div>

        <div className="neon-card">
          <h2><span className="badge">2</span>挑日期</h2>
          <div className="row">
            <HangbaoDatePicker
              value={dateFrom}
              onChange={v => { setDateFrom(v); setActiveRange(null) }}
              placeholder="開始日期"
            />
            <HangbaoDatePicker
              value={dateTo}
              onChange={v => { setDateTo(v); setActiveRange(null) }}
              placeholder="結束日期"
            />
          </div>
          <div className="quick-btns">
            <button className={`quick-btn${activeRange === 1 ? ' active' : ''}`} onClick={() => setQuickRange(1)}>最近一月</button>
            <button className={`quick-btn${activeRange === 6 ? ' active' : ''}`} onClick={() => setQuickRange(6)}>最近半年</button>
            <button className={`quick-btn${activeRange === 12 ? ' active' : ''}`} onClick={() => setQuickRange(12)}>最近一年</button>
            <button className={`quick-btn${activeRange === 36 ? ' active' : ''}`} onClick={() => setQuickRange(36)}>最近三年</button>
          </div>
        </div>

        <div className="neon-card">
          <h2><span className="badge">3</span>打關鍵字</h2>
          <input
            type="text"
            placeholder="打個字就有！山名？領隊？"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="search-btn" onClick={reset}>全部清掉重來</button>
        </div>
      </section>

      <section className="neon-results">
        <div className="neon-results-header">
          <h2>★ 登登登！ 結果出爐 ★★★</h2>
          <span className="count">{total} 筆</span>
        </div>

        {loading && exps.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 24, fontWeight: 900, color: '#ffd60a' }}>
            ◢◤ 載入中... ◢◤
          </div>
        ) : exps.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 24, fontWeight: 900, color: '#ffd60a' }}>
            ◢◤ 沒有耶找不到 ◢◤
          </div>
        ) : (
          <div className="neon-trip-list">
            {exps.map((e, i) => {
              const shape = SHAPES[i % SHAPES.length]
              const region = regionLabel(e)
              return (
                <Link key={e.id} href={`/hangbao/${e.id}`} className={`neon-trip ${shape}`}>
                  <span className="trip-num">NO.{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="trip-title">{e.name}</h3>
                  <span className="trip-date">
                    {fmtDate(e.date_start)}{e.date_end ? ` - ${fmtDate(e.date_end)}` : ''}
                    {region ? ` / ${region}` : ''}
                    {e.leader ? ` / 領隊 ${e.leader}` : ''}
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {exps.length > 0 && !loading && exps.length >= total && (
          <div style={{ textAlign: 'center' }}>
            <div className="neon-end-stamp">
              ★ 以上 {total} 筆 ★<br/>
              <span>END / 沒了</span>
            </div>
          </div>
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </section>
    </div>
  )
}
