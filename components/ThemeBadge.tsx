'use client'

import Link from 'next/link'
import { useTheme, THEME_NAMES } from './ThemeProvider'

export function ThemeBadge() {
  const theme = useTheme()
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 200 }}>
      <Link href="/" className="theme-badge" style={{ position: 'static', textDecoration: 'none' }}>
        <span className="theme-badge-dot" />
        {THEME_NAMES[theme]}
      </Link>
      <Link href="/cool" className="theme-badge" style={{ position: 'static', textDecoration: 'none' }}>
        <span className="theme-badge-dot" style={{ background: '#ff006e' }} />
        登山夯爆
      </Link>
    </div>
  )
}
