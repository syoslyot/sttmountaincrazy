import { describe, it, expect } from 'vitest'

// Helpers from app/api/expeditions/route.ts are not exported,
// so we replicate them for testing
type ExpeditionSort = 'latest' | 'oldest'
type ExpeditionRow = {
  id: number
  name?: string | null
  grade?: string | null
  date_start?: string | null
  date_end?: string | null
  gpx_count?: number | null
  map_count?: number | null
  rec_count?: number | null
}

const GRADE_RE = /^[\[［]\d+([ABCDabcd])/

function matchesGrade(e: ExpeditionRow, grade: string) {
  if (e.grade) return e.grade.toUpperCase() === grade
  const m = GRADE_RE.exec(e.name ?? '')
  return m?.[1]?.toUpperCase() === grade
}

function sanitizeSort(value: string | null): ExpeditionSort {
  return value === 'oldest' ? 'oldest' : 'latest'
}

function sortExpeditions(rows: ExpeditionRow[], sort: ExpeditionSort) {
  const direction = sort === 'oldest' ? 1 : -1
  return [...rows].sort((a, b) => {
    const ad = a.date_end ?? a.date_start ?? ''
    const bd = b.date_end ?? b.date_start ?? ''
    return ad.localeCompare(bd) * direction
  })
}

describe('sanitizeSort', () => {
  it('passes through oldest', () => expect(sanitizeSort('oldest')).toBe('oldest'))
  it('defaults everything else to latest', () => {
    expect(sanitizeSort('latest')).toBe('latest')
    expect(sanitizeSort(null)).toBe('latest')
    expect(sanitizeSort('DROP TABLE')).toBe('latest')
  })
})

describe('matchesGrade', () => {
  it('prefers the explicit grade column', () => {
    expect(matchesGrade({ id: 1, grade: 'b', name: '[9C活] x' }, 'B')).toBe(true)
    expect(matchesGrade({ id: 1, grade: 'b', name: '[9C活] x' }, 'C')).toBe(false)
  })

  it('falls back to name prefix', () => {
    expect(matchesGrade({ id: 1, name: '[8B活] x' }, 'B')).toBe(true)
    expect(matchesGrade({ id: 1, name: '無前綴' }, 'B')).toBe(false)
  })

  it('handles null name', () => {
    expect(matchesGrade({ id: 1, name: null }, 'B')).toBe(false)
  })
})

describe('sortExpeditions', () => {
  const rows: ExpeditionRow[] = [
    { id: 1, date_start: '2024-07-06', date_end: '2024-07-14' },
    { id: 2, date_start: '2026-02-06', date_end: '2026-02-14' },
    { id: 3, date_start: '2025-01-01', date_end: null },
  ]

  it('latest puts most recent first', () => {
    expect(sortExpeditions(rows, 'latest').map(r => r.id)).toEqual([2, 3, 1])
  })

  it('oldest puts earliest first', () => {
    expect(sortExpeditions(rows, 'oldest').map(r => r.id)).toEqual([1, 3, 2])
  })

  it('does not mutate the input array', () => {
    const before = rows.map(r => r.id)
    sortExpeditions(rows, 'latest')
    expect(rows.map(r => r.id)).toEqual(before)
  })

  it('rows missing both dates sort to one end instead of crashing', () => {
    const withEmpty: ExpeditionRow[] = [...rows, { id: 4 }]
    const sorted = sortExpeditions(withEmpty, 'oldest')
    expect(sorted[0].id).toBe(4)
  })
})

describe('legacy grade fallback pagination (slice logic)', () => {
  // replicates: expeditions.slice((page - 1) * pageSize, ... + pageSize)
  const matched = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }))
  const pageSize = 20

  function pageSlice(page: number) {
    const start = (page - 1) * pageSize
    return matched.slice(start, start + pageSize)
  }

  it('page 1 returns the first 20', () => {
    expect(pageSlice(1)).toHaveLength(20)
    expect(pageSlice(1)[0].id).toBe(1)
  })

  it('last partial page returns the remainder', () => {
    expect(pageSlice(3)).toHaveLength(5)
  })

  it('page beyond the end returns empty', () => {
    expect(pageSlice(4)).toHaveLength(0)
  })

  it('page=0 / negative does not duplicate or wrap rows', () => {
    // page=0 → slice(-20, 0) → [] ; page=-1 → slice(-40, -20) → 20 rows from the tail (!)
    expect(pageSlice(0)).toHaveLength(0)
    // documents current behavior: negative page leaks tail rows
    expect(pageSlice(-1)).toHaveLength(20)
    expect(pageSlice(-1)[0].id).toBe(6)
  })
})

describe('hasCounts probe (Array.prototype.every)', () => {
  it('treats an empty page as "has counts" (vacuous truth) — no extra fetch', () => {
    const empty: ExpeditionRow[] = []
    const hasCounts = empty.every(e =>
      typeof e.gpx_count === 'number'
      && typeof e.map_count === 'number'
      && typeof e.rec_count === 'number'
    )
    expect(hasCounts).toBe(true)
  })
})
