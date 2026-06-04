// app/page-claim.jsx — 認領隊伍（cards + 認領彈窗填佐證 → 待審）
const { useState: useSC } = React;

function ClaimModal({ team, onClose }) {
  const [done,setDone] = useSC(false);
  return (
    <div className="x-modal-bg" onClick={onClose}>
      <div className="x-modal" onClick={e=>e.stopPropagation()}>
        {!done ? (
          <>
            <div className="x-label" style={{ marginBottom:14 }}>認領隊伍 <span className="en">CLAIM TEAM</span></div>
            <h2 style={{ margin:'0 0 6px', fontFamily:'var(--serif)', fontSize:20, fontWeight:500 }}>{team.name}</h2>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:22 }}>REC.{String(team.id).padStart(3,'0')} · {team.county} · {team.date_start} · {team.grade}級</div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:'0.5px solid var(--border)', background:'var(--surface)' }}>
                <span className="x-role-tag" style={{ color:'var(--accent)', borderColor:'color-mix(in oklch,var(--accent) 40%, var(--border))' }}>領隊</span>
                <span style={{ fontFamily:'var(--serif)', fontSize:14 }}>你將以<b style={{ color:'var(--accent)' }}>領隊</b>身分認領此隊</span>
                <span style={{ marginLeft:'auto', fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>嚮導 / 隊員 / 新生 由你於編輯頁新增</span>
              </div>
              <window.XField label="佐證說明 · EVIDENCE" hint="例如：出隊公告連結、合照、行前會記錄，供管理員審核"><textarea className="x-textarea" placeholder="請說明你帶領此隊伍的佐證資料…" /></window.XField>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
              <button className="x-btn" onClick={onClose}>取消</button>
              <button className="x-btn solid" onClick={()=>setDone(true)}>送出認領</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'14px 0' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', margin:'0 auto 16px', border:'0.5px solid #c8b277', color:'#9a7b2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⏳</div>
            <h2 style={{ margin:'0 0 8px', fontFamily:'var(--serif)', fontSize:19, fontWeight:500 }}>已送出，等待審核</h2>
            <p style={{ color:'var(--muted)', fontFamily:'var(--serif)', fontSize:13.5, lineHeight:1.8, margin:'0 0 22px' }}>管理員審核通過後，此隊伍將出現在你的會員頁。可於「我參與的隊伍」追蹤狀態。</p>
            <button className="x-btn solid" onClick={onClose}>完成</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PageClaim({ go }) {
  const U = window.DATA.UNCLAIMED;
  const [q,setQ] = useSC('');
  const [grade,setGrade] = useSC('ALL');
  const [modal,setModal] = useSC(null);
  const rows = U.filter(r=> (!q||r.name.includes(q)||r.county.includes(q)) && (grade==='ALL'||r.grade===grade));
  return (
    <div className="x-scroll-root">
      <window.BackHeader go={go} authed={true} />
      <div className="x-wrap" style={{ paddingTop:30, paddingBottom:90 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:8, flexWrap:'wrap', gap:10 }}>
          <div>
            <div className="x-label" style={{ marginBottom:10 }}>認領隊伍 <span className="en">CLAIM A TEAM</span></div>
            <p style={{ margin:0, color:'var(--muted)', fontFamily:'var(--serif)', fontSize:13.5, maxWidth:580, lineHeight:1.7 }}>以下隊伍尚未有人認領<b style={{ color:'var(--accent)' }}>領隊</b>。認領並填寫佐證後送交管理員審核；通過後即可於編輯頁新增嚮導、隊員與新生。</p>
          </div>
          <button className="x-btn ghost sm" style={{ color:'var(--accent)' }} onClick={()=>go('member')}>← 回會員頁</button>
        </div>

        <div style={{ display:'flex', gap:12, alignItems:'center', margin:'22px 0 6px', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200, maxWidth:340 }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontFamily:'var(--mono)', fontSize:11 }}>⌕</span>
            <input className="x-input" style={{ paddingLeft:28 }} placeholder="搜尋名稱／地區" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['ALL','A','B','C','D'].map(g=>(<button key={g} className={`x-chip${grade===g?' active':''}`} style={{ minWidth:36, textAlign:'center' }} onClick={()=>setGrade(g)}>{g}</button>))}
          </div>
          <div style={{ flex:1 }} />
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>未認領 {rows.length}</span>
        </div>
        <div className="x-hr" style={{ marginBottom:20 }} />

        <div className="x-claim-grid">
          {rows.map(r=>(
            <div key={r.id} className="x-claim-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontFamily:'var(--serif)', fontSize:24, fontWeight:500, fontVariantNumeric:'tabular-nums' }}>{String(r.id).padStart(3,'0')}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)' }}>{r.grade}級</span>
              </div>
              <div style={{ fontFamily:'var(--serif)', fontSize:16, fontWeight:500, lineHeight:1.45, textWrap:'pretty', flex:1 }}>{r.name}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>{r.county} · {r.date_start}</div>
              <button className="x-btn" onClick={()=>setModal(r)}>認領 →</button>
            </div>
          ))}
        </div>
      </div>
      {modal && <ClaimModal team={modal} onClose={()=>setModal(null)} />}
    </div>
  );
}

Object.assign(window, { PageClaim });
