'use client'

import { useTheme, THEME_NAMES } from './ThemeProvider'

export function ThemeBadge() {
  const theme = useTheme()
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 200 }}>
      <div className="theme-badge" style={{ position: 'static' }}>
        <span className="theme-badge-dot" />
        {THEME_NAMES[theme]}
      </div>
      <div className="theme-badge" style={{ position: 'static', cursor: 'default' }}>
        <span className="theme-badge-dot" style={{ background: '#0066cc' }} />
        登山夯暴
      </div>
    </div>
  )
}
