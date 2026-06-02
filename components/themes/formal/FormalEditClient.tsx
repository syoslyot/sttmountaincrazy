'use client'

import { useState, useRef, useCallback, type FormEvent, type DragEvent } from 'react'
import Link from 'next/link'
import { FormalBackHeader, XField } from '@/components/themes/formal/FormalShell'
import type { JournalBlock } from '@/components/themes/formal/FormalJournal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileItem { id: number; name: string; type: string; size: string; editing: boolean }
interface Member   { id: number; name: string; role: string; locked?: boolean; collab: boolean; editing?: boolean }

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
const RT_PRESET_LABELS: Record<RtPreset, string> = { minimal:'精簡', standard:'標準', full:'完整' }

function RichText({ html, onChange, placeholder, preset = 'standard' }: {
  html: string; onChange: (v: string) => void; placeholder?: string; preset?: RtPreset
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState<string | null>(null)

  const emit = useCallback(() => { if (ref.current) onChange(ref.current.innerHTML) }, [onChange])

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
        data-ph={placeholder} onInput={emit} onBlur={emit}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

// ─── Upload Group ─────────────────────────────────────────────────────────────

function UploadGroup({ title, en, accept, note, defExt, files, set }: {
  title: string; en: string; accept: string; note: string; defExt: string
  files: FileItem[]; set: React.Dispatch<React.SetStateAction<FileItem[]>>
}) {
  let _id = Date.now()
  const add = () => set(fs => [...fs, { id: _id++, name: `新檔案_${fs.length + 1}.${defExt}`, type: defExt.toUpperCase(), size: `${40 + Math.round(Math.random() * 900)} KB`, editing: false }])
  const rename = (id: number, name: string) => set(fs => fs.map(x => x.id === id ? { ...x, name } : x))
  const toggle = (id: number) => set(fs => fs.map(x => x.id === id ? { ...x, editing: !x.editing } : x))
  const del    = (id: number) => set(fs => fs.filter(x => x.id !== id))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div className="x-label">{title} <span className="en">{en}</span></div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{note}</span>
      </div>
      <div className="x-dropzone" onClick={add} style={{ marginBottom: files.length ? 12 : 0 }}>
        ⬆　拖曳檔案到此，或<span style={{ color: 'var(--accent)' }}> 點擊選擇檔案 </span>（{accept}）
      </div>
      {files.map(file => (
        <div key={file.id} className="x-file-row">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 7px', border: '0.5px solid var(--border)', color: 'var(--accent)', flexShrink: 0 }}>{file.type}</span>
          {file.editing
            ? <input className="x-input mono fname" style={{ flex: 1, padding: '6px 10px' }} value={file.name} autoFocus
                onChange={e => rename(file.id, e.target.value)} onBlur={() => toggle(file.id)}
                onKeyDown={e => e.key === 'Enter' && toggle(file.id)} />
            : <span className="fname" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 13, wordBreak: 'break-all' }}>{file.name}</span>}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{file.size}</span>
          <button className="x-btn ghost sm" onClick={() => toggle(file.id)}>{file.editing ? '完成' : '重新命名'}</button>
          <button className="x-btn ghost sm" style={{ color: '#9a4f37' }} onClick={() => del(file.id)}>移除</button>
        </div>
      ))}
    </div>
  )
}

// ─── Block Editor ─────────────────────────────────────────────────────────────

interface EditorBlock extends JournalBlock { id: number }

const BLOCK_KINDS = [
  { t: 'text',    label: '文字段落', icon: '¶' },
  { t: 'image',   label: '單張圖片', icon: '▣' },
  { t: 'twincol', label: '雙圖並排', icon: '▣▣' },
] as const

function PvBlock({ b }: { b: EditorBlock }) {
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
      onDragStart={() => drag.start(idx)}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

interface BasicForm {
  act: string; title: string; leader: string; people: string
  grade: Grade; days: string; d0: boolean
  fromC: string; fromT: string; toC: string; toT: string
  start: string; end: string; transport: string; keeper: string
}

const ROLE_COLOR: Record<string, string> = {
  '領隊': 'var(--accent)', '嚮導': '#3d6b9e', '新生': '#4d7049',
}

export function FormalEditClient({ expeditionId }: { expeditionId: string }) {
  const [layout,    setLayout]    = useState<Layout>('split')
  const [rtPreset,  setRtPreset]  = useState<RtPreset>('standard')

  const [f, setF] = useState<BasicForm>({
    act: '', title: '', leader: '', people: '0', grade: 'D', days: '1', d0: false,
    fromC: '台東', fromT: '', toC: '屏東', toT: '',
    start: '', end: '', transport: '', keeper: '',
  })
  const set = useCallback(<K extends keyof BasicForm>(k: K, v: BasicForm[K]) =>
    setF(s => ({ ...s, [k]: v })), [])

  const [trackFiles, setTrackFiles] = useState<FileItem[]>([])
  const [mapFiles,   setMapFiles]   = useState<FileItem[]>([])
  const [recFiles,   setRecFiles]   = useState<FileItem[]>([])

  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: '（認領者）', role: '領隊', locked: true, collab: true },
  ])
  const addMember   = (role: string) => setMembers(m => [...m, { id: Date.now(), name: '', role, editing: true, collab: false }])
  const renameMember = (id: number, name: string) => setMembers(m => m.map(x => x.id === id ? { ...x, name } : x))
  const setMemberRole = (id: number, role: string) => setMembers(m => m.map(x => x.id === id ? { ...x, role } : x))
  const toggleCollab  = (id: number) => setMembers(m => m.map(x => x.id === id ? { ...x, collab: !x.collab } : x))
  const delMember     = (id: number) => setMembers(m => m.filter(x => x.id !== id))

  let _bid = 200
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const addBlock    = (t: JournalBlock['type']) => setBlocks(bs => [...bs, { id: _bid++, type: t, text: '', cap: '', a: { cap: '' }, b: { cap: '' } }])
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

  function handleSave(e: FormEvent) {
    e.preventDefault()
    // placeholder — wire to Supabase server action
  }

  const Editor = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div className="x-label">圖文紀錄 <span className="en">JOURNAL EDITOR</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginRight: 2 }}>工具列</span>
          {(Object.keys(RT_PRESETS) as RtPreset[]).map(p => (
            <button key={p} className={`x-chip${rtPreset === p ? ' active' : ''}`} onClick={() => setRtPreset(p)}>
              {RT_PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {blocks.map((b, i) => (
        <BlockRow key={b.id} b={b} idx={i} total={blocks.length}
          onChange={changeBlock} onMove={moveBlock} onDel={delBlock}
          drag={drag} rtPreset={rtPreset} />
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 16, borderTop: '0.5px dashed var(--border)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>新增區塊</span>
        {BLOCK_KINDS.map(k => (
          <button key={k.t} className="x-btn sm" onClick={() => addBlock(k.t)}>{k.icon} {k.label}</button>
        ))}
      </div>
    </div>
  )

  const Preview = (
    <div style={{ border: '0.5px solid var(--border)', background: 'var(--bg)', padding: '24px 26px', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflow: 'auto' }}>
      <div className="x-label" style={{ marginBottom: 16 }}>即時預覽 <span className="en">LIVE PREVIEW</span></div>
      <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 500 }}>
        [{f.act}] {f.title}
      </h2>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)', marginBottom: 22 }}>
        {f.fromC}{f.fromT} → {f.toC}{f.toT} · 領隊 {f.leader} · {f.grade}級 · {f.days}D{f.d0 ? '（含 D0）' : ''}
      </div>
      {blocks.map((b, i) => <PvBlock key={i} b={b} />)}
    </div>
  )

  return (
    <div className="x-scroll-root">
      <FormalBackHeader />
      <div className="x-wrap" style={{ width: 'min(100%, 1340px)', paddingTop: 26, paddingBottom: 90 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href={`/formal/${expeditionId}`} className="x-btn ghost sm" style={{ color: 'var(--muted)' }}>← 返回紀錄</Link>
            <div className="x-label">編輯出隊紀錄 <span className="en">EDIT RECORD</span></div>
            <span className="x-pill pend">草稿 · 未送審</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="x-btn" onClick={handleSave}>儲存草稿</button>
            <button className="x-btn solid" onClick={handleSave}>送出審核</button>
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
            <XField label="領隊" style={{ gridColumn: 'span 4' }}>
              <input className="x-input" value={f.leader} onChange={e => set('leader', e.target.value)} />
            </XField>
            <XField label="參與人數" style={{ gridColumn: 'span 4' }}>
              <input className="x-input mono" type="number" value={f.people} onChange={e => set('people', e.target.value)} />
            </XField>
            <XField label="級數" className="x-mfull" style={{ gridColumn: 'span 4' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['A','B','C','D'] as Grade[]).map(g => (
                  <button key={g} className={`x-chip${f.grade === g ? ' active' : ''}`} style={{ flex: 1 }} onClick={() => set('grade', g)}>{g}</button>
                ))}
              </div>
            </XField>
            <XField label="上山日" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" type="date" value={f.start} onChange={e => set('start', e.target.value)} />
            </XField>
            <XField label="下山日" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" type="date" value={f.end} onChange={e => set('end', e.target.value)} />
            </XField>
            <XField label="天數" style={{ gridColumn: 'span 3' }}>
              <input className="x-input mono" type="number" value={f.days} onChange={e => set('days', e.target.value)} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div className="x-label">隊伍人員 <span className="en">MEMBERS</span></div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>領隊由認領者擔任 · 其餘由領隊新增</span>
          </div>
          {members.map(m => (
            <div key={m.id} className="x-member-row">
              <span className="x-role-tag" style={{ color: ROLE_COLOR[m.role] ?? 'var(--muted)', borderColor: `color-mix(in oklch, ${ROLE_COLOR[m.role] ?? 'var(--muted)'} 40%, var(--border))` }}>
                {m.role}
              </span>
              {m.editing
                ? <input className="x-input mname" style={{ flex: 1, padding: '6px 10px' }} value={m.name} autoFocus
                    placeholder="輸入姓名" onChange={e => renameMember(m.id, e.target.value)}
                    onBlur={() => setMembers(ms => ms.map(x => x.id === m.id ? { ...x, editing: false } : x))}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
                : <span className="mname" style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 15 }}>
                    {m.name || <span style={{ color: 'var(--muted)' }}>（未命名）</span>}
                  </span>}
              <div className="x-member-actions">
                <button className={`x-collab${m.collab ? ' on' : ''}`} onClick={() => toggleCollab(m.id)}
                  title="同意協作紀錄：開放此成員共同編輯本隊圖文紀錄">
                  <span className="dot" />{m.collab ? '可協作' : '未協作'}
                </button>
                {m.locked ? (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>固定</span>
                ) : (
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
            <button className="x-btn sm" onClick={() => addMember('嚮導')}>＋ 嚮導</button>
            <button className="x-btn sm" onClick={() => addMember('隊員')}>＋ 隊員</button>
            <button className="x-btn sm" onClick={() => addMember('新生')}>＋ 新生</button>
          </div>
        </div>

        {/* 檔案上傳 */}
        <div className="x-fieldbox" style={{ marginBottom: 16 }}>
          <div className="x-label" style={{ marginBottom: 18 }}>檔案上傳 <span className="en">FILE UPLOADS</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <UploadGroup title="航跡" en="TRACK"  accept="GPX / KML"           note="GPS 航跡，可多檔" defExt="gpx" files={trackFiles} set={setTrackFiles} />
            <div className="x-hr" />
            <UploadGroup title="地圖" en="MAP"    accept="PDF"                  note="路線地圖，可多檔" defExt="pdf" files={mapFiles}   set={setMapFiles} />
            <div className="x-hr" />
            <UploadGroup title="紀錄" en="RECORD" accept="PDF / DOC / DOCX / TXT" note="出隊紀錄文件，可多檔" defExt="pdf" files={recFiles} set={setRecFiles} />
          </div>
        </div>

        {/* 圖文編輯器 */}
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
