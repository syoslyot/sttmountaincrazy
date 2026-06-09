'use client'

import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import type { ReactNode, CSSProperties } from 'react'

// ─── mobile hook ──────────────────────────────────────────────────────────────

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia('(max-width: 680px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getMobile = () => window.matchMedia('(max-width: 680px)').matches
const getServerMobile = () => false

const NAV_TABS = [
  { label: '關於', href: '/formal/about'  },
  { label: '投稿', href: '/formal/submit' },
  { label: '隊伍', href: '/formal'        },
]

// ─── FormalHeader — single shared header for all formal pages ─────────────────

export function FormalHeader() {
  const isMobile = useSyncExternalStore(subscribeMobile, getMobile, getServerMobile)
  const pathname  = usePathname()
  const { user, profile, loading } = useAuth()

  const authHref  = user && profile ? '/member' : '/login'
  const authLabel = user && profile
    ? (profile.nickname ?? profile.name ?? user.email?.split('@')[0] ?? '會員')
    : '登入'

  const accBtnStyle: CSSProperties = {
    fontFamily: 'var(--serif)', fontSize: 13, letterSpacing: '.04em',
    color: user && profile ? 'var(--accent)' : 'var(--muted)',
    textDecoration: 'none',
    visibility: loading ? 'hidden' : 'visible',
  }

  return (
    <header className="formal-header" style={isMobile ? { padding: '12px 16px' } : undefined}>
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
        {NAV_TABS.map(tab => {
          const active = tab.href === '/formal'
            ? pathname === '/formal'
            : pathname.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} style={{
              fontFamily: 'var(--serif)', fontSize: isMobile ? 13 : 14, letterSpacing: '.04em',
              color: active ? 'var(--fg)' : 'var(--muted)',
              borderBottom: active ? '1.5px solid var(--accent)' : 'none',
              paddingBottom: 1, textDecoration: 'none',
            }}>{tab.label}</Link>
          )
        })}
        {(profile?.role === 'ranger' || profile?.role === 'curator') && (
          <Link href="/formal/claim" style={{
            fontFamily: 'var(--serif)', fontSize: isMobile ? 13 : 14, letterSpacing: '.04em',
            color: pathname === '/formal/claim' ? 'var(--fg)' : 'var(--muted)',
            borderBottom: pathname === '/formal/claim' ? '1.5px solid var(--accent)' : 'none',
            paddingBottom: 1, textDecoration: 'none',
          }}>認領</Link>
        )}
        <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
        <Link href={authHref} style={accBtnStyle}>{authLabel}</Link>
      </nav>
    </header>
  )
}

// ─── FormalBackHeader — alias kept for existing imports ───────────────────────
export function FormalBackHeader() { return <FormalHeader /> }

// ─── FormalHeaderNav — right-side nav for use in custom page headers ──────────
export function FormalHeaderNav() {
  const pathname         = usePathname()
  const { user, profile, loading } = useAuth()
  const authHref  = user && profile ? '/member' : '/login'
  const authLabel = user && profile
    ? (profile.nickname ?? profile.name ?? user.email?.split('@')[0] ?? '會員')
    : '登入'
  return (
    <nav style={{ display: 'flex', gap: 24, alignItems: 'baseline', flexShrink: 0 }}>
      {NAV_TABS.map(tab => {
        const active = tab.href === '/formal'
          ? pathname === '/formal' || /^\/formal\/\d/.test(pathname)
          : pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} style={{
            fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: '.04em',
            color: active ? 'var(--fg)' : 'var(--muted)',
            borderBottom: active ? '1.5px solid var(--accent)' : 'none',
            paddingBottom: 1, textDecoration: 'none',
          }}>{tab.label}</Link>
        )
      })}
      {(profile?.role === 'ranger' || profile?.role === 'curator') && (
        <Link href="/formal/claim" style={{
          fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: '.04em',
          color: pathname.startsWith('/formal/claim') ? 'var(--fg)' : 'var(--muted)',
          borderBottom: pathname.startsWith('/formal/claim') ? '1.5px solid var(--accent)' : 'none',
          paddingBottom: 1, textDecoration: 'none',
        }}>認領</Link>
      )}
      <span style={{ width: 1, height: 14, background: 'var(--border)', display: 'inline-block' }} />
      <Link href={authHref} style={{
        fontFamily: 'var(--serif)', fontSize: 13, letterSpacing: '.04em',
        color: user && profile ? 'var(--accent)' : 'var(--muted)',
        textDecoration: 'none',
        visibility: loading ? 'hidden' : 'visible',
      }}>{authLabel}</Link>
    </nav>
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
