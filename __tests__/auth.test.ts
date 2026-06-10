import { describe, it, expect } from 'vitest'
import { hasRole, ROLE_LABELS, type MemberRole } from '../lib/auth'
import { getAuthDisplayName } from '../components/themes/formal/FormalShell'

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

describe('getAuthDisplayName', () => {
  it('uses nickname when present', () => {
    expect(getAuthDisplayName({ nickname: ' 阿山 ', name: '王小明' }, 'user@example.com')).toBe('阿山')
  })

  it('falls back to name when nickname is blank', () => {
    expect(getAuthDisplayName({ nickname: '', name: '王小明' }, 'user@example.com')).toBe('王小明')
    expect(getAuthDisplayName({ nickname: '   ', name: '王小明' }, 'user@example.com')).toBe('王小明')
  })

  it('falls back to email prefix when profile names are blank', () => {
    expect(getAuthDisplayName({ nickname: '', name: ' ' }, 'mountain@example.com')).toBe('mountain')
  })

  it('uses the generic member label when no displayable value exists', () => {
    expect(getAuthDisplayName({ nickname: null, name: null }, null)).toBe('會員')
  })
})
