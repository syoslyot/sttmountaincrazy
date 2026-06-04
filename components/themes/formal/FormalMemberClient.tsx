'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormalBackHeader, XField, XPill } from '@/components/themes/formal/FormalShell'
import { useAuth } from '@/components/AuthProvider'
import { ROLE_LABELS, updateUserProfile, uploadAvatar, listMyMemberships, type MyMembership } from '@/lib/auth'
import './formal.css'

const CONTACT_RE = /^(\+?886|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}$/

type Tab = 'teams' | 'profile'

const ROLE_ZH: Record<MyMembership['role'], string> = { leader: '領隊', member: '隊員' }
const STATUS_PILL: Record<MyMembership['status'], 'pend' | 'pass' | 'rej'> = {
  pending:  'pend',
  approved: 'pass',
  rejected: 'rej',
}

export function FormalMemberClient() {
  const router = useRouter()
  const { user, profile, role, signOut, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('teams')

  // editable profile fields
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [contact, setContact] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'ok' | 'err' | 'invalid-contact' | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [memberships, setMemberships] = useState<MyMembership[]>([])

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setNickname(profile.nickname ?? '')
      setContact(profile.contact ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    listMyMemberships().then(({ data }) => setMemberships(data))
  }, [user])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const { url } = await uploadAvatar(user!.id, file)
    if (url) setAvatarUrl(url)
    setUploadingAvatar(false)
  }


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
    setSaveMsg(null)
    if (contact && !CONTACT_RE.test(contact.trim())) {
      setSaveMsg('invalid-contact')
      return
    }
    if (!user) return
    setSavingProfile(true)
    const { error } = await updateUserProfile(user.id, { name, nickname, contact: contact.trim() || null })
    setSavingProfile(false)
    setSaveMsg(error ? 'err' : 'ok')
    if (!error) setTimeout(() => setSaveMsg(null), 3000)
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
            <label style={{ cursor: 'pointer', flexShrink: 0 }} title="點擊更換頭像">
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} disabled={uploadingAvatar} />
              <div className="x-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initial}
                {uploadingAvatar && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--mono)', fontSize: 10, color: '#fff', letterSpacing: '.05em' }}>…</div>
                )}
              </div>
            </label>
            <div className="x-id-name">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 500 }}>
                  {profile.name ?? user.email?.split('@')[0]}
                </span>
                {role && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', border: '0.5px solid var(--border)', padding: '2px 10px', whiteSpace: 'nowrap' }}>
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', marginTop: 8, wordBreak: 'break-all' }}>
                @{user.email?.split('@')[0]} · {user.email}
              </div>
            </div>
          </div>
          <div className="x-id-stats">
            {([
              ['出隊', memberships.filter(m => m.status === 'approved').length],
              ['紀錄', 0],
              ['領隊', memberships.filter(m => m.role === 'leader' && m.status === 'approved').length],
            ] as [string, number][]).map(([k, v], i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--muted)', marginTop: 5 }}>{k}</div>
              </div>
            ))}
          </div>
          <button className="x-btn x-id-logout" onClick={handleSignOut}>登出</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {(['teams', 'profile'] as Tab[]).map((t, i) => (
              <React.Fragment key={t}>
                {i > 0 && <span style={{ width: 1, height: 11, background: 'var(--border)', flexShrink: 0 }} />}
                <button
                  onClick={() => setTab(t)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 15, letterSpacing: '.04em', background: 'none', border: 'none',
                    padding: '8px 0', cursor: 'pointer', color: tab === t ? 'var(--accent)' : 'var(--muted)', transition: 'color .12s' }}>
                  {t === 'teams' ? '我參與的隊伍' : '個人資料'}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="x-hr" />

        {/* Teams tab */}
        {tab === 'teams' && (
          <div>
            {memberships.length === 0 && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.04em', lineHeight: 1.8, marginTop: 18 }}>
                目前沒有參與的隊伍。
              </p>
            )}
            {memberships.map(m => {
              if (!m.expedition) return null
              const isApprovedLeader = m.role === 'leader' && m.status === 'approved'
              return (
                <div key={m.id} className="x-team-row" style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/formal/${m.expedition!.id}`)}>
                  <div className="num">{String(m.expedition.id).padStart(3, '0')}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{m.expedition.name}</div>
                    <div className="x-team-meta">
                      <span className={m.role === 'leader' ? 'role lead' : 'role'}>{ROLE_ZH[m.role]}</span>
                      <span className="sep">·</span>
                      <span>
                        {m.expedition.date_start}
                        {m.expedition.date_end && ` – ${m.expedition.date_end}`}
                      </span>
                      {m.role === 'member' && m.expedition.leader_display && (
                        <>
                          <span className="sep">·</span>
                          <span>領隊 {m.expedition.leader_display}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="x-team-actions">
                    <XPill status={STATUS_PILL[m.status]} />
                    {isApprovedLeader && (
                      <Link href={`/formal/${m.expedition.id}/edit`} className="x-btn sm"
                        onClick={e => e.stopPropagation()}>✎ 編輯</Link>
                    )}
                  </div>
                </div>
              )
            })}
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
              <input className="x-input mono" placeholder="09xx-xxx-xxx" value={contact}
                onChange={e => { setContact(e.target.value); if (saveMsg === 'invalid-contact') setSaveMsg(null) }}
                onBlur={() => { if (contact && !CONTACT_RE.test(contact.trim())) setSaveMsg('invalid-contact') }}
                style={saveMsg === 'invalid-contact' ? { borderColor: '#9a4f37' } : undefined} />
            </XField>
            <XField label="電子郵件 · EMAIL" style={{ gridColumn: '1 / -1' }}>
              <input className="x-input mono" defaultValue={user.email ?? ''} disabled />
            </XField>
            <XField label="角色 · ROLE" style={{ gridColumn: '1 / -1' }} hint="角色由管理員指派，一般會員無法自行變更">
              <input className="x-input" value={role ? ROLE_LABELS[role] : '—'} disabled />
            </XField>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <button className="x-btn solid" type="submit" disabled={savingProfile}>
                {savingProfile ? '儲存中…' : saveMsg === 'ok' ? '已儲存' : saveMsg === 'err' ? '儲存失敗' : '儲存變更'}
              </button>
              <button type="button" className="x-btn" onClick={() => { setName(profile.name ?? ''); setNickname(profile.nickname ?? ''); setContact(profile.contact ?? ''); setSaveMsg(null) }}>取消</button>
              {saveMsg === 'invalid-contact' && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#9a4f37', letterSpacing: '.05em' }}>電話格式不正確（例：0932-222-222）</span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
