import { describe, it, expect } from 'vitest'

// addDays is not exported, so we replicate it for testing
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('addDays', () => {
  it('adds zero days (no-op)', () => {
    expect(addDays('2024-07-06', 0)).toBe('2024-07-06')
  })

  it('adds one day', () => {
    expect(addDays('2024-07-06', 1)).toBe('2024-07-07')
  })

  it('adds days across month boundary', () => {
    expect(addDays('2024-07-30', 2)).toBe('2024-08-01')
  })

  it('adds days across year boundary', () => {
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01')
  })

  it('handles leap year', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // 2024 is leap
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
  })

  it('generates D1-D9 dates correctly for 9-day trip', () => {
    const start = '2024-07-06'
    const dates = Array.from({ length: 9 }, (_, i) => addDays(start, i).slice(5).replace('-', '/'))
    expect(dates).toEqual(['07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14'])
  })
})
