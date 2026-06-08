import { describe, it, expect } from 'vitest'
import { hasRole, ROLE_LABELS, type MemberRole } from '../lib/auth'

describe('hasRole', () => {
  it('returns false for null role', () => {
    expect(hasRole(null, 'newcomer')).toBe(false)
  })

  it('staff meets all role requirements', () => {
    const roles: MemberRole[] = ['staff', 'member', 'newcomer', 'partner']
    for (const r of roles) {
      expect(hasRole('staff', r)).toBe(true)
    }
  })

  it('member meets member/newcomer/partner but not staff', () => {
    expect(hasRole('member', 'staff')).toBe(false)
    expect(hasRole('member', 'member')).toBe(true)
    expect(hasRole('member', 'newcomer')).toBe(true)
    expect(hasRole('member', 'partner')).toBe(true)
  })

  it('newcomer meets newcomer/partner but not staff/member', () => {
    expect(hasRole('newcomer', 'staff')).toBe(false)
    expect(hasRole('newcomer', 'member')).toBe(false)
    expect(hasRole('newcomer', 'newcomer')).toBe(true)
    expect(hasRole('newcomer', 'partner')).toBe(true)
  })

  it('partner only meets partner', () => {
    expect(hasRole('partner', 'staff')).toBe(false)
    expect(hasRole('partner', 'member')).toBe(false)
    expect(hasRole('partner', 'newcomer')).toBe(false)
    expect(hasRole('partner', 'partner')).toBe(true)
  })
})

describe('ROLE_LABELS', () => {
  it('has labels for all roles', () => {
    const roles: MemberRole[] = ['staff', 'member', 'newcomer', 'partner']
    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })
})
