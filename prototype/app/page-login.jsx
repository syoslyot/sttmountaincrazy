// app/page-login.jsx — 登入（centered）
const { useState: useSL } = React;

function PageLogin({ go }) {
  const [mode,setMode] = useSL('login'); // login | forgot | signup
  return (
    <div className="x-scroll-root">
      <window.BackHeader go={go} authed={false} />
      <div className="x-center">
        <div className="x-card">
          <div className="x-label" style={{ marginBottom:16 }}>會員 <span className="en">MEMBER ACCESS</span></div>
          <h1 style={{ margin:'0 0 6px', fontFamily:'var(--serif)', fontSize:27, fontWeight:500, letterSpacing:'.01em' }}>
            {mode==='login'&&'登入成大山協'}{mode==='forgot'&&'重設密碼'}{mode==='signup'&&'建立帳號'}
          </h1>
          <p style={{ margin:'0 0 26px', color:'var(--muted)', fontFamily:'var(--serif)', fontSize:13.5, lineHeight:1.7 }}>
            {mode==='login'&&'登入後可認領隊伍、撰寫圖文紀錄與管理航跡檔案。'}
            {mode==='forgot'&&'輸入註冊用 Email，我們會寄送重設連結。'}
            {mode==='signup'&&'以 Email 註冊，送出後由社團幹部開通權限。'}
          </p>
          <form onSubmit={e=>e.preventDefault()} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {mode==='signup' && <window.XField label="姓名 · NAME"><input className="x-input" placeholder="王小明" /></window.XField>}
            <window.XField label="電子郵件 · EMAIL"><input className="x-input mono" placeholder="you@example.ncku.edu.tw" /></window.XField>
            {mode!=='forgot' && <window.XField label="密碼 · PASSWORD"><input className="x-input mono" type="password" placeholder="••••••••" /></window.XField>}
            {mode==='signup' && <window.XField label="確認密碼 · CONFIRM"><input className="x-input mono" type="password" placeholder="••••••••" /></window.XField>}
            {mode==='login' && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <label style={{ display:'flex', gap:8, alignItems:'center', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor:'var(--accent)' }} /> 記住我
                </label>
                <button type="button" className="x-btn ghost sm" style={{ color:'var(--accent)' }} onClick={()=>setMode('forgot')}>忘記密碼？</button>
              </div>
            )}
            <button className="x-btn solid" style={{ padding:'12px', marginTop:4, fontSize:13 }}
              onClick={()=>go(mode==='login'?'member':'login')}>
              {mode==='login'&&'登入 · LOGIN'}{mode==='forgot'&&'寄送重設連結'}{mode==='signup'&&'送出申請'}
            </button>
          </form>
          <div className="x-hr" style={{ margin:'24px 0 16px' }} />
          <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', display:'flex', justifyContent:'center', gap:8, alignItems:'center' }}>
            {mode==='login'
              ? <>還沒有帳號？<button className="x-btn ghost sm" style={{ color:'var(--accent)' }} onClick={()=>setMode('signup')}>註冊 →</button></>
              : <>已有帳號？<button className="x-btn ghost sm" style={{ color:'var(--accent)' }} onClick={()=>setMode('login')}>返回登入</button></>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PageLogin });
