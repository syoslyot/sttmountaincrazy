'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormalHeader } from '@/components/themes/formal/FormalShell'
import { useAuth } from '@/components/AuthProvider'
import './formal.css'

export function FormalComingSoon({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
  activeHref?: string
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) return null

  return (
    <div className="formal-root">
      <FormalHeader />

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
          目前請先使用「隊伍」查詢歷年資料。
        </div>
      </main>
    </div>
  )
}
