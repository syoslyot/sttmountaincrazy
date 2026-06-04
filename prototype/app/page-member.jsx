// app/page-member.jsx — 會員資訊（參與者→詳細頁；領隊多一個編輯鈕→編輯頁）
const { useState: useSM } = React;

function PageMember({ go }) {
  const M = window.DATA.MEMBER;
  const [tab,setTab] = useSM('teams');
  return (
    <div className="x-scroll-root">
      <window.BackHeader go={go} authed={true} />
      <div className="x-wrap" style={{ paddingTop:30, paddingBottom:90 }}>
        <div className="x-label" style={{ marginBottom:16 }}>會員資訊 <span className="en">MEMBER PROFILE</span></div>

        <div className="x-id-card">
          <div className="x-id-head">
            <div className="x-avatar">程</div>
            <div className="x-id-name">
              <div style={{ display:'flex', alignItems:'baseline', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'var(--serif)', fontSize:24, fontWeight:500 }}>{M.name}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', border:'0.5px solid var(--border)', padding:'2px 8px', whiteSpace:'nowrap' }}>{M.role}</span>
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', marginTop:8, wordBreak:'break-all' }}>@{M.account} · {M.email}</div>
            </div>
          </div>
          <div className="x-id-stats">
            {[['帶隊',M.teamsLed],['紀錄',M.recordsWritten],['入會',M.joined]].map(([k,v],i)=>(
              <div key={i}><div style={{ fontFamily:'var(--serif)', fontSize:22, fontWeight:500, fontVariantNumeric:'tabular-nums' }}>{v}</div><div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', color:'var(--muted)', marginTop:4 }}>{k}</div></div>
            ))}
          </div>
          <button className="x-btn x-id-logout" onClick={()=>go('login')}>登出</button>
        </div>

        <div style={{ display:'flex', gap:8, margin:'28px 0 0', flexWrap:'wrap' }}>
          <button className={`x-chip${tab==='teams'?' active':''}`} onClick={()=>setTab('teams')}>我參與的隊伍</button>
          <button className={`x-chip${tab==='profile'?' active':''}`} onClick={()=>setTab('profile')}>個人資料</button>
          <div style={{ flex:1 }} />
          <button className="x-chip" onClick={()=>go('claim')}>＋ 認領新隊伍</button>
        </div>
        <div className="x-hr" style={{ marginTop:14 }} />

        {tab==='teams' && (
          <div>
            {M.teams.map(t=>{
              const isLeader = t.role==='領隊';
              return (
                <div key={t.id} className="x-team-row" style={{ cursor:'pointer' }} onClick={()=>go('detail', t.id)}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div className="num">{String(t.id).padStart(3,'0')}</div>
                  <div style={{ minWidth:0 }}>
                    <div className="nm">{t.name}</div>
                    <div className="x-team-meta">
                      <span className={isLeader?'role lead':'role'}>{t.role}</span>
                      <span>{t.date}</span>
                    </div>
                  </div>
                  <div className="x-team-actions">
                    <window.XPill status={t.status} />
                    {isLeader && <button className="x-btn sm" onClick={e=>{ e.stopPropagation(); go('edit'); }}>✎ 編輯</button>}
                  </div>
                </div>
              );
            })}
            <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginTop:18, lineHeight:1.8 }}>
              點選任一隊伍可進入詳細頁；<span style={{ color:'var(--accent)' }}>領隊</span>身分另有「編輯」可進入後台編輯該隊紀錄。
              認領送出後須經管理員審核：<span style={{ color:'#9a7b2e' }}>待審核</span> 期間仍可編輯草稿，<span style={{ color:'#9a4f37' }}>退回</span> 者可依說明修改後重送。
            </p>
          </div>
        )}

        {tab==='profile' && (
          <div style={{ marginTop:22, maxWidth:560, display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <window.XField label="姓名 · NAME" style={{ gridColumn:'1/-1' }}><input className="x-input" defaultValue={M.name} /></window.XField>
            <window.XField label="暱稱 · NICKNAME"><input className="x-input" defaultValue={M.nick} /></window.XField>
            <window.XField label="聯絡電話 · CONTACT"><input className="x-input mono" defaultValue={M.contact} /></window.XField>
            <window.XField label="電子郵件 · EMAIL" style={{ gridColumn:'1/-1' }} hint="變更 Email 需重新驗證"><input className="x-input mono" defaultValue={M.email} /></window.XField>
            <window.XField label="角色 · ROLE" style={{ gridColumn:'1/-1' }} hint="角色由管理員指派，一般會員無法自行變更"><input className="x-input" defaultValue={M.role} disabled /></window.XField>
            <div style={{ gridColumn:'1/-1', display:'flex', gap:10, marginTop:4 }}>
              <button className="x-btn solid">儲存變更</button><button className="x-btn">取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PageMember });
