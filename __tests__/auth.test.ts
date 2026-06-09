import { describe, it, expect } from 'vitest'
import { hasRole, ROLE_LABELS, type MemberRole } from '../lib/auth'

describe('hasRole', () => {
  it('returns false for null role', () => {
    expect(hasRole(null, 'cadet')).toBe(false)
  })

  it('curator meets all role requirements', () => {
    const roles: MemberRole[] = ['curator', 'ranger', 'cadet', 'associate']
    for (const r of roles) {
      expect(hasRole('curator', r)).toBe(true)
    }
  })

  it('ranger meets ranger/cadet/associate but not curator', () => {
    expect(hasRole('ranger', 'curator')).toBe(false)
    expect(hasRole('ranger', 'ranger')).toBe(true)
    expect(hasRole('ranger', 'cadet')).toBe(true)
    expect(hasRole('ranger', 'associate')).toBe(true)
  })

  it('cadet meets cadet/associate but not curator/ranger', () => {
    expect(hasRole('cadet', 'curator')).toBe(false)
    expect(hasRole('cadet', 'ranger')).toBe(false)
    expect(hasRole('cadet', 'cadet')).toBe(true)
    expect(hasRole('cadet', 'associate')).toBe(true)
  })

  it('associate only meets associate', () => {
    expect(hasRole('associate', 'curator')).toBe(false)
    expect(hasRole('associate', 'ranger')).toBe(false)
    expect(hasRole('associate', 'cadet')).toBe(false)
    expect(hasRole('associate', 'associate')).toBe(true)
  })
})

describe('ROLE_LABELS', () => {
  it('has labels for all roles', () => {
    const roles: MemberRole[] = ['curator', 'ranger', 'cadet', 'associate']
    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })
})
