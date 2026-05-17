'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'brutal' | 'showa' | 'neon' | 'riso' | 'topo'

const THEMES: Theme[] = ['brutal', 'showa', 'neon', 'riso', 'topo']

const THEME_NAMES: Record<Theme, string> = {
  brutal: '暴力美學',
  showa:  '昭和登山',
  neon:   '台式霓虹',
  riso:   '油印小誌',
  topo:   '等高線圖',
}

const ThemeContext = createContext<Theme>('brutal')

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('stt-theme') as Theme | null
    const picked = stored ?? THEMES[Math.floor(Math.random() * THEMES.length)]
    if (!stored) sessionStorage.setItem('stt-theme', picked)
    document.documentElement.dataset.theme = picked
    setTheme(picked)
  }, [])

  if (!theme) return null

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export { THEME_NAMES }
