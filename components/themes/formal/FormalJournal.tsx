'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JournalBlock {
  type: 'text' | 'image' | 'twincol'
  text?: string       // HTML string for text blocks
  cap?: string        // caption for image
  a?: { cap: string } // twincol left
  b?: { cap: string } // twincol right
}

export interface JournalDay {
  day: string   // e.g. "D0", "D1"
  label: string // e.g. "茶茶牙頓主稜"
  date: string  // e.g. "05/01"
  blocks: JournalBlock[]
  author?: string
  updatedAt?: string
}

interface Props {
  days: JournalDay[]
  canEdit?: boolean
  editHref?: string  // href for the edit button
}

// ─── JBlock ───────────────────────────────────────────────────────────────────

function JBlock({ b }: { b: JournalBlock }) {
  if (b.type === 'text') {
    return b.text
      ? <div className="x-jp x-rt-content" dangerouslySetInnerHTML={{ __html: b.text }} />
      : null
  }
  if (b.type === 'image') {
    return (
      <figure className="x-jfig">
        <div className="x-photo" style={{ height: 340 }}>
          <span className="tag">PHOTO · {b.cap}</span>
        </div>
        <figcaption className="x-jcap">圖 · {b.cap}</figcaption>
      </figure>
    )
  }
  if (b.type === 'twincol') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '0 0 28px' }}>
        {([b.a, b.b] as { cap: string }[]).map((c, i) => (
          <figure key={i} style={{ margin: 0 }}>
            <div className="x-photo" style={{ height: 200 }}>
              <span className="tag">PHOTO · {c?.cap}</span>
            </div>
            <figcaption className="x-jcap">圖 · {c?.cap}</figcaption>
          </figure>
        ))}
      </div>
    )
  }
  return null
}

// ─── FormalJournal ────────────────────────────────────────────────────────────

export function FormalJournal({ days, canEdit = false, editHref }: Props) {
  const [activeDay, setActiveDay] = useState(0)
  const cur = days[activeDay]

  if (!days.length) return null

  return (
    <div className="x-journal">
      {/* header */}
      <div className="x-wrap">
        <div className="x-journal-head">
          <div className="x-label">
            圖文紀錄 <span className="en">FIELD JOURNAL</span>
          </div>
          {canEdit && editHref && (
            <Link href={editHref} className="x-btn sm">✎ 編輯紀錄</Link>
          )}
        </div>
      </div>

      {/* day tabs */}
      <div className="x-daytabs">
        <div className="x-wrap" style={{ display: 'flex', gap: 0, padding: '0 36px' }}>
          {days.map((d, i) => (
            <button
              key={i}
              className={`x-daytab${activeDay === i ? ' active' : ''}`}
              onClick={() => setActiveDay(i)}
            >
              <span className="d">{d.day}</span>
              <span className="dt">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div className="x-wrap">
        <div className="x-journal-body">
          <div className="x-day-head">
            <span className="x-day-no">{cur.day}</span>
            <div>
              <div className="x-day-label">{cur.label}</div>
              <div className="x-day-date">{cur.date} · {new Date().getFullYear()}</div>
            </div>
          </div>

          {cur.blocks.length === 0 && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', letterSpacing: '.06em' }}>
              尚無紀錄內容。
            </p>
          )}
          {cur.blocks.map((b, i) => <JBlock key={i} b={b} />)}

          {(cur.author || cur.updatedAt) && (
            <div style={{
              borderTop: '0.5px solid var(--border)', paddingTop: 18, marginTop: 18,
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
              display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
            }}>
              {cur.author && <span>紀錄 · {cur.author}</span>}
              {cur.updatedAt && <span>最後更新 {cur.updatedAt}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
