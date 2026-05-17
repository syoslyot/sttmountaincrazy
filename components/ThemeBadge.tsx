'use client'

import { useTheme, THEME_NAMES } from './ThemeProvider'

export function ThemeBadge() {
  const theme = useTheme()
  return (
    <div className="theme-badge">
      <span className="theme-badge-dot" />
      {THEME_NAMES[theme]}
    </div>
  )
}
