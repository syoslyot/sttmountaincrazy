import { describe, it, expect } from 'vitest'

// These helpers are not exported from the formal components,
// so we replicate them for testing

// FormalDetailClient.tsx
function formatDuration(ms: number) {
  const totalMins = Math.max(0, Math.round(ms / 60000))
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours <= 0) return `${mins}分`
  return `${hours}時${mins}分`
}

function calcDays(start: string, end: string | null) {
  if (!end) return null
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  return d > 0 ? d + 1 : null
}

// FormalHome.tsx
function fmtLeader(l: string) { return l.length > 10 ? l.slice(0, 10) + '…' : l }

// FormalHome.tsx MobileExpCard date range rendering
function mobileDateRange(start: string, end: string | null) {
  return `${start}${end ? ` – ${end.slice(0, 4) === start.slice(0, 4) ? end.slice(5) : end}` : ''}`
}

describe('formatDuration', () => {
  it('formats minutes only', () => expect(formatDuration(25 * 60000)).toBe('25分'))
  it('formats hours and minutes', () => expect(formatDuration(95 * 60000)).toBe('1時35分'))
  it('rounds sub-minute up/down', () => {
    expect(formatDuration(29_000)).toBe('0分')
    expect(formatDuration(31_000)).toBe('1分')
  })
  it('clamps negative durations to zero', () => expect(formatDuration(-5000)).toBe('0分'))
})

describe('calcDays', () => {
  it('returns null without an end date', () => expect(calcDays('2024-07-06', null)).toBeNull())
  it('counts inclusive days for multi-day trips', () => {
    expect(calcDays('2024-07-06', '2024-07-14')).toBe(9)
  })
  it('spans month boundaries', () => {
    expect(calcDays('2024-07-30', '2024-08-02')).toBe(4)
  })
  it('same-day trip yields null (documents current behavior — not 1)', () => {
    expect(calcDays('2024-07-06', '2024-07-06')).toBeNull()
  })
  it('end before start yields null instead of negative', () => {
    expect(calcDays('2024-07-06', '2024-07-01')).toBeNull()
  })
})

describe('fmtLeader', () => {
  it('passes short names through', () => expect(fmtLeader('王小明')).toBe('王小明'))
  it('truncates names longer than 10 chars', () => {
    expect(fmtLeader('abcdefghijk')).toBe('abcdefghij…')
  })
  it('keeps exactly 10 chars intact', () => {
    expect(fmtLeader('abcdefghij')).toBe('abcdefghij')
  })
})

describe('mobile card date range', () => {
  it('same-year range drops the year on the end date', () => {
    expect(mobileDateRange('2024-07-06', '2024-07-14')).toBe('2024-07-06 – 07-14')
  })
  it('no end date shows start only', () => {
    expect(mobileDateRange('2024-07-06', null)).toBe('2024-07-06')
  })
  it('cross-year range keeps the end year visible', () => {
    // desired: a trip ending in a different year must not display as the same year
    const out = mobileDateRange('2025-12-28', '2026-01-02')
    expect(out).toContain('2026')
  })
})
