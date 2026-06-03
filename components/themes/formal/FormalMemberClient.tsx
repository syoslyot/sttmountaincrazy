'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormalBackHeader, XField, XPill } from '@/components/themes/formal/FormalShell'
import { useAuth } from '@/components/AuthProvider'
import { ROLE_LABELS } from '@/lib/auth'
import './formal.css'

type Tab = 'teams' | 'profile'

// placeholder until expedition_members table exists
interface MyTeam {
  id: number
  name: string
  role: string
  date: string
  status: 'pend' | 'pass' | 'rej'
}

export function FormalMemberClient() {
  const router = useRouter()
  const { user, profile, role, signOut, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('teams')

  // editable profile fields
  const [name, setName] = useState(profile?.name ?? '')
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [contact, setContact] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // placeholder teams — replace with real API fetch
  const teams: MyTeam[] = []

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login')
    }
  }, [loading, user, profile, router])

  if (loading || !user || !profile) return null

  const initial = (profile.name ?? user.email ?? '?')[0].toUpperCase()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    // placeholder — wire to Supabase update once ready
    await new Promise(r => setTimeout(r, 600))
    setSavingProfile(false)
  }

  return (
    <div className="x-scroll-root">
      <FormalBackHeader />
      <div className="x-wrap" style={{ paddingTop: 30, paddingBottom: 90 }}>
        <div className="x-label" style={{ marginBottom: 16 }}>
          會員資訊 <span className="en">MEMBER PROFILE</span>
        </div>

        {/* Identity card */}
        <div className="x-id-card">
          <div className="x-id-head">
            <div className="x-avatar">{initial}</div>
            <div className="x-id-name">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500 }}>
                  {profile.name ?? user.email?.split('@')[0]}
                </span>
                {role && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', border: '0.5px solid var(--border)', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', marginTop: 8, wordBreak: 'break-all' }}>
                @{user.email?.split('@')[0]} · {user.email}
              </div>
            </div>
          </div>
          <div className="x-id-stats">
            {[['帶隊', teams.filter(t => t.role === '領隊').length], ['紀錄', 0], ['入會', '—']].map(([k, v], i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--muted)', marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
          <button className="x-btn x-id-logout" onClick={handleSignOut}>登出</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, margin: '28px 0 0', flexWrap: 'wrap' }}>
          <button className={`x-chip${tab === 'teams' ? ' active' : ''}`} onClick={() => setTab('teams')}>我參與的隊伍</button>
          <button className={`x-chip${tab === 'profile' ? ' active' : ''}`} onClick={() => setTab('profile')}>個人資料</button>
          <div style={{ flex: 1 }} />
          <Link href="/claim" className="x-chip">＋ 認領新隊伍</Link>
        </div>
        <div className="x-hr" style={{ marginTop: 14 }} />

        {/* Teams tab */}
        {tab === 'teams' && (
          <div>
            {teams.length === 0 && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 22, lineHeight: 1.8, letterSpacing: '.04em' }}>
                尚未參與任何隊伍。點選右上角「＋ 認領新隊伍」開始認領。
              </p>
            )}
            {teams.map(t => {
              const isLeader = t.role === '領隊'
              return (
                <div key={t.id} className="x-team-row" style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/formal/${t.id}`)}>
                  <div className="num">{String(t.id).padStart(3, '0')}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{t.name}</div>
                    <div className="x-team-meta">
                      <span className={isLeader ? 'role lead' : 'role'}>{t.role}</span>
                      <span>{t.date}</span>
                    </div>
                  </div>
                  <div className="x-team-actions">
                    <XPill status={t.status} />
                    {isLeader && (
                      <Link href={`/formal/${t.id}/edit`} className="x-btn sm"
                        onClick={e => e.stopPropagation()}>
                        ✎ 編輯
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 18, lineHeight: 1.8 }}>
              點選任一隊伍可進入詳細頁；<span style={{ color: 'var(--accent)' }}>領隊</span>身分另有「編輯」可進入後台。
              認領送出後須經管理員審核：<span style={{ color: '#9a7b2e' }}>待審核</span> 期間可編輯草稿，<span style={{ color: '#9a4f37' }}>退回</span> 者可修改後重送。
            </p>
          </div>
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} style={{ marginTop: 22, maxWidth: 560, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <XField label="姓名 · NAME" style={{ gridColumn: '1 / -1' }}>
              <input className="x-input" value={name} onChange={e => setName(e.target.value)} />
            </XField>
            <XField label="暱稱 · NICKNAME">
              <input className="x-input" placeholder="自訂暱稱" value={nickname} onChange={e => setNickname(e.target.value)} />
            </XField>
            <XField label="聯絡電話 · CONTACT">
              <input className="x-input mono" placeholder="09xx-xxx-xxx" value={contact} onChange={e => setContact(e.target.value)} />
            </XField>
            <XField label="電子郵件 · EMAIL" style={{ gridColumn: '1 / -1' }} hint="變更 Email 需重新驗證">
              <input className="x-input mono" defaultValue={user.email ?? ''} disabled />
            </XField>
            <XField label="角色 · ROLE" style={{ gridColumn: '1 / -1' }} hint="角色由管理員指派，一般會員無法自行變更">
              <input className="x-input" value={role ? ROLE_LABELS[role] : '—'} disabled />
            </XField>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="x-btn solid" type="submit" disabled={savingProfile}>
                {savingProfile ? '儲存中…' : '儲存變更'}
              </button>
              <button type="button" className="x-btn" onClick={() => { setName(profile.name ?? ''); setNickname(profile.nickname ?? ''); setContact('') }}>取消</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
