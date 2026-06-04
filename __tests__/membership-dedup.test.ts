import { describe, it, expect } from 'vitest'
import type { MyMembership } from '../lib/auth'

// Extracted dedup logic from listMyMemberships for unit testing
function deduplicateMemberships(rows: MyMembership[]): MyMembership[] {
  const seen = new Map<number, MyMembership>()
  for (const m of rows) {
    if (!m.expedition) continue
    const eid = m.expedition.id
    const prev = seen.get(eid)
    if (!prev) { seen.set(eid, m); continue }
    if (m.role === 'leader' && prev.role !== 'leader') { seen.set(eid, m); continue }
    if (m.status === 'approved' && prev.status !== 'approved' && prev.role !== 'leader') { seen.set(eid, m) }
  }
  return Array.from(seen.values())
}

const fakeExp = (id: number) => ({ id, name: `隊伍${id}`, date_start: '2024-01-01', date_end: null, leader_display: null })

describe('deduplicateMemberships', () => {
  it('keeps single entry per expedition', () => {
    const rows: MyMembership[] = [
      { id: 1, role: 'member', status: 'approved', expedition: fakeExp(10) },
    ]
    expect(deduplicateMemberships(rows)).toHaveLength(1)
  })

  it('prefers leader role over member role for same expedition', () => {
    const rows: MyMembership[] = [
      { id: 1, role: 'member',  status: 'approved', expedition: fakeExp(10) },
      { id: 2, role: 'leader',  status: 'pending',  expedition: fakeExp(10) },
    ]
    const result = deduplicateMemberships(rows)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('leader')
  })

  it('does not replace leader with member even if member is approved', () => {
    const rows: MyMembership[] = [
      { id: 1, role: 'leader',  status: 'pending',  expedition: fakeExp(10) },
      { id: 2, role: 'member',  status: 'approved', expedition: fakeExp(10) },
    ]
    const result = deduplicateMemberships(rows)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('leader')
  })

  it('prefers approved over pending for member rows', () => {
    const rows: MyMembership[] = [
      { id: 1, role: 'member', status: 'pending',  expedition: fakeExp(10) },
      { id: 2, role: 'member', status: 'approved', expedition: fakeExp(10) },
    ]
    const result = deduplicateMemberships(rows)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('approved')
  })

  it('skips entries with null expedition', () => {
    const rows: MyMembership[] = [
      { id: 1, role: 'member', status: 'approved', expedition: null },
      { id: 2, role: 'leader', status: 'approved', expedition: fakeExp(20) },
    ]
    const result = deduplicateMemberships(rows)
    expect(result).toHaveLength(1)
    expect(result[0].expedition!.id).toBe(20)
  })

  it('keeps separate entries for different expeditions', () => {
    const rows: MyMembership[] = [
      { id: 1, role: 'member', status: 'approved', expedition: fakeExp(10) },
      { id: 2, role: 'leader', status: 'approved', expedition: fakeExp(20) },
    ]
    const result = deduplicateMemberships(rows)
    expect(result).toHaveLength(2)
  })

  it('handles empty input', () => {
    expect(deduplicateMemberships([])).toHaveLength(0)
  })
})
