'use client'

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useExpeditions, type Expedition, type ExpeditionSort } from '@/lib/useExpeditions'
import './formal.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PREFIX_RE = /^[\[［](\d+)([ABCDabcd])(活|探|溯|雪|訓|勘)[\]］]\s*/

function parseName(raw: string): { name: string; grade: string | null; days: number | null } {
  const m = PREFIX_RE.exec(raw)
  if (!m) return { name: raw, grade: null, days: null }
  return { name: raw, grade: m[2].toUpperCase(), days: parseInt(m[1], 10) }
}

function fmtLeader(l: string) { return l.length > 5 ? '？' : l }

function subscribeMobile(callback: () => void) {
  const mq = window.matchMedia('(max-width: 680px)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getMobileSnapshot() {
  return window.matchMedia('(max-width: 680px)').matches
}

function getServerMobileSnapshot() {
  return false
}

const COUNTY_GRID: Record<string, { r: number; c: number }> = {
  '基隆': { r: 0, c: 4   },
  '台北': { r: 0, c: 3   },
  '新北': { r: 1, c: 3.5 },
  '桃園': { r: 1, c: 2   },
  '新竹': { r: 2, c: 1.5 },
  '苗栗': { r: 3, c: 1   },
  '宜蘭': { r: 2, c: 4   },
  '台中': { r: 4, c: 0.8 },
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

function BigCountyGridMobile({ selected, onToggle }: {
  selected: string[]; onToggle: (c: string) => void
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
        return (
          <button key={name} onClick={() => onToggle(name)}
            style={{
              position: 'absolute',
              left: c * (cell + gap), top: r * (cell + gap),
              width: cell, height: cell, padding: 0, border: 'none',
              cursor: 'pointer', background: 'transparent',
              fontFamily: 'var(--serif)',
              color: active ? 'var(--accent)' : 'var(--muted)',
              fontWeight: active ? 600 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <span style={{
              writingMode: 'vertical-rl', textOrientation: 'upright',
              fontSize: 11, lineHeight: 1.1, letterSpacing: 0,
            }}>{name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── MobileExpCard ────────────────────────────────────────────────────────────

function MobileExpCard({ exp, onClick }: { exp: Expedition; onClick: () => void }) {
  const hasBadges = exp.gpx_count > 0 || exp.map_count > 0 || exp.rec_count > 0

  return (
    <div onClick={onClick} style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.06em', paddingTop: 1 }}>
          REC.{String(exp.id).padStart(3, '0')}{exp.leader && <span> / 領隊 {fmtLeader(exp.leader)}</span>}
        </span>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg)', letterSpacing: '.02em' }}>
            {exp.date_start}{exp.date_end ? ` – ${exp.date_end.slice(5)}` : ''}
          </div>
        </div>
      </div>
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500, margin: 0,
                   lineHeight: 1.25, letterSpacing: '.01em' }}>
        {exp.name}
      </h3>
      <div style={{ marginTop: 6, fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          {exp.region_entry_county && exp.region_entry_town
            ? `${exp.region_entry_county}${exp.region_entry_town}`
            : null}
          
        </span>
        {hasBadges && (
          <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {exp.gpx_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '.04em' }}>GPX·{exp.gpx_count}</span>}
            {exp.map_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3d6b9e', letterSpacing: '.04em' }}>MAP·{exp.map_count}</span>}
            {exp.rec_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '.04em' }}>REC·{exp.rec_count}</span>}
          </span>
        )}
      </div>
    </div>
  )
}

function MobileFilterSelect({
  value,
  fallbackLabel,
  options,
  open,
  onOpen,
  onChange,
}: {
  value: string
  fallbackLabel: string
  options: { value: string; label: string }[]
  open: boolean
  onOpen: () => void
  onChange: (value: string) => void
}) {
  const selected = options.find(o => o.value === value)
  const displayLabel = value === 'all' || value === '' ? fallbackLabel : selected?.label ?? fallbackLabel
  return (
    <div className="formal-mobile-select">
      <button
        type="button"
        className="formal-mobile-select-trigger"
        onClick={onOpen}
        aria-expanded={open}
      >
        {displayLabel}
      </button>
      {open && (
        <div className="formal-mobile-select-menu">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`formal-mobile-select-option${opt.value === value ? ' active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SpecimenCard ─────────────────────────────────────────────────────────────

function SpecimenCard({ exp, onClick }: { exp: Expedition; onClick: () => void }) {
  const parsed = parseName(exp.name)
  const name = parsed.name
  const grade = exp.grade ?? parsed.grade
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
      </div>

      {/* Date */}
      <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
        <div className="formal-card-date">{exp.date_start} - {exp.date_end}</div>
        {exp.leader && (
          <div className="formal-card-date-end" style={{ marginTop: 10 }}>領隊 {fmtLeader(exp.leader)}</div>
        )}
        {(exp.gpx_count > 0 || exp.map_count > 0 || exp.rec_count > 0) && (
          <div style={{ marginTop: 'auto', paddingTop: 3, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {exp.gpx_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '.04em' }}>GPX / KML: {exp.gpx_count}</span>}
            {exp.map_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3d6b9e', letterSpacing: '.04em' }}>MAP: {exp.map_count}</span>}
            {exp.rec_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '.04em' }}>REC: {exp.rec_count}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FormalHome({ years = ['2026', '2025', '2024', '2023'] }: { years?: string[] }) {
  const router = useRouter()
  const [query, setQuery]             = useState('')
  const [debouncedQ, setDebouncedQ]   = useState('')
  const [counties, setCounties]       = useState<string[]>([])
  const [year, setYear]               = useState('all')
  const [grade, setGrade]             = useState('')
  const [sort, setSort]               = useState<ExpeditionSort>('latest')
  const [mobileSelectOpen, setMobileSelectOpen] = useState<'year' | 'grade' | null>(null)
  const isMobile                      = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerMobileSnapshot)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaderRef                     = useRef<HTMLDivElement>(null)

  const handleQuery = useCallback((v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(v), 300)
  }, [])

  const filter = {
    mode: debouncedQ ? 'search' as const : counties.length ? 'counties' as const : year !== 'all' ? 'date' as const : 'recent' as const,
    query: debouncedQ || undefined,
    counties: counties.length ? counties : undefined,
    grade: grade || undefined,
    sort,
    ...(year !== 'all' ? { start: `${year}-01-01`, end: `${year}-12-31` } : {}),
  }

  const { exps, total, loading, loadMore } = useExpeditions(filter)

  const toggleCounty = useCallback((c: string) => {
    setCounties(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
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
        <header style={{ padding: '10px 18px', borderBottom: '0.5px solid var(--border)',
                         display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: '.04em' }}>
            成大山協
          </h1>
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'baseline' }}>
            {[
              { label: '關於', href: '/formal/about' },
              { label: '投稿', href: '/formal/submit' },
              { label: '出隊紀錄', href: '/formal' },
            ].map(tab => (
              <Link key={tab.href} href={tab.href} style={{
                fontFamily: 'var(--serif)', fontSize: 13, letterSpacing: '.04em', cursor: 'default',
                color: tab.label === '出隊紀錄' ? 'var(--fg)' : 'var(--muted)',
                borderBottom: tab.label === '出隊紀錄' ? '1.5px solid var(--accent)' : 'none',
                paddingBottom: 1, textDecoration: 'none',
              }}>{tab.label}</Link>
            ))}
          </nav>
        </header>

        <section style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flexShrink: 0 }}>
            <BigCountyGridMobile selected={counties} onToggle={toggleCounty} />
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

        <div className="formal-mobile-filter-row">
          <label className="formal-mobile-filter-field formal-mobile-filter-query">
            <input
              value={query}
              onChange={e => handleQuery(e.target.value)}
              placeholder="請輸入 隊伍名稱或領隊"
            />
          </label>
          <label className="formal-mobile-filter-field">
            <MobileFilterSelect
              value={year}
              fallbackLabel="年度"
              options={[{ value: 'all', label: '全選' }, ...years.map(y => ({ value: y, label: y }))]}
              open={mobileSelectOpen === 'year'}
              onOpen={() => setMobileSelectOpen(prev => prev === 'year' ? null : 'year')}
              onChange={v => { setYear(v); setMobileSelectOpen(null) }}
            />
          </label>
          <label className="formal-mobile-filter-field">
            <MobileFilterSelect
              value={grade}
              fallbackLabel="級數"
              options={[{ value: '', label: '全選' }, ...['A', 'B', 'C', 'D'].map(g => ({ value: g, label: g }))]}
              open={mobileSelectOpen === 'grade'}
              onOpen={() => setMobileSelectOpen(prev => prev === 'grade' ? null : 'grade')}
              onChange={v => { setGrade(v); setMobileSelectOpen(null) }}
            />
          </label>
        </div>

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
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
          {[
            { label: '關於', href: '/formal/about' },
            { label: '投稿', href: '/formal/submit' },
            { label: '出隊紀錄', href: '/formal' },
          ].map(tab => (
            <Link key={tab.href} href={tab.href} style={{
              fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: '.04em', cursor: 'default',
              color: tab.label === '出隊紀錄' ? 'var(--fg)' : 'var(--muted)',
              borderBottom: tab.label === '出隊紀錄' ? '1.5px solid var(--accent)' : 'none',
              paddingBottom: 1, textDecoration: 'none',
            }}>{tab.label}</Link>
          ))}
        </nav>
      </header>

      <div className="formal-body-shell">
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
                placeholder="名稱／領隊"
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
              {['all', ...years].map(y => (
                <button key={y} className={`formal-year-chip${year === y ? ' active' : ''}`}
                  onClick={() => setYear(y)}>
                  {y === 'all' ? 'ALL' : y}
                </button>
              ))}
            </div>
          </div>

          {/* Grade filter */}
          <div>
            <div className="formal-filter-label">
              級數 · GRADE
              {grade && <button className="formal-clear-btn" onClick={() => setGrade('')}>CLEAR</button>}
            </div>
            <div className="formal-grade-chips">
              {['A', 'B', 'C', 'D'].map(g => (
                <button key={g}
                  className={`formal-grade-chip${grade === g ? ' active' : ''}`}
                  onClick={() => setGrade(g === grade ? '' : g)}>
                  {g}
                </button>
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
            <button
              className="formal-sort-btn"
              type="button"
              onClick={() => setSort(prev => prev === 'latest' ? 'oldest' : 'latest')}
            >
              排序&nbsp;<span className="formal-sort-value">{sort === 'latest' ? '最新 ↓' : '最舊 ↑'}</span>
            </button>
          </div>

          <div className="formal-result-list">
            <div className="formal-result-list-inner">
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
      </div>
    </div>
  )
}
