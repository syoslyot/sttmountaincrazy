'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import './cool.css'

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
  region: string | null
  region_exit: string | null
  leader: string | null
}

function regionLabel(e: Exp): string {
  const r = e.region, rx = e.region_exit
  if (!r && !rx) return ''
  if (!rx || r === rx) return r ?? rx ?? ''
  return `${r} → ${rx}`
}

function fmtDate(d: string | null | undefined): string {
  return d ? d.replace(/-/g, '.') : ''
}

export function CoolHome() {
  const [region, setRegion]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [query, setQuery]       = useState('')
  const [exps, setExps]         = useState<Exp[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const pageRef    = useRef(1)
  const loadingRef = useRef(false)
  const filterRef  = useRef({ region, dateFrom, dateTo, query })
  const sentinelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const page = reset ? 1 : pageRef.current
    const { region, dateFrom, dateTo, query } = filterRef.current
    try {
      const p = new URLSearchParams({ page: String(page) })
      if (region)       p.set('county', region)
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
    filterRef.current = { region, dateFrom, dateTo, query }
    pageRef.current = 1
    setExps([])
    load(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, dateFrom, dateTo, query])

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

  const setQuickRange = (months: number) => {
    const end = new Date(), start = new Date()
    start.setMonth(start.getMonth() - months)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setDateFrom(fmt(start))
    setDateTo(fmt(end))
  }

  const reset = () => { setRegion(''); setDateFrom(''); setDateTo(''); setQuery('') }

  return (
    <div id="cool-root">
      <div className="neon-marquee">
        <div className="track">
          <span>歡迎光臨</span><span>登山資料夯爆系統</span><span>全台百岳紀錄這裡找</span>
          <span>成大山協</span><span>領隊靠這個記</span><span>下山平安</span>
          <span>歡迎光臨</span><span>登山資料夯爆系統</span><span>全台百岳紀錄這裡找</span>
          <span>成大山協</span><span>領隊靠這個記</span><span>下山平安</span>
        </div>
      </div>

      <header className="neon-hero">
        <h1>
          <span className="w1">登</span>
          <span className="w2">山</span>
          <span className="w3">夯</span>
          <span className="w4">爆</span>
        </h1>
        <div className="subtitle-row">
          <span className="sub-tag">★ 成大山協 ★</span>
          <span className="sub-tag">歷年出隊</span>
          <span className="sub-tag">夯爆資料庫</span>
        </div>
      </header>

      <section className="neon-search">
        <div className="neon-card">
          <h2><span className="badge">1</span>選地區</h2>
          <select value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">★ 全台灣 都來 ★</option>
            {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="search-btn" onClick={() => setRegion('')}>不挑了全部都看</button>
        </div>

        <div className="neon-card">
          <h2><span className="badge">2</span>挑日期</h2>
          <div className="row">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="quick-btns">
            <button className="quick-btn" onClick={() => setQuickRange(1)}>近1月</button>
            <button className="quick-btn" onClick={() => setQuickRange(6)}>半年</button>
            <button className="quick-btn" onClick={() => setQuickRange(12)}>1年</button>
            <button className="quick-btn" onClick={() => setQuickRange(36)}>3年</button>
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
          <h2>★ 結果出爐 ★</h2>
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
                <Link key={e.id} href={`/cool/${e.id}`} className={`neon-trip ${shape}`}>
                  <span className="trip-num">NO.{String(i + 1).padStart(2, '0')}</span>
                  <span className="trip-date">
                    {fmtDate(e.date_start)}{e.date_end ? ` — ${fmtDate(e.date_end)}` : ''}
                  </span>
                  <h3 className="trip-title">{e.name}</h3>
                  <div className="trip-info">
                    {e.leader && <span>領隊·{e.leader}</span>}
                  </div>
                  {region && <div className="trip-region">{region}</div>}
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
