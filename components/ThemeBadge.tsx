'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const BADGE_LINKS = [
  { href: '/', label: '火箭羊羊', dotStyle: undefined as React.CSSProperties | undefined, extraClass: '' },
  { href: '/hangbao', label: '登山夯爆', dotStyle: { background: '#ff006e' } as React.CSSProperties, extraClass: 'hangbao-badge-link' },
]

export function ThemeBadge({ containerStyle }: { containerStyle?: React.CSSProperties } = {}) {
  const pathname = usePathname()
  if (pathname === '/' && !containerStyle) return null

  const defaultStyle: React.CSSProperties = {
    position: 'fixed', bottom: '1rem', right: '1rem',
    display: 'flex', gap: '0.5rem', zIndex: 9001,
  }
  return (
    <div style={containerStyle ?? defaultStyle}>
      {BADGE_LINKS.map(t => (
        <Link key={t.href} href={t.href}
          className={`theme-badge${t.extraClass ? ` ${t.extraClass}` : ''}`}
          style={{ position: 'static', textDecoration: 'none' }}>
          <span className="theme-badge-dot" style={t.dotStyle} />
          {t.label}
        </Link>
      ))}
    </div>
  )
}
