'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import type { ReactNode, CSSProperties } from 'react'

// ─── mobile hook (reuse same breakpoint as FormalDetailClient) ────────────────

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia('(max-width: 680px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getMobile = () => window.matchMedia('(max-width: 680px)').matches
const getServerMobile = () => false

// ─── FormalBackHeader ─────────────────────────────────────────────────────────

export function FormalBackHeader() {
  const isMobile = useSyncExternalStore(subscribeMobile, getMobile, getServerMobile)
  const { user, profile } = useAuth()

  const accBtnStyle: CSSProperties = {
    fontFamily: 'var(--serif)', fontSize: 13, letterSpacing: '.04em',
    color: user && profile ? 'var(--accent)' : 'var(--muted)',
    background: 'transparent', border: 'none', padding: 0,
    cursor: 'pointer', whiteSpace: 'nowrap',
    textDecoration: 'none', display: 'inline-block',
  }

  return (
    <header
      className="formal-header"
      style={isMobile ? { padding: '12px 16px' } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <Link href="/formal" style={{
          fontFamily: 'var(--serif)', fontSize: isMobile ? 18 : 22,
          fontWeight: 500, letterSpacing: '.04em',
          textDecoration: 'none', color: 'inherit',
        }}>
          成大山協
        </Link>
      </div>
      <nav style={{ display: 'flex', gap: isMobile ? 16 : 24, alignItems: 'baseline' }}>
        <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
        {user && profile ? (
          <Link href="/member" style={accBtnStyle}>
            ● {profile.nickname ?? profile.display_name ?? user.email?.split('@')[0] ?? '會員'}
          </Link>
        ) : (
          <Link href="/login" style={accBtnStyle}>登入</Link>
        )}
      </nav>
    </header>
  )
}

// ─── XField ──────────────────────────────────────────────────────────────────

interface XFieldProps {
  label?: string
  hint?: string
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function XField({ label, hint, children, style, className }: XFieldProps) {
  return (
    <div className={`x-field${className ? ` ${className}` : ''}`} style={style}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="x-hint">{hint}</div>}
    </div>
  )
}

// ─── XPill ────────────────────────────────────────────────────────────────────

type PillStatus = 'pend' | 'pass' | 'rej'

const PILL_MAP: Record<PillStatus, string> = {
  pend: '待審核',
  pass: '已通過',
  rej:  '已退回',
}

export function XPill({ status }: { status: PillStatus | string }) {
  const cls = status in PILL_MAP ? status : 'pend'
  const label = PILL_MAP[status as PillStatus] ?? status
  return <span className={`x-pill ${cls}`}>{label}</span>
}
