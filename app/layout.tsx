import type { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { ThemeBadge } from '@/components/ThemeBadge'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: '成大山協',
  description: 'NCKU',
}

const FONT_URL = [
  'https://fonts.googleapis.com/css2?',
  'family=Space+Mono:wght@400;700',
  '&family=Space+Grotesk:wght@400;700',
  '&family=Noto+Sans+TC:wght@400;700;900',
  '&family=Noto+Serif+TC:wght@300;400;700',
  '&family=IM+Fell+DW+Pica:ital@0;1',
  '&family=Bebas+Neue',
  '&family=Courier+Prime:ital,wght@0,400;0,700;1,400',
  '&display=swap',
].join('')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONT_URL} rel="stylesheet" />
      </head>
      <body>
        {children}
        <ThemeBadge />
        <GoogleAnalytics gaId="G-22DPL2TKN2" />
      </body>
    </html>
  )
}
