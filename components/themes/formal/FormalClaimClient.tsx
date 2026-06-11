'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormalBackHeader, XField } from '@/components/themes/formal/FormalShell'
import { useAuth } from '@/components/AuthProvider'
import { submitClaim, listPendingClaims, reviewClaim, hasRole, type PendingClaim } from '@/lib/auth'
import { formatClaimLeaderDisplay } from '@/lib/claimDisplay'
import './formal.css'

interface UnclaimedExpedition {
  id: number
  name: string
  grade: string | null
  date_start: string
  date_end: string | null
  leader_display: string | null
  region_entry_county: string | null
  region_entry_town: string | null
  region_exit_county: string | null
  region_exit_town: string | null
  claim_status: 'unclaimed' | 'pending'
}

function formatRegion(county: string | null, town: string | null) {
  if (county && town) return `${county}${town}`
  return county ?? town ?? null
}

function formatClaimDateRange(start: string, end: string | null) {
  const shortStart = start.slice(2)
  if (!end) return shortStart
  const shortEnd = start.slice(0, 4) === end.slice(0, 4) ? end.slice(5) : end.slice(2)
  return `${shortStart} – ${shortEnd}`
}

// ─── Staff: pending claim review row ──────────────────────────────────────────

function PendingClaimRow({ claim, exp, onAction, onOpen }: {
  claim: PendingClaim
  exp?: UnclaimedExpedition
  onAction: (id: number, action: 'approved' | 'rejected') => Promise<void>
  onOpen: (expeditionId: number) => void
}) {
  const [acting, setActing] = useState(false)

  async function handle(action: 'approved' | 'rejected') {
    setActing(true)
    await onAction(claim.id, action)
    setActing(false)
  }

  const entryRegion = formatRegion(exp?.region_entry_county ?? null, exp?.region_entry_town ?? null)
  const exitRegion = formatRegion(exp?.region_exit_county ?? null, exp?.region_exit_town ?? null)
  const sameRegion = exp?.region_entry_county === exp?.region_exit_county
    && exp?.region_entry_town === exp?.region_exit_town

  return (
    <div
      className="x-fieldbox"
      style={{ marginBottom: 10, display: 'flex', alignItems: 'stretch', cursor: 'pointer', padding: 0, overflow: 'hidden' }}
      onClick={() => onOpen(claim.expedition_id)}
    >
      <div style={{ flex: 1, minWidth: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* identity — 沿用認領 card 文法 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, lineHeight: 1.45, minWidth: 0 }}>
            {claim.expedition_name}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--fg)', lineHeight: 1.4, textAlign: 'right', flexShrink: 0, maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatClaimLeaderDisplay(exp?.leader_display ?? null)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            申請人 <span style={{ color: 'var(--accent)' }}>{claim.claimant_name || '—'}</span> · 申請日期 {claim.created_at.slice(0, 10)}
          </span>
          <span style={{ flexShrink: 0, textAlign: 'right' }}>
            {entryRegion ?? '—'}
            {!sameRegion && exitRegion && (
              <> <span style={{ color: 'var(--accent)' }}>→</span> {exitRegion}</>
            )}
            {' · '}{formatClaimDateRange(claim.date_start, exp?.date_end ?? null)}
          </span>
        </div>
        {/* 審核專屬：佐證 */}
        {claim.evidence && (
          <div style={{ borderTop: '0.5px dotted var(--border)', marginTop: 4, paddingTop: 10 }}>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--fg)',
              lineHeight: 1.75, borderLeft: '2px solid var(--border)', paddingLeft: 10,
            }}>
              {claim.evidence}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, borderLeft: '0.5px solid var(--border)' }}>
        <button className="x-claim-review-btn" onClick={(e) => { e.stopPropagation(); handle('approved') }} disabled={acting}>核准</button>
        <button className="x-claim-review-btn" onClick={(e) => { e.stopPropagation(); handle('rejected') }} disabled={acting}>拒絕</button>
      </div>
    </div>
  )
}

// ─── Claim modal ───────────────────────────────────────────────────────────────

function ClaimModal({ team, onClose, onSuccess }: {
  team: UnclaimedExpedition
  onClose: () => void
  onSuccess: () => void
}) {
  const { user, loading: authLoading } = useAuth()
  const [done, setDone] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!user) return
    setSubmitError(null)
    setSubmitting(true)
    const { error } = await submitClaim(team.id, evidence)
    setSubmitting(false)
    if (error) {
      setSubmitError(
        error.message.includes('unique constraint') || error.message.includes('duplicate key')
          ? '你已是此隊伍的認領申請人或成員，無法重複申請。'
          : error.message
      )
      return
    }
    setDone(true)
  }

  function handleClose() {
    if (done) onSuccess()
    onClose()
  }

  return (
    <div className="x-modal-bg" onClick={handleClose}>
      <div className="x-modal" onClick={e => e.stopPropagation()}>
        {!done ? (
          <>
            <h2 style={{ margin: '0 0 6px', fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{team.name}</h2>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 22 }}>
              REC.{String(team.id).padStart(3, '0')} · {team.region_entry_county ?? '—'}{team.region_entry_town ? `・${team.region_entry_town}` : ''} · {team.date_start}{team.date_end ? ` — ${team.date_end}` : ''} · {team.grade ?? '—'}級
            </div>

            {!authLoading && !user ? (
              <div style={{ padding: '18px 0', textAlign: 'center' }}>
                <p style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.8 }}>
                  請先登入才能送出認領申請。
                </p>
                <Link href="/login" className="x-btn solid" style={{ textDecoration: 'none' }}>前往登入</Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', border: '0.5px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="x-role-tag" style={{ color: 'var(--accent)', borderColor: 'color-mix(in oklch, var(--accent) 40%, var(--border))' }}>領隊</span>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 14 }}>
                        認領後隊伍資料將會與 <b style={{ color: 'var(--accent)' }}>Google Drive</b> 取消同步！
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', paddingLeft: 2 }}>
                      嚮導 / 隊員 / 新生 由你於編輯頁新增
                    </div>
                  </div>
                  <XField label="" hint="例如：直企、私訊粉專、告知管理員等方式。">
                    <textarea
                      className="x-textarea"
                      placeholder="我們該如何得知你就是這隻隊伍的領隊？"
                      value={evidence}
                      onChange={e => setEvidence(e.target.value)}
                      disabled={submitting}
                    />
                  </XField>
                  {submitError && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#9a4f37', letterSpacing: '.03em' }}>
                      送出失敗：{submitError}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                  <button className="x-btn" onClick={handleClose} disabled={submitting}>取消</button>
                  <button className="x-btn solid" onClick={handleSubmit} disabled={submitting || authLoading}>
                    {submitting ? '送出中…' : '送出認領'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px', border: '0.5px solid #c8b277', color: '#9a7b2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 18, letterSpacing: 0 }}>審</div>
            <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>已送出，等待審核</h2>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.8, margin: '0 0 22px' }}>
              資料組審核通過後，此隊伍將出現在你的會員頁。<br />
              可於「我參與的隊伍」追蹤狀態。
            </p>
            <button className="x-btn solid" onClick={handleClose}>完成</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FormalClaimClient() {
  const { role, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [unclaimed, setUnclaimed] = useState<UnclaimedExpedition[]>([])
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('ALL')
  const [modal, setModal] = useState<UnclaimedExpedition | null>(null)
  const [expMap, setExpMap] = useState<Map<number, UnclaimedExpedition>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (grade !== 'ALL') params.set('grade', grade)
    void (async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/expeditions/unclaimed?${params}`)
        const d = await r.json()
        setUnclaimed(Array.isArray(d.expeditions) ? d.expeditions : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [q, grade, refreshKey])

  useEffect(() => {
    if (role !== 'curator') return
    void (async () => {
      const [{ data }, expRes] = await Promise.all([
        listPendingClaims(),
        fetch('/api/expeditions/unclaimed').then(r => r.json()).catch(() => ({})),
      ])
      setPendingClaims(data)
      const list: UnclaimedExpedition[] = Array.isArray(expRes.expeditions) ? expRes.expeditions : []
      setExpMap(new Map(list.map(e => [e.id, e])))
    })()
  }, [role, refreshKey])

  async function handleReview(id: number, action: 'approved' | 'rejected') {
    await reviewClaim(id, action)
    refresh()
  }

  if (authLoading || !user) return null

  const canOpen = hasRole(role, 'ranger')

  return (
    <div className="x-scroll-root">
      <FormalBackHeader />
      <div className="x-wrap" style={{ width: 'min(100%, 1160px)', paddingTop: 30, paddingBottom: 90 }}>

        {/* Staff: pending claims review section */}
        {role === 'curator' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div className="x-label" style={{ marginBottom: 14, fontSize: 14 }}>
                待審核認領
                {pendingClaims.length > 0 && (
                  <span style={{ marginLeft: 10, color: 'var(--accent)', letterSpacing: '.04em' }}>
                    {pendingClaims.length}
                  </span>
                )}
              </div>
              {pendingClaims.length === 0 ? (
                <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
                  目前沒有待審核的認領申請。
                </p>
              ) : (
                pendingClaims.map(claim => (
                  <PendingClaimRow key={claim.id} claim={claim} exp={expMap.get(claim.expedition_id)} onAction={handleReview} onOpen={(id) => router.push(`/formal/${id}`)} />
                ))
              )}
            </div>
            <div className="x-hr" style={{ margin: '28px 0 24px' }} />
          </>
        )}

        {/* Header */}
        <div className="x-label" style={{ marginBottom: 8, fontSize: 14 }}>
          認領隊伍
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', margin: '22px 0 6px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>⌕</span>
            <input className="x-input" style={{ paddingLeft: 28 }} placeholder="搜尋 隊伍/地點/領隊" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {['ALL', 'A', 'B', 'C', 'D'].map((g, i) => (
              <span key={g} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {i > 0 && <span style={{ width: 1, height: 11, background: 'var(--border)', flexShrink: 0 }} />}
                <button
                  onClick={() => setGrade(g)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: '.06em', background: 'none', border: 'none',
                    padding: '4px 0', cursor: 'pointer', color: grade === g ? 'var(--accent)' : 'var(--muted)', transition: 'color .12s' }}>
                  {g}
                </button>
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--muted)' }}>
            未認領 {unclaimed.filter(r => r.claim_status === 'unclaimed').length}
          </span>
        </div>
        <div className="x-hr" style={{ marginTop: 18, marginBottom: 20 }} />

        {/* Cards */}
        {!loading && unclaimed.length === 0 && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.04em', lineHeight: 1.8 }}>
            目前沒有符合條件的未認領隊伍。
          </p>
        )}
        <div className="x-claim-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {unclaimed.map(r => {
            const isPending = r.claim_status === 'pending'
            const entryRegion = formatRegion(r.region_entry_county, r.region_entry_town)
            const exitRegion = formatRegion(r.region_exit_county, r.region_exit_town)
            const sameRegion = r.region_entry_county === r.region_exit_county
              && r.region_entry_town === r.region_exit_town
            return (
              <div
                key={r.id}
                className="x-claim-card"
                style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity .15s', cursor: canOpen ? 'pointer' : undefined, padding: 0, gap: 0, overflow: 'hidden' }}
                onClick={canOpen ? () => router.push(`/formal/${r.id}`) : undefined}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, padding: '18px 18px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'baseline' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, lineHeight: 1.45, minWidth: 0 }}>
                      {r.name}
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--fg)', lineHeight: 1.4, textAlign: 'right', flexShrink: 0, maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatClaimLeaderDisplay(r.leader_display)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginTop: 'auto' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                      {formatClaimDateRange(r.date_start, r.date_end)}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, textAlign: 'right', flexShrink: 0 }}>
                      {entryRegion ?? '—'}
                      {!sameRegion && exitRegion && (
                        <> <span style={{ color: 'var(--accent)' }}>→</span> {exitRegion}</>
                      )}
                    </div>
                  </div>
                </div>
                {isPending ? (
                  <div className="x-claim-cta pending">審核中</div>
                ) : (
                  <button className="x-claim-cta" onClick={(e) => { e.stopPropagation(); setModal(r) }}>認領</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <ClaimModal
          team={modal}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
