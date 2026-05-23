'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/rocket',  label: '火箭羊羊', badgeClass: 'rocket-badge-link',  hasDot: true },
  { href: '/hangbao', label: '登山夯爆', badgeClass: 'hangbao-badge-link', hasDot: false },
  { href: '/formal',  label: '成大山協', badgeClass: 'formal-badge-link',  hasDot: false },
]

const ROCKET_STYLE: React.CSSProperties = {
  position: 'static', textDecoration: 'none',
  border: '2px solid #e65100', fontWeight: 700, transform: 'rotate(-1deg)',
}
const ROCKET_DOT_STYLE: React.CSSProperties = { background: '#0066cc' }
const DEFAULT_LINK_STYLE: React.CSSProperties = { position: 'static', textDecoration: 'none' }

export function ThemeBadge({ containerStyle }: { containerStyle?: React.CSSProperties } = {}) {
  const pathname = usePathname()

  // Layout-level badge: suppress when page handles its own (rocket home, expedition detail, and / which is just redirecting)
  if (!containerStyle && (
    pathname === '/' ||
    pathname.startsWith('/rocket') ||
    pathname.startsWith('/expedition') ||
    pathname.startsWith('/formal')
  )) return null

  const defaultStyle: React.CSSProperties = {
    position: 'fixed', bottom: '1rem', right: '1rem',
    display: 'flex', gap: '0.5rem', zIndex: 9001,
  }

  return (
    <div style={containerStyle ?? defaultStyle}>
      {LINKS.map(t => {
        const isRocket = t.href === '/rocket'
        return (
          <Link key={t.href} href={t.href}
            className={`theme-badge ${t.badgeClass}`}
            style={isRocket ? ROCKET_STYLE : DEFAULT_LINK_STYLE}>
            {t.hasDot && <span className="theme-badge-dot" style={ROCKET_DOT_STYLE} />}
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
