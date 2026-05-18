'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type Theme = 'brutal' | 'showa' | 'neon' | 'riso' | 'topo'

const THEMES: Theme[] = ['brutal', 'showa', 'neon', 'riso', 'topo']

const THEME_NAMES: Record<Theme, string> = {
  brutal: '暴力美學',
  showa:  '昭和登山',
  neon:   '台式霓虹',
  riso:   '油印小誌',
  topo:   '等高線圖',
}

const MEME_IMAGES = [
  '/memes/meme01.jpg', '/memes/meme02.jpg', '/memes/meme03.jpg',
  '/memes/meme04.jpg', '/memes/meme05.jpg', '/memes/meme06.jpg',
  '/memes/meme07.jpg', '/memes/meme08.png', '/memes/meme09.jpg',
  '/memes/meme10.jpg',
]

type AnimPhase = 'travel' | 'fill' | 'fade' | null

const ThemeContext = createContext<{
  theme: Theme
  switchTheme: () => void
}>({ theme: 'brutal', switchTheme: () => {} })

export function useTheme() { return useContext(ThemeContext).theme }
export function useThemeSwitcher() { return useContext(ThemeContext).switchTheme }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme]         = useState<Theme | null>(null)
  const [animPhase, setAnimPhase] = useState<AnimPhase>(null)
  const [animMeme, setAnimMeme]   = useState('')
  const nextThemeRef              = useRef<Theme>('brutal')

  useEffect(() => {
    const stored = sessionStorage.getItem('stt-theme') as Theme | null
    const picked = stored ?? THEMES[Math.floor(Math.random() * THEMES.length)]
    if (!stored) sessionStorage.setItem('stt-theme', picked)
    document.documentElement.dataset.theme = picked
    setTheme(picked)
  }, [])

  useEffect(() => {
    if (animPhase === 'travel') {
      const t = setTimeout(() => setAnimPhase('fill'), 1000)
      return () => clearTimeout(t)
    }
    if (animPhase === 'fill') {
      const t = setTimeout(() => setAnimPhase('fade'), 500)
      return () => clearTimeout(t)
    }
    if (animPhase === 'fade') {
      const t = setTimeout(() => {
        const next = nextThemeRef.current
        sessionStorage.setItem('stt-theme', next)
        document.documentElement.dataset.theme = next
        setTheme(next)
        setAnimPhase(null)
      }, 500)
      return () => clearTimeout(t)
    }
  }, [animPhase])

  if (!theme) return null

  function switchTheme() {
    if (animPhase) return
    const cur = THEMES.indexOf(theme!)
    nextThemeRef.current = THEMES[(cur + 1) % THEMES.length]
    setAnimMeme(MEME_IMAGES[Math.floor(Math.random() * MEME_IMAGES.length)])
    setAnimPhase('travel')
  }

  return (
    <ThemeContext.Provider value={{ theme, switchTheme }}>
      {children}

      {animPhase && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: animPhase === 'travel' ? 'rgba(255,255,255,0)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s',
          pointerEvents: 'all',
          overflow: 'hidden',
        }}>
          <style>{`
            @keyframes memeTravel {
              from { transform: translate(40vw, 42vh) scale(0.08); opacity: 0; }
              25%  { opacity: 1; }
              to   { transform: translate(0, 0) scale(1); }
            }
            @keyframes memeFill {
              from { transform: scale(1); }
              to   { transform: scale(6); }
            }
            @keyframes memeFade {
              from { opacity: 1; }
              to   { opacity: 0; }
            }
          `}</style>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={animMeme} alt="" style={{
            maxWidth: '70vw', maxHeight: '70vh',
            objectFit: 'contain',
            borderRadius: 8,
            animation: animPhase === 'travel'
              ? 'memeTravel 1s cubic-bezier(0.2,0,0.2,1) forwards'
              : animPhase === 'fill'
              ? 'memeFill 0.5s ease-in forwards'
              : 'memeFade 0.5s ease-out forwards',
          }} />
        </div>
      )}
    </ThemeContext.Provider>
  )
}

export { THEME_NAMES }
