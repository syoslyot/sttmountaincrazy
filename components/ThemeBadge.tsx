'use client'

import { useTheme, useThemeSwitcher, THEME_NAMES } from './ThemeProvider'

export function ThemeBadge() {
  const theme = useTheme()
  const switchTheme = useThemeSwitcher()
  return (
    <div className="theme-badge" onClick={switchTheme}>
      <span className="theme-badge-dot" />
      {THEME_NAMES[theme]}
    </div>
  )
}
