import Link from 'next/link'
import '@/components/themes/formal/formal.css'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--serif)', padding: 24,
    }}>
      <div style={{
        border: '0.5px solid var(--border)', background: 'var(--surface)',
        padding: '48px 56px', textAlign: 'center', maxWidth: 420,
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.2em', color: 'var(--muted)', marginBottom: 14 }}>
          ERROR · 404
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, margin: '0 0 10px', letterSpacing: '.02em' }}>
          查無此頁
        </h1>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.7 }}>
          這筆紀錄不存在，或尚未公開。
        </p>
        <Link href="/formal" style={{
          display: 'inline-block', border: '0.5px solid var(--border)',
          padding: '9px 20px', fontFamily: 'var(--mono)', fontSize: 11,
          letterSpacing: '.1em', color: 'var(--accent)', textDecoration: 'none',
        }}>
          返回隊伍索引
        </Link>
      </div>
    </div>
  )
}
