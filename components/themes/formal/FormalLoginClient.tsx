'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FormalBackHeader } from '@/components/themes/formal/FormalShell'
import { XField } from '@/components/themes/formal/FormalShell'
import { useAuth } from '@/components/AuthProvider'
import { signInWithOAuth } from '@/lib/auth'
import './formal.css'

type Mode = 'login' | 'forgot' | 'signup'

const TITLES: Record<Mode, string>    = { login: '登入成大山協', forgot: '重設密碼', signup: '建立帳號' }
const SUBTITLES: Record<Mode, string> = {
  login:  '登入後可認領隊伍、撰寫圖文紀錄與管理航跡檔案。',
  forgot: '輸入註冊用 Email，我們會寄送重設連結。',
  signup: '以 Email 註冊，送出後由社團幹部開通權限。',
}

const OAUTH_ICON: Record<'google' | 'facebook', string> = {
  google:   'G',
  facebook: 'f',
}

export function FormalLoginClient() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'login') {
      setLoading(true)
      const { error: err } = await signIn(email, password)
      setLoading(false)
      if (err) { setError('帳號或密碼錯誤，請再試一次。'); return }
      router.push('/member')
    } else if (mode === 'forgot') {
      setSent(true)
    } else {
      setSent(true)
    }
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setOauthLoading(provider)
    await signInWithOAuth(provider)
    // signInWithOAuth redirects the browser — this line rarely runs
    setOauthLoading(null)
  }

  return (
    <div className="x-scroll-root">
      <FormalBackHeader />
      <div className="x-center">
        <div className="x-card">
          <div className="x-label" style={{ marginBottom: 16 }}>
            會員 <span className="en">MEMBER ACCESS</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--serif)', fontSize: 27, fontWeight: 500, letterSpacing: '.01em' }}>
            {TITLES[mode]}
          </h1>
          <p style={{ margin: '0 0 26px', color: 'var(--muted)', fontFamily: 'var(--serif)', fontSize: 13.5, lineHeight: 1.7 }}>
            {SUBTITLES[mode]}
          </p>

          {sent ? (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.8 }}>
              {mode === 'forgot' ? '重設連結已寄出，請查收 Email。' : '申請已送出，等待幹部開通權限。'}
              <br />
              <button className="x-btn ghost sm" style={{ color: 'var(--accent)', marginTop: 12 }} onClick={() => { setSent(false); setMode('login') }}>
                返回登入
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'signup' && (
                <XField label="姓名 · NAME">
                  <input className="x-input" placeholder="王小明" value={name} onChange={e => setName(e.target.value)} required />
                </XField>
              )}
              <XField label="電子郵件 · EMAIL">
                <input className="x-input mono" type="email" placeholder="you@example.ncku.edu.tw" value={email} onChange={e => setEmail(e.target.value)} required />
              </XField>
              {mode !== 'forgot' && (
                <XField label="密碼 · PASSWORD">
                  <input className="x-input mono" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </XField>
              )}
              {mode === 'signup' && (
                <XField label="確認密碼 · CONFIRM">
                  <input className="x-input mono" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </XField>
              )}
              {mode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                    記住我
                  </label>
                  <button type="button" className="x-btn ghost sm" style={{ color: 'var(--accent)' }} onClick={() => setMode('forgot')}>
                    忘記密碼？
                  </button>
                </div>
              )}
              {error && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#9a4f37', letterSpacing: '.03em' }}>{error}</div>
              )}
              <button className="x-btn solid" type="submit" disabled={loading} style={{ padding: '12px', marginTop: 4, fontSize: 13 }}>
                {loading ? '請稍候…' : mode === 'login' ? '登入 · LOGIN' : mode === 'forgot' ? '寄送重設連結' : '送出申請'}
              </button>
            </form>
          )}

          {/* OAuth — only show on login / signup modes */}
          {!sent && mode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 4px' }}>
                <span style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)' }}>或</span>
                <span style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {(['google', 'facebook'] as const).map(provider => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => handleOAuth(provider)}
                    disabled={oauthLoading !== null}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      fontFamily: 'var(--serif)', fontSize: 13, letterSpacing: '.03em',
                      color: 'var(--fg)', background: 'var(--surface)',
                      border: '0.5px solid var(--border)', padding: '10px 16px',
                      cursor: 'pointer', opacity: oauthLoading !== null ? 0.6 : 1,
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                      width: 18, textAlign: 'center', color: 'var(--accent)',
                    }}>{OAUTH_ICON[provider]}</span>
                    {oauthLoading === provider
                      ? '請稍候…'
                      : `以 ${provider === 'google' ? 'Google' : 'Facebook'} 帳號登入`}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="x-hr" style={{ margin: '24px 0 16px' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            {mode === 'login' ? (
              <>還沒有帳號？<button className="x-btn ghost sm" style={{ color: 'var(--accent)' }} onClick={() => { setMode('signup'); setError(null) }}>註冊 →</button></>
            ) : (
              <>已有帳號？<button className="x-btn ghost sm" style={{ color: 'var(--accent)' }} onClick={() => { setMode('login'); setError(null); setSent(false) }}>返回登入</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
