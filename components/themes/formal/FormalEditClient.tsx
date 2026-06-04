'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent, type DragEvent } from 'react'
import Link from 'next/link'
import { FormalBackHeader, XField } from '@/components/themes/formal/FormalShell'
import './formal.css'
import {
  updateExpedition, getAuthClient,
  listMemberProfiles, type MemberProfile,
  getExpeditionMembers, syncExpeditionMembers,
  saveExpeditionJournal,
} from '@/lib/auth'
import type { ExpeditionDetail } from '@/lib/supabase'
import type { JournalBlock } from '@/components/themes/formal/FormalJournal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileItem {
  id: number          // local React key
  dbId?: number       // DB row id (undefined = not yet persisted)
  name: string
  type: string
  size: string
  filePath?: string   // Supabase Storage path
  uploading: boolean
  editing: boolean
}
interface Member   { id: number; user_id?: string; name: string; role: string; locked?: boolean; collab: boolean; editing?: boolean }

const COUNTIES = [
  '台北市','新北市','基隆市','桃園市','新竹市','新竹縣','苗栗縣',
  '台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣',
  '台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣',
]

type RtPreset = 'minimal' | 'standard' | 'full'
type Layout   = 'split' | 'inline'
type Grade    = 'A' | 'B' | 'C' | 'D'

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

const RT_PALETTE_TEXT   = ['#1a1916','#8a5a36','#4d7049','#3d6b9e','#9a4f37']
const RT_PALETTE_HILITE = ['#f3e6a8','#cfe6c0','#bcd9f0','#f0cdbc','__none__']

interface RtDef {
  cmd?: string; block?: string; color?: string; link?: boolean
  label: string; title: string
  style?: React.CSSProperties
}
const RT_DEFS: Record<string, RtDef> = {
  bold:     { cmd:'bold',                   label:'B',      title:'粗體',     style:{ fontWeight:700 } },
  italic:   { cmd:'italic',                 label:'I',      title:'斜體',     style:{ fontStyle:'italic' } },
  underline:{ cmd:'underline',              label:'U',      title:'底線',     style:{ textDecoration:'underline' } },
  strike:   { cmd:'strikeThrough',          label:'S',      title:'刪除線',   style:{ textDecoration:'line-through' } },
  h2:       { block:'h2',                   label:'大標',   title:'大標題' },
  h3:       { block:'h3',                   label:'標題',   title:'小標題' },
  quote:    { block:'blockquote',           label:'引言',   title:'引言' },
  ul:       { cmd:'insertUnorderedList',    label:'• 清單', title:'項目清單' },
  ol:       { cmd:'insertOrderedList',      label:'1. 清單',title:'編號清單' },
  alignL:   { cmd:'justifyLeft',            label:'⫷',      title:'靠左' },
  alignC:   { cmd:'justifyCenter',          label:'☰',      title:'置中' },
  alignR:   { cmd:'justifyRight',           label:'⫸',      title:'靠右' },
  color:    { color:'foreColor',            label:'A',      title:'文字顏色' },
  hilite:   { color:'hiliteColor',          label:'☆',      title:'螢光標記' },
  hr:       { cmd:'insertHorizontalRule',   label:'──',     title:'分隔線' },
  link:     { link:true,                    label:'連結',   title:'插入連結' },
  clear:    { cmd:'removeFormat',           label:'清除',   title:'清除格式' },
}
const RT_PRESETS: Record<RtPreset, string[]> = {
  minimal:  ['bold','italic','underline','sep','link','clear'],
  standard: ['bold','italic','underline','strike','sep','h3','quote','ul','ol','sep','link','clear'],
  full:     ['bold','italic','underline','strike','sep','h2','h3','quote','sep','ul','ol','sep','alignL','alignC','alignR','sep','color','hilite','hr','sep','link','clear'],
}
function RichText({ html, onChange, placeholder, preset = 'standard' }: {
  html: string; onChange: (v: string) => void; placeholder?: string; preset?: RtPreset
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState<string | null>(null)
  const composing = useRef(false)

  const emit = useCallback(() => { if (ref.current) onChange(ref.current.innerHTML) }, [onChange])

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html
    }
  }, [html])

  function run(key: string) {
    const b = RT_DEFS[key]
    ref.current?.focus()
    if (b.color) { setPop(p => p === b.color ? null : b.color!); return }
    if (b.link)  { const u = window.prompt('連結網址：', 'https://'); if (u) document.execCommand('createLink', false, u) }
    else if (b.block) {
      const cur = (document.queryCommandValue('formatBlock') ?? '').toLowerCase()
      document.execCommand('formatBlock', false, cur === b.block ? 'div' : b.block)
    } else {
      document.execCommand(b.cmd!, false, undefined)
    }
    emit()
  }

  function applyColor(cmd: string, c: string) {
    ref.current?.focus()
    try { document.execCommand('styleWithCSS', false, 'true') } catch (_) { /* noop */ }
    document.execCommand(cmd, false, c === '__none__' ? 'transparent' : c)
    emit(); setPop(null)
  }

  const keys = RT_PRESETS[preset] ?? RT_PRESETS.standard

  return (
    <div className="x-rt">
      <div className="x-rt-tb">
        {keys.map((key, i) => key === 'sep'
          ? <span key={i} className="x-rt-sep" />
          : (() => {
              const b = RT_DEFS[key]
              return (
                <span key={i} style={{ position: 'relative', display: 'inline-flex' }}>
                  <button type="button" className="x-rt-btn" style={b.style} title={b.title}
                    onMouseDown={e => e.preventDefault()} onClick={() => run(key)}>
                    {b.label}
                  </button>
                  {b.color && pop === b.color && (
                    <div className="x-rt-pop" onMouseDown={e => e.preventDefault()}>
                      {(b.color === 'foreColor' ? RT_PALETTE_TEXT : RT_PALETTE_HILITE).map(c => (
                        <button key={c} type="button" className="x-rt-swatch" title={c === '__none__' ? '移除' : c}
                          style={{ background: c === '__none__' ? 'transparent' : c,
                            backgroundImage: c === '__none__' ? 'linear-gradient(45deg,transparent 45%,#9a4f37 45% 55%,transparent 55%)' : 'none' }}
                          onClick={() => applyColor(b.color!, c)} />
                      ))}
                    </div>
                  )}
                </span>
              )
            })()
        )}
      </div>
      <div ref={ref} className="x-rt-area" contentEditable suppressContentEditableWarning
        data-ph={placeholder}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false; emit() }}
        onInput={() => { if (!composing.current) emit() }}
        onBlur={emit} />
    </div>
  )
}

// ─── Upload Group ─────────────────────────────────────────────────────────────

function UploadGroup({ title, en, accept, inputAccept, note, bucket, expeditionId, getToken, files, set }: {
  title: string; en: string; accept: string; inputAccept: string; note: string
  bucket: 'gpx' | 'maps' | 'records'
  expeditionId: string
  getToken: () => Promise<string | null>
  files: FileItem[]; set: React.Dispatch<React.SetStateAction<FileItem[]>>
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(selectedFiles: FileList | null) {
    if (!selectedFiles?.length) return
    const token = await getToken()
    if (!token) return

    for (const f of Array.from(selectedFiles)) {
      const localId = Date.now() + Math.random()
      const ext = f.name.split('.').pop()?.toUpperCase() ?? '?'
      set(fs => [...fs, { id: localId, name: f.name, type: ext, size: formatSize(f.size), uploading: true, editing: false }])

      const form = new FormData()
      form.append('file', f)
      form.append('expedition_id', expeditionId)
      form.append('bucket', bucket)

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        const data = await res.json()
        if (res.ok) {
          set(fs => fs.map(x => x.id === localId
            ? { ...x, dbId: data.id, filePath: data.file_path, uploading: false }
            : x))
        } else {
          set(fs => fs.filter(x => x.id !== localId))
          alert(`上傳失敗：${data.error}`)
        }
      } catch {
        set(fs => fs.filter(x => x.id !== localId))
      }
    }
  }

  async function del(file: FileItem) {
    if (!file.dbId || !file.filePath) { set(fs => fs.filter(x => x.id !== file.id)); return }
    const token = await getToken()
    if (!token) return
    await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbId: file.dbId, filePath: file.filePath, bucket, expeditionId: Number(expeditionId) }),
    })
    set(fs => fs.filter(x => x.id !== file.id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div className="x-label">{title} <span className="en">{en}</span></div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{note}</span>
      </div>
      <input ref={inputRef} type="file" accept={inputAccept} multiple hidden onChange={e => upload(e.target.files)} />
      <div className="x-dropzone" onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files) }}
        style={{ marginBottom: files.length ? 12 : 0 }}>
        ⬆　拖曳檔案到此，或<span style={{ color: 'var(--accent)' }}> 點擊選擇檔案 </span>（{accept}）
      </div>
      {files.map(file => (
        <div key={file.id} className="x-file-row">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 7px', border: '0.5px solid var(--border)', color: 'var(--accent)', flexShrink: 0 }}>{file.type}</span>
          <span className="fname" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 13, wordBreak: 'break-all', opacity: file.uploading ? 0.5 : 1 }}>
            {file.uploading ? `上傳中… ${file.name}` : file.name}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{file.size}</span>
          <button className="x-btn ghost sm" style={{ color: '#9a4f37' }} disabled={file.uploading} onClick={() => del(file)}>移除</button>
        </div>
      ))}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── Block Editor ─────────────────────────────────────────────────────────────

interface EditorBlock extends JournalBlock { id: number }

const BLOCK_KINDS = [
  { t: 'day',     label: '日期標頭', icon: '▷' },
  { t: 'text',    label: '文字段落', icon: '¶' },
  { t: 'image',   label: '單張圖片', icon: '▣' },
  { t: 'twincol', label: '雙圖並排', icon: '▣▣' },
] as const

function PvBlock({ b, pvId }: { b: EditorBlock; pvId?: string }) {
  if (b.type === 'day') return (
    <div id={pvId} style={{ marginBottom: 22 }}>
      <div className="x-day-head">
        <span className="x-day-no">{b.day || 'D?'}</span>
        <div>
          <div className="x-day-label">{b.label || '（行程標題）'}</div>
          {b.date && <div className="x-day-date">{b.date} · {new Date().getFullYear()}</div>}
        </div>
      </div>
    </div>
  )
  if (b.type === 'text') return b.text
    ? <div className="x-jp x-rt-content" style={{ fontSize: 15 }} dangerouslySetInnerHTML={{ __html: b.text }} />
    : <p className="x-jp" style={{ fontSize: 15, color: 'var(--muted)' }}>（空白段落）</p>
  if (b.type === 'image') return (
    <figure className="x-jfig">
      <div className="x-photo" style={{ height: 200 }}><span className="tag">PHOTO · {b.cap || '圖片'}</span></div>
      <figcaption className="x-jcap">圖 · {b.cap}</figcaption>
    </figure>
  )
  if (b.type === 'twincol') return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 0 24px' }}>
      {([b.a, b.b] as { cap: string }[]).map((c, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <div className="x-photo" style={{ height: 130 }}><span className="tag">PHOTO</span></div>
          <figcaption className="x-jcap">圖 · {c?.cap ?? ''}</figcaption>
        </figure>
      ))}
    </div>
  )
  return null
}

function BlockRow({ b, idx, total, onChange, onMove, onDel, drag, rtPreset }: {
  b: EditorBlock; idx: number; total: number
  onChange: (i: number, p: Partial<EditorBlock>) => void
  onMove: (i: number, d: number) => void
  onDel: (i: number) => void
  drag: { start: (i: number) => void; over: (i: number) => void; drop: () => void; overIdx: number | null }
  rtPreset: RtPreset
}) {
  return (
    <div className="x-block" draggable
      onDragStart={(e) => {
        if ((e.target as HTMLElement).closest('[contenteditable]')) { e.preventDefault(); return }
        drag.start(idx)
      }}
      onDragOver={(e: DragEvent) => { e.preventDefault(); drag.over(idx) }}
      onDrop={drag.drop}
      style={{ outline: drag.overIdx === idx ? '1.5px solid var(--accent)' : 'none' }}>
      <div className="x-block-bar">
        <span style={{ cursor: 'grab', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>⠿</span>
        <span className="knd">{BLOCK_KINDS.find(k => k.t === b.type)?.label}</span>
        <div style={{ flex: 1 }} />
        <button className="x-btn ghost sm" disabled={idx === 0}           onClick={() => onMove(idx, -1)}>↑</button>
        <button className="x-btn ghost sm" disabled={idx === total - 1}   onClick={() => onMove(idx,  1)}>↓</button>
        <button className="x-btn ghost sm" style={{ color: '#9a4f37' }}   onClick={() => onDel(idx)}>✕</button>
      </div>
      <div className="x-block-body">
        {b.type === 'day' && (
          <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 110px', gap: 10 }}>
            <input className="x-input mono" value={b.day ?? ''} placeholder="D0"
              onChange={e => onChange(idx, { day: e.target.value })} />
            <input className="x-input" value={b.label ?? ''} placeholder="行程標題"
              onChange={e => onChange(idx, { label: e.target.value })} />
            <input className="x-input mono" value={b.date ?? ''} placeholder="04/30"
              onChange={e => onChange(idx, { date: e.target.value })} />
          </div>
        )}
        {b.type === 'text' && (
          <RichText html={b.text ?? ''} preset={rtPreset} placeholder="輸入段落內容…"
            onChange={v => onChange(idx, { text: v })} />
        )}
        {b.type === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="x-photo" style={{ height: 110 }}><span className="tag">⬆ 拖曳或點擊上傳圖片</span></div>
            <input className="x-input" value={b.cap ?? ''} placeholder="圖說（caption）"
              onChange={e => onChange(idx, { cap: e.target.value })} />
          </div>
        )}
        {b.type === 'twincol' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['a', 'b'] as const).map(k => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="x-photo" style={{ height: 90 }}><span className="tag">⬆ 圖 {k.toUpperCase()}</span></div>
                <input className="x-input" value={(b[k] as { cap: string } | undefined)?.cap ?? ''}
                  placeholder={`圖說 ${k.toUpperCase()}`}
                  onChange={e => onChange(idx, { [k]: { cap: e.target.value } })} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface BasicForm {
  act: string; title: string; leader: string
  grade: Grade; days: string; d0: boolean
  fromC: string; fromT: string; toC: string; toT: string
  start: string; end: string; transport: string; keeper: string
}

const ROLE_COLOR: Record<string, string> = {
  '領隊': 'var(--accent)', '嚮導': '#3d6b9e', '新生': '#4d7049',
}

const ACT_RE = /^\[([^\]]+)\]\s*/

function matchCounty(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback
  if (COUNTIES.includes(val)) return val
  // DB may omit the 縣/市 suffix — strip and compare
  const norm = (s: string) => s.replace(/[縣市]$/, '')
  const found = COUNTIES.find(c => norm(c) === norm(val))
  return found ?? fallback
}

function parseInitial(data: ExpeditionDetail): BasicForm {
  const m = ACT_RE.exec(data.name ?? '')
  const act   = m?.[1] ?? ''
  const title = m ? data.name.slice(m[0].length) : data.name
  return {
    act, title,
    leader:    data.leader_display ?? '',
    grade:     (data.grade as Grade | null) ?? 'D',
    days:      data.date_end
      ? String(Math.max(1, Math.round((new Date(data.date_end).getTime() - new Date(data.date_start).getTime()) / 86400000) + 1))
      : '1',
    d0:        false,
    fromC:     matchCounty(data.county,      '台東縣'),
    fromT:     data.region ?? '',
    toC:       matchCounty(data.county_exit, '屏東縣'),
    toT:       data.region_exit ?? '',
    start:     data.date_start ?? '',
    end:       data.date_end ?? '',
    transport: data.transport ?? '',
    keeper:    data.keeper ?? '',
  }
}

export function FormalEditClient({ expeditionId, initialData }: { expeditionId: string; initialData: ExpeditionDetail }) {
  const [layout,     setLayout]    = useState<Layout>('split')
  const rtPreset: RtPreset = 'full'
  const [saving,     setSaving]    = useState(false)
  const [saveMsg,    setSaveMsg]   = useState<'ok' | 'err' | null>(null)
  const [syncLocked, setSyncLocked] = useState(initialData.sync_locked)

  const [f, setF] = useState<BasicForm>(() => parseInitial(initialData))
  const set = useCallback(<K extends keyof BasicForm>(k: K, v: BasicForm[K]) =>
    setF(s => ({ ...s, [k]: v })), [])

  const toItem = (f: { id: number; filename: string; file_path: string | null }, i: number): FileItem => ({
    id: i, dbId: f.id, name: f.filename,
    type: f.filename.split('.').pop()?.toUpperCase() ?? '?',
    size: '—', filePath: f.file_path ?? undefined,
    uploading: false, editing: false,
  })

  const [trackFiles, setTrackFiles] = useState<FileItem[]>(() => initialData.gpx_files.map(toItem))
  const [mapFiles,   setMapFiles]   = useState<FileItem[]>(() => initialData.map_files.map(toItem))
  const [recFiles,   setRecFiles]   = useState<FileItem[]>(() => initialData.record_files.map(toItem))

  const getToken = async () => {
    const { data: { session } } = await getAuthClient().auth.getSession()
    return session?.access_token ?? null
  }

  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: initialData.leader_display || '（領隊）', role: '領隊', locked: true, collab: true },
  ])
  const [allMembers,   setAllMembers]   = useState<MemberProfile[]>([])
  const [memberSearch, setMemberSearch] = useState('')

  useEffect(() => {
    getAuthClient().auth.getUser().then(({ data }) => {
      if (data.user) setMembers(ms => ms.map(m => m.locked ? { ...m, user_id: data.user!.id } : m))
    })
    listMemberProfiles().then(({ data }) => setAllMembers(data))
    getExpeditionMembers(Number(expeditionId)).then(({ data }) => {
      if (!data.length) return
      setMembers(data.map((em, i) => ({
        id:     i + 1,
        user_id: em.user_id,
        name:   em.name ?? em.nickname ?? '',
        role:   em.role === 'leader' ? '領隊' : (em.expedition_role ?? '隊員'),
        locked: em.role === 'leader',
        collab: em.can_edit,
      })))
    })
  }, [expeditionId])

  const setMemberRole = (id: number, role: string) => setMembers(m => m.map(x => x.id === id ? { ...x, role } : x))
  const toggleCollab  = (id: number) => setMembers(m => m.map(x => x.id === id ? { ...x, collab: !x.collab } : x))
  const delMember     = (id: number) => setMembers(m => m.filter(x => x.id !== id))

  const usedUserIds = new Set(members.map(m => m.user_id).filter(Boolean) as string[])
  function filteredForRole(memberRole: string) {
    const eligible = allMembers.filter(p => {
      if (usedUserIds.has(p.user_id)) return false
      if (memberRole === '新生') return p.role === 'newcomer'
      return p.role === 'member' || p.role === 'staff'
    })
    if (!memberSearch.trim()) return eligible
    const q = memberSearch.toLowerCase()
    return eligible.filter(p =>
      (p.name?.toLowerCase().includes(q) ?? false) || (p.nickname?.toLowerCase().includes(q) ?? false)
    )
  }

  const ROLE_ORDER: Record<string, number> = { '領隊': 0, '嚮導': 1, '隊員': 2, '新生': 3 }
  const sortedMembers = [...members].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
  )

  function pickMember(rowId: number, profile: MemberProfile) {
    setMembers(ms => ms.map(x => x.id === rowId
      ? { ...x, user_id: profile.user_id, name: profile.name ?? profile.nickname ?? '', editing: false }
      : x))
    setMemberSearch('')
  }

  let _bid = 200
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    const existing = initialData.journal_blocks as JournalBlock[]
    const dayCount = initialData.date_end
      ? Math.round((new Date(initialData.date_end).getTime() - new Date(initialData.date_start).getTime()) / 86400000) + 1
      : 1
    // Default: D1–D(dayCount). D0 is an approach day added only when explicitly set.
    const dayHeaders: EditorBlock[] = Array.from({ length: dayCount }, (_, i) => ({
      id: 100 + i,
      type: 'day' as const,
      day: `D${i + 1}`,
      label: '',
      date: addDays(initialData.date_start, i).slice(5).replace('-', '/'),
    }))
    // If no day blocks exist yet, prepend generated headers before any existing content
    if (!existing.some(b => b.type === 'day')) {
      const offset = 100 + dayCount
      return [...dayHeaders, ...existing.map((b, i) => ({ ...b, id: offset + i }))]
    }
    return existing.map((b, i) => ({ ...b, id: i + 100 }))
  })
  const [activeDay, setActiveDay] = useState(0)

  const changeBlock = (i: number, p: Partial<EditorBlock>) => setBlocks(bs => bs.map((b, j) => j === i ? { ...b, ...p } : b))
  const moveBlock   = (i: number, d: number) => setBlocks(bs => { const a = [...bs]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return a })
  const delBlock    = (i: number) => setBlocks(bs => bs.filter((_, j) => j !== i))

  const dragFrom = useRef<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const drag = {
    start: (i: number) => { dragFrom.current = i },
    over:  (i: number) => setOverIdx(i),
    overIdx,
    drop: () => {
      const from = dragFrom.current
      if (from != null && overIdx != null && from !== overIdx) {
        setBlocks(bs => { const a = [...bs]; const [x] = a.splice(from, 1); a.splice(overIdx, 0, x); return a })
      }
      dragFrom.current = null; setOverIdx(null)
    },
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveMsg(null)
    const name = f.act ? `[${f.act}] ${f.title}` : f.title
    const { error } = await updateExpedition(Number(expeditionId), {
      name,
      grade:                f.grade,
      date_start:           f.start,
      date_end:             f.end || null,
      region_entry_county:  f.fromC.replace(/[縣市]$/, '') || null,
      region_entry_town:    f.fromT || null,
      region_exit_county:   f.toC.replace(/[縣市]$/, '') || null,
      region_exit_town:     f.toT || null,
      leader_display:       f.leader || null,
      transport:            f.transport || null,
      keeper:               f.keeper || null,
      participants:         members.length || null,
    })
    const membersToSync = members
      .filter(m => !m.locked && m.user_id)
      .map(m => ({ user_id: m.user_id!, expedition_role: m.role, can_edit: m.collab }))
    const blocksToSave = blocks.map(({ id: _id, ...b }) => b)

    const [{ error: memberError }, { error: journalError }] = await Promise.all([
      syncExpeditionMembers(Number(expeditionId), membersToSync),
      saveExpeditionJournal(Number(expeditionId), blocksToSave),
    ])

    setSaving(false)
    setSaveMsg((error || memberError || journalError) ? 'err' : 'ok')
    if (!error && !memberError && !journalError) { setSyncLocked(true); setTimeout(() => setSaveMsg(null), 3000) }
  }

  // ── Day-tab derived state ──────────────────────────────────────────────────
  const dayPositions = blocks.reduce<number[]>((acc, b, i) => {
    if (b.type === 'day') acc.push(i)
    return acc
  }, [])
  const safeActiveDay  = Math.min(activeDay, Math.max(0, dayPositions.length - 1))
  const activeDayStart = dayPositions[safeActiveDay] !== undefined ? dayPositions[safeActiveDay] + 1 : 0
  const activeDayEnd   = dayPositions[safeActiveDay + 1] ?? blocks.length
  const activeDayBlocks = blocks.slice(activeDayStart, activeDayEnd)

  const addBlockToDay = (t: JournalBlock['type']) =>
    setBlocks(bs => {
      const pos = bs.reduce<number[]>((a, b, i) => { if (b.type === 'day') a.push(i); return a }, [])
      const insertAt = pos[safeActiveDay + 1] ?? bs.length
      return [...bs.slice(0, insertAt), { id: _bid++, type: t, text: '', cap: '', a: { cap: '' }, b: { cap: '' } }, ...bs.slice(insertAt)]
    })

  const dayDrag = {
    start: (local: number) => drag.start(activeDayStart + local),
    over:  (local: number) => drag.over(activeDayStart + local),
    drop:  drag.drop,
    overIdx: drag.overIdx !== null && drag.overIdx >= activeDayStart && drag.overIdx < activeDayEnd
      ? drag.overIdx - activeDayStart : null,
  }

  const Editor = (
    <div>
      {/* Day tabs */}
      {dayPositions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '0.5px solid var(--border)', marginBottom: 16, alignItems: 'flex-end' }}>
          {dayPositions.map((globalI, dayI) => {
            const d = blocks[globalI]
            const isActive = safeActiveDay === dayI
            return (
              <button key={d.id} onClick={() => setActiveDay(dayI)} style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em',
                padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                whiteSpace: 'nowrap', transition: 'color .12s',
                marginBottom: '-1px',
              }}>
                <span style={{ fontWeight: 600 }}>{d.day || `D${dayI + 1}`}</span>
                {d.date && <span style={{ marginLeft: 5, fontSize: 10, opacity: .7 }}>{d.date}</span>}
              </button>
            )
          })}
          <button style={{
            marginLeft: 'auto', marginBottom: 6, fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '.06em', color: 'var(--muted)', background: 'none',
            border: '0.5px solid var(--border)', padding: '3px 10px', cursor: 'pointer',
          }} onClick={() => {
            const dayCount = f.end && f.start
              ? Math.round((new Date(f.end).getTime() - new Date(f.start).getTime()) / 86400000) + 1
              : 1
            const nonDay = blocks.filter(b => b.type !== 'day')
            const headers: EditorBlock[] = Array.from({ length: dayCount }, (_, i) => ({
              id: _bid++, type: 'day' as const,
              day: `D${i + 1}`, label: '',
              date: addDays(f.start, i).slice(5).replace('-', '/'),
            }))
            setBlocks([...headers, ...nonDay])
            setActiveDay(0)
          }}>重置日期</button>
        </div>
      )}

      {/* Active day label */}
      {dayPositions[safeActiveDay] !== undefined && (
        <input className="x-input" style={{ marginBottom: 14 }}
          value={(blocks[dayPositions[safeActiveDay]] as EditorBlock).label ?? ''}
          placeholder="行程標題（例：接駁 · 台東大武進駐）"
          onChange={e => changeBlock(dayPositions[safeActiveDay], { label: e.target.value })}
        />
      )}

      {/* Content blocks for active day */}
      {activeDayBlocks.map((b, localIdx) => (
        <BlockRow key={b.id} b={b} idx={localIdx} total={activeDayBlocks.length}
          onChange={(li, p)  => changeBlock(activeDayStart + li, p)}
          onMove={(li, d)    => { const nl = li + d; if (nl < 0 || nl >= activeDayBlocks.length) return; moveBlock(activeDayStart + li, d) }}
          onDel={(li)        => delBlock(activeDayStart + li)}
          drag={dayDrag} rtPreset={rtPreset} />
      ))}

      {/* Add block */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 16, borderTop: '0.5px dashed var(--border)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>新增區塊</span>
        {BLOCK_KINDS.filter(k => k.t !== 'day').map(k => (
          <button key={k.t} className="x-btn sm" onClick={() => addBlockToDay(k.t)}>{k.icon} {k.label}</button>
        ))}
      </div>
    </div>
  )

  const activeDayHeaderIdx = dayPositions[safeActiveDay]
  const previewBlocks = activeDayHeaderIdx !== undefined
    ? blocks.slice(activeDayHeaderIdx, activeDayEnd)
    : blocks.slice(0, activeDayEnd)

  const Preview = (
    <div style={{ border: '0.5px solid var(--border)', background: 'var(--bg)', padding: '24px 26px', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflow: 'auto' }}>
      <div className="x-label" style={{ marginBottom: 16 }}>即時預覽 <span className="en">LIVE PREVIEW</span></div>
      {previewBlocks.map((b, i) => <PvBlock key={i} b={b} />)}
    </div>
  )

  return (
    <div className="x-scroll-root">
      <FormalBackHeader />
      <div className="x-wrap" style={{ width: 'min(100%, 1340px)', paddingTop: 26, paddingBottom: 24 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href={`/formal/${expeditionId}`} className="x-btn ghost sm" style={{ color: 'var(--muted)' }}>← 返回紀錄</Link>
            <div className="x-label">編輯出隊紀錄 <span className="en">EDIT RECORD</span></div>
            {syncLocked && (
              <span className="x-pill" style={{ background: 'color-mix(in oklch, var(--accent) 12%, transparent)', color: 'var(--accent)', border: '0.5px solid color-mix(in oklch, var(--accent) 35%, transparent)' }}>
                已取消與 Google Drive 同步
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saveMsg === 'ok' && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#6a8a5a', letterSpacing: '.05em' }}>已儲存</span>}
            {saveMsg === 'err' && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#9a4f37', letterSpacing: '.05em' }}>儲存失敗</span>}
            <button className="x-btn solid" onClick={handleSave} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
          </div>
        </div>
        <div className="x-hr" style={{ marginBottom: 24 }} />

        {/* 基本資料 */}
        <div className="x-fieldbox" style={{ marginBottom: 16 }}>
          <div className="x-label" style={{ marginBottom: 18 }}>基本資料 <span className="en">DETAILS</span></div>
          <div className="x-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
            <XField label="活動代號" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" value={f.act} onChange={e => set('act', e.target.value)} />
            </XField>
            <XField label="隊伍名稱" className="x-mfull" style={{ gridColumn: 'span 9' }}>
              <input className="x-input" value={f.title} onChange={e => set('title', e.target.value)} />
            </XField>
            <XField label="領隊" style={{ gridColumn: 'span 8' }}>
              <input className="x-input" value={f.leader} onChange={e => set('leader', e.target.value)} />
            </XField>
            <XField label="級數" className="x-mfull" style={{ gridColumn: 'span 4' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['A','B','C','D'] as Grade[]).map(g => (
                  <button key={g} className={`x-chip${f.grade === g ? ' active' : ''}`} style={{ flex: 1 }} onClick={() => set('grade', g)}>{g}</button>
                ))}
              </div>
            </XField>
            <XField label="上山日" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" type="date" value={f.start} onChange={e => {
                const s = e.target.value
                setF(p => ({ ...p, start: s, end: s && Number(p.days) > 0 ? addDays(s, Number(p.days) - 1) : p.end }))
              }} />
            </XField>
            <XField label="下山日" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" type="date" value={f.end} onChange={e => {
                const end = e.target.value
                setF(p => {
                  const d = p.start && end
                    ? Math.round((new Date(end).getTime() - new Date(p.start).getTime()) / 86400000) + 1
                    : Number(p.days)
                  return { ...p, end, days: d > 0 ? String(d) : p.days }
                })
              }} />
            </XField>
            <XField label="天數" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" type="number" value={f.days} onChange={e => {
                const days = e.target.value
                setF(p => ({ ...p, days, end: p.start && Number(days) > 0 ? addDays(p.start, Number(days) - 1) : p.end }))
              }} />
            </XField>
            <XField label="是否含 D0" style={{ gridColumn: 'span 3' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`x-chip${f.d0 ? ' active' : ''}`}  style={{ flex: 1 }} onClick={() => set('d0', true)}>有 D0</button>
                <button className={`x-chip${!f.d0 ? ' active' : ''}`} style={{ flex: 1 }} onClick={() => set('d0', false)}>無</button>
              </div>
            </XField>
            <XField label="上山地點（縣市／區域）" className="x-mfull" style={{ gridColumn: 'span 6' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="x-select" style={{ width: 108, flexShrink: 0 }} value={f.fromC} onChange={e => set('fromC', e.target.value)}>
                  {COUNTIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input className="x-input" placeholder="區域 / 鄉鎮" value={f.fromT} onChange={e => set('fromT', e.target.value)} />
              </div>
            </XField>
            <XField label="下山地點（縣市／區域）" className="x-mfull" style={{ gridColumn: 'span 6' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="x-select" style={{ width: 108, flexShrink: 0 }} value={f.toC} onChange={e => set('toC', e.target.value)}>
                  {COUNTIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input className="x-input" placeholder="區域 / 鄉鎮" value={f.toT} onChange={e => set('toT', e.target.value)} />
              </div>
            </XField>
            <XField label="交通 · TRANSPORT" className="x-mfull" style={{ gridColumn: 'span 6' }}>
              <input className="x-input" value={f.transport} onChange={e => set('transport', e.target.value)} />
            </XField>
            <XField label="留守 · KEEPER" className="x-mfull" style={{ gridColumn: 'span 6' }}>
              <input className="x-input" value={f.keeper} onChange={e => set('keeper', e.target.value)} />
            </XField>
          </div>
        </div>

        {/* 隊伍人員 */}
        <div className="x-fieldbox" style={{ marginBottom: 16 }}>
          <div className="x-label" style={{ marginBottom: 16 }}>隊伍人員 <span className="en">MEMBERS</span></div>
          {sortedMembers.map(m => (
            <div key={m.id} className="x-member-row">
              <span className="x-role-tag" style={{ color: ROLE_COLOR[m.role] ?? 'var(--muted)', borderColor: `color-mix(in oklch, ${ROLE_COLOR[m.role] ?? 'var(--muted)'} 40%, var(--border))` }}>
                {m.role}
              </span>
              {m.editing ? (
                <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 0 }}>
                  <input className="x-input mono" style={{ width: 120, flexShrink: 0 }} placeholder="搜尋"
                    value={memberSearch} onChange={e => setMemberSearch(e.target.value)} autoFocus />
                  <select className="x-select" style={{ flex: 1, minWidth: 0 }} value=""
                    onChange={e => {
                      const p = filteredForRole(m.role).find(x => x.user_id === e.target.value)
                      if (p) pickMember(m.id, p)
                    }}>
                    <option value="">選擇</option>
                    {filteredForRole(m.role).map(p => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.name ?? '—'}{p.nickname ? `（${p.nickname}）` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="mname" style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 15, cursor: m.locked ? 'default' : 'text' }}
                  onClick={() => !m.locked && setMembers(ms => ms.map(x => x.id === m.id ? { ...x, editing: true } : x))}>
                  {m.name || <span style={{ color: 'var(--muted)' }}>（未命名）</span>}
                </span>
              )}

              <div className="x-member-actions">
                {!m.locked && (
                  <button className={`x-collab${m.collab ? ' on' : ''}`} onClick={() => toggleCollab(m.id)}
                    title="開放此成員共同編輯本隊圖文紀錄">
                    {m.collab ? '可編輯' : '不可編輯'}
                  </button>
                )}
                {!m.locked && (
                  <>
                    <select className="x-select" style={{ width: 88, padding: '5px 8px', fontSize: 12 }} value={m.role} onChange={e => setMemberRole(m.id, e.target.value)}>
                      <option>嚮導</option><option>隊員</option><option>新生</option>
                    </select>
                    <button className="x-btn ghost sm" style={{ color: '#9a4f37' }} onClick={() => delMember(m.id)}>移除</button>
                  </>
                )}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '0.5px dashed var(--border)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>新增人員</span>
            <button className="x-btn sm" onClick={() => { setMemberSearch(''); setMembers(m => [...m, { id: Date.now(), name: '', role: '嚮導', editing: true, collab: false }]) }}>＋ 嚮導</button>
            <button className="x-btn sm" onClick={() => { setMemberSearch(''); setMembers(m => [...m, { id: Date.now(), name: '', role: '隊員', editing: true, collab: false }]) }}>＋ 隊員</button>
            <button className="x-btn sm" onClick={() => { setMemberSearch(''); setMembers(m => [...m, { id: Date.now(), name: '', role: '新生', editing: true, collab: false }]) }}>＋ 新生</button>
          </div>
        </div>

        {/* 檔案上傳 */}
        <div className="x-fieldbox" style={{ marginBottom: 16 }}>
          <div className="x-label" style={{ marginBottom: 18 }}>檔案上傳 <span className="en">FILE UPLOADS</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <UploadGroup title="航跡" en="TRACK"  accept="GPX / KML" inputAccept=".gpx,.kml"
              note="GPS 航跡，可多檔" bucket="gpx"     expeditionId={expeditionId} getToken={getToken} files={trackFiles} set={setTrackFiles} />
            <div className="x-hr" />
            <UploadGroup title="地圖" en="MAP"    accept="PDF"       inputAccept=".pdf"
              note="路線地圖，可多檔" bucket="maps"    expeditionId={expeditionId} getToken={getToken} files={mapFiles}   set={setMapFiles} />
            <div className="x-hr" />
            <UploadGroup title="紀錄" en="RECORD" accept="PDF / DOC / DOCX / TXT" inputAccept=".pdf,.doc,.docx,.txt"
              note="出隊紀錄文件，可多檔" bucket="records" expeditionId={expeditionId} getToken={getToken} files={recFiles}   set={setRecFiles} />
          </div>
        </div>

      </div>

      {/* 圖文編輯器 — 獨立寬容器，不受上方 x-wrap 1340px 限制 */}
      <div style={{ width: 'min(100%, 1640px)', margin: '0 auto', padding: '0 36px 90px', boxSizing: 'border-box' }}>
        <div className="x-fieldbox">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div className="x-label">圖文編輯 <span className="en">CONTENT</span></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginRight: 4 }}>檢視</span>
              <button className={`x-chip${layout === 'split'  ? ' active' : ''}`} onClick={() => setLayout('split')}>分欄＋預覽</button>
              <button className={`x-chip${layout === 'inline' ? ' active' : ''}`} onClick={() => setLayout('inline')}>單欄（隱藏預覽）</button>
            </div>
          </div>
          {layout === 'split'
            ? <div className="x-editor-split" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 24, alignItems: 'start' }}>{Editor}{Preview}</div>
            : <div style={{ maxWidth: '100%' }}>{Editor}</div>}
        </div>
      </div>
    </div>
  )
}
