'use client'

import Link from 'next/link'
import './formal.css'

const NAV_ITEMS = [
  { href: '/formal/about', label: '關於' },
  { href: '/formal/submit', label: '投稿' },
  { href: '/formal', label: '出隊紀錄' },
]

export function FormalComingSoon({
  title,
  subtitle,
  activeHref,
}: {
  title: string
  subtitle: string
  activeHref: string
}) {
  return (
    <div className="formal-root">
      <header className="formal-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <Link href="/formal" style={{
            fontFamily: 'var(--serif)', fontSize: 22, margin: 0, fontWeight: 500,
            letterSpacing: '.04em', color: 'var(--fg)', textDecoration: 'none',
          }}>
            成大山協
          </Link>
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} style={{
              fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: '.04em',
              color: activeHref === item.href ? 'var(--fg)' : 'var(--muted)',
              borderBottom: activeHref === item.href ? '1.5px solid var(--accent)' : 'none',
              paddingBottom: 1, textDecoration: 'none',
            }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg)', color: 'var(--fg)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.25em',
          color: 'var(--muted)', marginBottom: 14,
        }}>
          {subtitle}
        </div>
        <h2 style={{
          fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 500,
          margin: 0, lineHeight: 1, letterSpacing: '.04em',
        }}>
          {title}
        </h2>
        <div style={{
          marginTop: 24, fontFamily: 'var(--serif)', fontSize: 18,
          fontStyle: 'italic', color: 'var(--accent)',
        }}>
          尚未開放
        </div>
        <div style={{
          marginTop: 14, fontFamily: 'var(--serif)', fontSize: 13,
          color: 'var(--muted)', maxWidth: 420, lineHeight: 1.7,
        }}>
          本頁面正在規劃中。完成後將於此提供完整內容；<br />
          目前請先使用「出隊紀錄」查詢歷年資料。
        </div>
      </main>
    </div>
  )
}
