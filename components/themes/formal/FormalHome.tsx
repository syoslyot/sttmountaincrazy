'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useExpeditions, type Expedition } from '@/lib/useExpeditions'
import './formal.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PREFIX_RE = /^[\[［](\d+)([ABCDabcd])(活|探|溯|雪|訓|勘)[\]］]\s*/
const DATE_SUFFIX_RE = /\s+\d{6,8}$/

function parseName(raw: string): { name: string; grade: string | null; days: number | null } {
  const m = PREFIX_RE.exec(raw)
  if (!m) return { name: raw, grade: null, days: null }
  return { name: raw, grade: m[2].toUpperCase(), days: parseInt(m[1], 10) }
}

function calcDays(start: string, end: string | null): { days: number; nights: number } | null {
  if (!end) return null
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  return d > 0 ? { days: d + 1, nights: d } : null
}

const COUNTY_GRID: Record<string, { r: number; c: number }> = {
  '基隆': { r: 0, c: 4   },
  '台北': { r: 0, c: 3   },
  '新北': { r: 1, c: 3.5 },
  '桃園': { r: 1, c: 2   },
  '新竹': { r: 2, c: 1.5 },
  '苗栗': { r: 3, c: 1   },
  '宜蘭': { r: 2, c: 4   },
  '台中': { r: 4, c: 1.2 },
  '彰化': { r: 5, c: 0.8 },
  '南投': { r: 5, c: 2.4 },
  '雲林': { r: 6, c: 0.6 },
  '花蓮': { r: 5, c: 4   },
  '嘉義': { r: 7, c: 0.8 },
  '台南': { r: 8, c: 1   },
  '高雄': { r: 9, c: 1.6 },
  '台東': { r: 8, c: 3.6 },
  '屏東': { r: 10, c: 2.4 },
}

// ─── CountyGrid (desktop) ────────────────────────────────────────────────────

function CountyGrid({ selected, onToggle }: { selected: string[]; onToggle: (c: string) => void }) {
  const SIZE = 24, GAP = 10
  const entries = Object.entries(COUNTY_GRID)
  const maxR = Math.max(...entries.map(([, v]) => v.r))
  const maxC = Math.max(...entries.map(([, v]) => v.c))
  const W = (maxC + 1) * (SIZE + GAP) + 40
  const H = (maxR + 1) * (SIZE + GAP) + 8

  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {entries.map(([name, { r, c }]) => {
        const active = selected.includes(name)
        return (
          <button key={name} onClick={() => onToggle(name)} title={name}
            style={{
              position: 'absolute',
              left: c * (SIZE + GAP), top: r * (SIZE + GAP),
              width: SIZE, height: SIZE, padding: 0, border: 'none',
              cursor: 'pointer', background: 'transparent',
              fontFamily: 'var(--serif)', fontSize: SIZE * 0.55,
              color: active ? 'var(--accent)' : 'var(--muted)',
              fontWeight: active ? 600 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <span style={{
              borderBottom: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              padding: '0 1px', lineHeight: 1.4,
            }}>{name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── BigCountyGridMobile ─────────────────────────────────────────────────────

function BigCountyGridMobile({ selected, populated, onToggle }: {
  selected: string[]; populated: Set<string>; onToggle: (c: string) => void
}) {
  const entries = Object.entries(COUNTY_GRID)
  const maxR = Math.max(...entries.map(([, v]) => v.r))
  const maxC = Math.max(...entries.map(([, v]) => v.c))
  const cell = 26, gap = 4
  const W = (maxC + 1) * (cell + gap) + 20
  const H = (maxR + 1) * (cell + gap) + 4
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {entries.map(([name, { r, c }]) => {
        const active = selected.includes(name)
        const has = populated.has(name)
        return (
          <button key={name} onClick={() => has && onToggle(name)} disabled={!has}
            style={{
              position: 'absolute',
              left: c * (cell + gap), top: r * (cell + gap),
              width: cell, height: cell, padding: 0,
              border: active ? '1.5px solid var(--accent)' : has ? '0.5px solid var(--fg)' : '0.5px dashed var(--border)',
              cursor: has ? 'pointer' : 'default',
              background: active ? 'var(--accent)' : has ? 'var(--bg)' : 'transparent',
              color: active ? 'var(--bg)' : has ? 'var(--fg)' : 'var(--muted)',
              fontFamily: 'var(--serif)', fontSize: 9, fontWeight: active ? 600 : 500,
              opacity: has ? 1 : 0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{name}</button>
        )
      })}
    </div>
  )
}

// ─── MobileExpCard ────────────────────────────────────────────────────────────

function MobileExpCard({ exp, onClick }: { exp: Expedition; onClick: () => void }) {
  const { grade } = parseName(exp.name)
  const period = calcDays(exp.date_start, exp.date_end)
  const days = period?.days
  const sameRegion = exp.region_entry_county === exp.region_exit_county
    && exp.region_entry_town === exp.region_exit_town

  return (
    <div onClick={onClick} style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.06em' }}>
          REC.{String(exp.id).padStart(3, '0')}{grade ? `　·　${grade}級` : ''}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg)', letterSpacing: '.02em' }}>
          {exp.date_start}{exp.date_end ? ` – ${exp.date_end.slice(5)}` : ''}
        </span>
      </div>
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500, margin: 0,
                   lineHeight: 1.25, letterSpacing: '.01em' }}>
        {exp.name}
      </h3>
      <div style={{ marginTop: 6, fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        {exp.region_entry_county && exp.region_entry_town
          ? `${exp.region_entry_county}${exp.region_entry_town}`
          : null}
        {!sameRegion && exp.region_exit_county && exp.region_exit_town
          ? <> <span style={{ color: 'var(--accent)' }}>→</span> {exp.region_exit_county}{exp.region_exit_town}</>
          : sameRegion && exp.region_entry_county
            ? <span style={{ color: 'var(--muted)' }}>（環線）</span>
            : null}
        {exp.leader && <span>　·　領隊 {exp.leader}</span>}
        {days && <span>　·　{days}D</span>}
      </div>
    </div>
  )
}

// ─── SpecimenCard ─────────────────────────────────────────────────────────────

function SpecimenCard({ exp, onClick }: { exp: Expedition; onClick: () => void }) {
  const { name, grade, days: parsedDays } = parseName(exp.name)
  const period = calcDays(exp.date_start, exp.date_end)
  const days = period?.days ?? parsedDays
  const nights = period?.nights
  const sameRegion = exp.region_entry_county === exp.region_exit_county
    && exp.region_entry_town === exp.region_exit_town

  return (
    <div className="formal-card" onClick={onClick}>
      {/* Number / grade */}
      <div>
        <div className="formal-card-no">REC.</div>
        <div className="formal-card-num">{String(exp.id).padStart(3, '0')}</div>
        {grade && <div className="formal-card-grade">{grade}級</div>}
      </div>

      {/* Main */}
      <div>
        <h2 className="formal-card-name">{name}</h2>
        <div className="formal-card-region">
          {exp.region_entry_county && exp.region_entry_town
            ? `${exp.region_entry_county}${exp.region_entry_town}`
            : null}
          {!sameRegion && exp.region_exit_county && exp.region_exit_town && (
            <> <span className="formal-accent">→</span> {exp.region_exit_county}{exp.region_exit_town}</>
          )}
        </div>
        <div className="formal-card-meta">
          {exp.leader && <>領隊{' '}{exp.leader}</>}
          {days != null && <>{'　·　'}{days}{' '}日{nights != null ? <>{' '}{nights}{' '}夜</> : null}</>}
        </div>
      </div>

      {/* Date */}
      <div>
        <div className="formal-card-date">{exp.date_start}</div>
        {exp.date_end && (
          <div className="formal-card-date-end">–&nbsp;{exp.date_end.slice(5)}</div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const YEARS = ['2026', '2025', '2024', '2023']

export function FormalHome() {
  const router = useRouter()
  const [query, setQuery]             = useState('')
  const [debouncedQ, setDebouncedQ]   = useState('')
  const [counties, setCounties]       = useState<string[]>([])
  const [year, setYear]               = useState('all')
  const [isMobile, setIsMobile]       = useState(false)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaderRef                     = useRef<HTMLDivElement>(null)

  const handleQuery = useCallback((v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(v), 300)
  }, [])

  const filter = useMemo(() => {
    if (debouncedQ) return { mode: 'search' as const, query: debouncedQ }
    if (counties.length) return { mode: 'counties' as const, counties }
    if (year !== 'all') {
      return { mode: 'date' as const, months: (new Date().getFullYear() - parseInt(year, 10)) * 12 + new Date().getMonth() + 1 }
    }
    return { mode: 'recent' as const, months: 24 }
  }, [debouncedQ, counties, year])

  const { exps, total, loading, loadMore } = useExpeditions(filter)

  const toggleCounty = useCallback((c: string) => {
    setCounties(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }, [])

  const populated = useMemo(() => {
    const s = new Set<string>()
    exps.forEach(e => {
      if (e.region_entry_county) s.add(e.region_entry_county)
      if (e.region_exit_county) s.add(e.region_exit_county)
    })
    return s
  }, [exps])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 680px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  if (isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100dvh',
        background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--serif)',
      }}>
        <header style={{ padding: '6px 18px 10px', borderBottom: '0.5px solid var(--border)',
                         display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: '.04em' }}>
            成大山協
          </h1>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--muted)', letterSpacing: '.16em' }}>
            ATLAS
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>⌕</span>
        </header>

        <section style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flexShrink: 0 }}>
            <BigCountyGridMobile selected={counties} populated={populated} onToggle={toggleCounty} />
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.2em', color: 'var(--muted)', marginBottom: 6 }}>
              INDEX · BY COUNTY
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, margin: 0,
                         lineHeight: 1.3, letterSpacing: '.02em' }}>
              選擇縣市<br />以索引<br />
              <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>歷年出隊。</span>
            </h2>
          </div>
        </section>

        <div style={{ padding: '10px 18px', borderBottom: '0.5px solid var(--border)',
                      display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.15em', color: 'var(--muted)' }}>
            EXPEDITIONS
          </span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500 }}>
            {exps.length}
          </span>
          {counties.length > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--accent)' }}>
              {counties.join('、')}
            </span>
          )}
        </div>

        <div>
          {exps.map(exp => (
            <MobileExpCard key={exp.id} exp={exp} onClick={() => router.push(`/formal/${exp.id}`)} />
          ))}
          <div ref={loaderRef} style={{ height: 1 }} />
          {loading && (
            <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: 'var(--mono)',
                          fontSize: 10, color: 'var(--muted)', letterSpacing: '.1em' }}>
              LOADING…
            </div>
          )}
          {!loading && exps.length === 0 && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)' }}>
                沒有符合條件的出隊紀錄
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="formal-root scrollable">
      {/* Header */}
      <header className="formal-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, margin: 0, fontWeight: 500, letterSpacing: '.04em' }}>
            成大山協
          </h1>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.18em' }}>
            NCKU&nbsp;MTN.&nbsp;·&nbsp;EXPEDITION&nbsp;ARCHIVE
          </span>
        </div>
      </header>

      <div className="formal-body">
        {/* Sidebar */}
        <aside className="formal-sidebar">
          {/* Search */}
          <div>
            <div className="formal-filter-label">搜尋 · QUERY</div>
            <div className="formal-search-wrap">
              <span className="formal-search-icon">⌕</span>
              <input className="formal-search-input"
                value={query}
                onChange={e => handleQuery(e.target.value)}
                placeholder="名稱／領隊／山名"
              />
            </div>
          </div>

          {/* Region */}
          <div>
            <div className="formal-filter-label">
              地區 · REGION
              {counties.length > 0 && (
                <button className="formal-clear-btn" onClick={() => setCounties([])}>CLEAR</button>
              )}
            </div>
            <div style={{ padding: '14px', background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
              <CountyGrid selected={counties} onToggle={toggleCounty} />
            </div>
          </div>

          {/* Year */}
          <div>
            <div className="formal-filter-label">年份 · YEAR</div>
            <div className="formal-year-chips">
              {['all', ...YEARS].map(y => (
                <button key={y} className={`formal-year-chip${year === y ? ' active' : ''}`}
                  onClick={() => setYear(y)}>
                  {y === 'all' ? 'ALL' : y}
                </button>
              ))}
            </div>
          </div>

          {/* Grade — display only, no filter yet */}
          <div>
            <div className="formal-filter-label">難度 · GRADE</div>
            <div className="formal-grade-chips">
              {['A', 'B', 'C', 'D', '訓'].map(g => (
                <span key={g} className="formal-grade-chip">{g}</span>
              ))}
            </div>
          </div>

          <div className="formal-sidebar-footer">
            <div>FOUNDED&nbsp;1982</div>
            <div>NCKU&nbsp;TAINAN&nbsp;·&nbsp;TW</div>
          </div>
        </aside>

        {/* Result */}
        <div className="formal-result-area">
          <div className="formal-result-bar">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.15em', color: 'var(--muted)' }}>
                結果 · RESULTS
              </span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500 }}>
                {String(exps.length).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                / {String(total).padStart(2, '0')}
              </span>
              {counties.length > 0 && (
                <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--muted)' }}>
                  · 在&nbsp;
                  {counties.map((c, i) => (
                    <span key={c}>
                      <span className="formal-accent">{c}</span>
                      {i < counties.length - 1 ? '、' : ''}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em' }}>
              排序&nbsp;<span style={{ color: 'var(--fg)' }}>最新 ↓</span>
            </div>
          </div>

          <div className="formal-result-list">
            {exps.map(exp => <SpecimenCard key={exp.id} exp={exp} onClick={() => router.push(`/formal/${exp.id}`)} />)}
            {!loading && exps.length === 0 && (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>
                  沒有符合條件的出隊紀錄
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)' }}>
                  NO RESULTS
                </div>
              </div>
            )}
            <div ref={loaderRef} style={{ height: 1 }} />
            {loading && (
              <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.1em' }}>
                LOADING…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
