import { describe, expect, it } from 'vitest'
import { formatClaimLeaderDisplay } from '../lib/claimDisplay'

describe('formatClaimLeaderDisplay', () => {
  it('uses a dash when leader display is missing or blank', () => {
    expect(formatClaimLeaderDisplay(null)).toBe('—')
    expect(formatClaimLeaderDisplay('   ')).toBe('—')
  })

  it('shows leader names up to four characters', () => {
    expect(formatClaimLeaderDisplay('王小明')).toBe('王小明')
    expect(formatClaimLeaderDisplay('關山郊遊')).toBe('關山郊遊')
  })

  it('shows a question mark for leader names longer than four characters', () => {
    expect(formatClaimLeaderDisplay('關山郊遊隊')).toBe('？')
    expect(formatClaimLeaderDisplay(' Plan A ')).toBe('？')
  })
})
