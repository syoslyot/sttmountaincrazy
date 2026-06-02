'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FormalBackHeader, XField } from '@/components/themes/formal/FormalShell'

// placeholder until expedition_claims table + API exist
interface UnclaimedExpedition {
  id: number
  name: string
  grade: string
  county: string
  date_start: string
}

function ClaimModal({ team, onClose }: { team: UnclaimedExpedition; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const [evidence, setEvidence] = useState('')

  return (
    <div className="x-modal-bg" onClick={onClose}>
      <div className="x-modal" onClick={e => e.stopPropagation()}>
        {!done ? (
          <>
            <div className="x-label" style={{ marginBottom: 14 }}>認領隊伍 <span className="en">CLAIM TEAM</span></div>
            <h2 style={{ margin: '0 0 6px', fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{team.name}</h2>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 22 }}>
              REC.{String(team.id).padStart(3, '0')} · {team.county} · {team.date_start} · {team.grade}級
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '0.5px solid var(--border)', background: 'var(--surface)' }}>
                <span className="x-role-tag" style={{ color: 'var(--accent)', borderColor: 'color-mix(in oklch, var(--accent) 40%, var(--border))' }}>領隊</span>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 14 }}>
                  以<b style={{ color: 'var(--accent)' }}>領隊</b>身分認領此隊
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                  嚮導 / 隊員 / 新生 由你於編輯頁新增
                </span>
              </div>
              <XField label="佐證說明 · EVIDENCE" hint="例如：出隊公告連結、合照、行前會記錄，供管理員審核">
                <textarea className="x-textarea" placeholder="請說明你帶領此隊伍的佐證資料…" value={evidence} onChange={e => setEvidence(e.target.value)} />
              </XField>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="x-btn" onClick={onClose}>取消</button>
              <button className="x-btn solid" onClick={() => setDone(true)}>送出認領</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px', border: '0.5px solid #c8b277', color: '#9a7b2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
            <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500 }}>已送出，等待審核</h2>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--serif)', fontSize: 13.5, lineHeight: 1.8, margin: '0 0 22px' }}>
              管理員審核通過後，此隊伍將出現在你的會員頁。可於「我參與的隊伍」追蹤狀態。
            </p>
            <button className="x-btn solid" onClick={onClose}>完成</button>
          </div>
        )}
      </div>
    </div>
  )
}

export function FormalClaimClient() {
  // placeholder data — replace with fetch('/api/expeditions/unclaimed')
  const unclaimed: UnclaimedExpedition[] = []

  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('ALL')
  const [modal, setModal] = useState<UnclaimedExpedition | null>(null)

  const rows = unclaimed.filter(r =>
    (!q || r.name.includes(q) || r.county.includes(q)) &&
    (grade === 'ALL' || r.grade === grade)
  )

  return (
    <div className="x-scroll-root">
      <FormalBackHeader />
      <div className="x-wrap" style={{ paddingTop: 30, paddingBottom: 90 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="x-label" style={{ marginBottom: 10 }}>認領隊伍 <span className="en">CLAIM A TEAM</span></div>
            <p style={{ margin: 0, color: 'var(--muted)', fontFamily: 'var(--serif)', fontSize: 13.5, maxWidth: 580, lineHeight: 1.7 }}>
              以下隊伍尚未有人認領<b style={{ color: 'var(--accent)' }}>領隊</b>。認領並填寫佐證後送交管理員審核；通過後即可於編輯頁新增嚮導、隊員與新生。
            </p>
          </div>
          <Link href="/member" className="x-btn ghost sm" style={{ color: 'var(--accent)' }}>← 回會員頁</Link>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '22px 0 6px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>⌕</span>
            <input className="x-input" style={{ paddingLeft: 28 }} placeholder="搜尋名稱／地區" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'A', 'B', 'C', 'D'].map(g => (
              <button key={g} className={`x-chip${grade === g ? ' active' : ''}`} style={{ minWidth: 36, textAlign: 'center' }} onClick={() => setGrade(g)}>{g}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>未認領 {rows.length}</span>
        </div>
        <div className="x-hr" style={{ marginBottom: 20 }} />

        {/* Cards */}
        {rows.length === 0 && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.04em', lineHeight: 1.8 }}>
            目前沒有符合條件的未認領隊伍。
          </p>
        )}
        <div className="x-claim-grid">
          {rows.map(r => (
            <div key={r.id} className="x-claim-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {String(r.id).padStart(3, '0')}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>{r.grade}級</span>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, lineHeight: 1.45, flex: 1 }}>{r.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{r.county} · {r.date_start}</div>
              <button className="x-btn" onClick={() => setModal(r)}>認領 →</button>
            </div>
          ))}
        </div>
      </div>
      {modal && <ClaimModal team={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
