import { describe, it, expect } from 'vitest'

// PREFIX_RE is not exported (duplicated in FormalHome.tsx and FormalDetailClient.tsx),
// so we replicate it for testing
const PREFIX_RE = /^[\[［](\d+)([ABCDabcd])(活|探|溯|雪|訓|勘)[\]］]\s*/

function parseName(raw: string): { name: string; grade: string | null; days: number | null } {
  const m = PREFIX_RE.exec(raw)
  if (!m) return { name: raw, grade: null, days: null }
  return { name: raw, grade: m[2].toUpperCase(), days: parseInt(m[1], 10) }
}

// GRADE_RE is the server-side counterpart in app/api/expeditions/route.ts
const GRADE_RE = /^[\[［]\d+([ABCDabcd])/

describe('PREFIX_RE / parseName (FormalHome, FormalDetailClient)', () => {
  it('parses standard prefix', () => {
    const r = parseName('[8B活] 鬼轉丹大溫泉巡禮')
    expect(r.grade).toBe('B')
    expect(r.days).toBe(8)
  })

  it('parses full-width brackets', () => {
    const r = parseName('［9C勘］危險勘查隊')
    expect(r.grade).toBe('C')
    expect(r.days).toBe(9)
  })

  it('normalizes lowercase grade', () => {
    expect(parseName('[3a活] 郊山行').grade).toBe('A')
  })

  it('parses two-digit days', () => {
    expect(parseName('[12D溯] 長程溯溪').days).toBe(12)
  })

  it('returns null grade for unprefixed names', () => {
    expect(parseName('無前綴隊伍').grade).toBeNull()
  })

  it('accepts all six type characters', () => {
    for (const t of ['活', '探', '溯', '雪', '訓', '勘']) {
      expect(parseName(`[5B${t}] 測試`).grade).toBe('B')
    }
  })

  it('rejects unknown type characters', () => {
    expect(parseName('[5B縱] 大縱走').grade).toBeNull()
  })
})

describe('client/server grade regex consistency', () => {
  // Documents a real divergence: the API grade filter (GRADE_RE) does not
  // require a type character, but the client display (PREFIX_RE) does.
  // A name like "[5B縱]" is counted as grade B by the API filter
  // yet shows no grade badge in the UI.
  it('both match a standard prefix', () => {
    const name = '[8B活] 隊伍'
    expect(PREFIX_RE.exec(name)?.[2]).toBe('B')
    expect(GRADE_RE.exec(name)?.[1]).toBe('B')
  })

  it('diverge on unknown type characters (known inconsistency)', () => {
    const name = '[5B縱] 大縱走'
    expect(PREFIX_RE.exec(name)).toBeNull()        // UI: no grade shown
    expect(GRADE_RE.exec(name)?.[1]).toBe('B')     // API: filtered as B
  })

  it('diverge on missing type bracket close (known inconsistency)', () => {
    const name = '[10C 中央山脈'
    expect(PREFIX_RE.exec(name)).toBeNull()
    expect(GRADE_RE.exec(name)?.[1]).toBe('C')
  })
})
