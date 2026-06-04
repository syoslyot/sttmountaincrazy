// app/app.jsx — 路由 + Tweaks + 原型切換
const { useState: useSA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "oklch(0.52 0.08 50)"
}/*EDITMODE-END*/;

const SCREENS = [["home","出隊紀錄"],["detail","詳細頁"],["login","登入"],["member","會員"],["claim","認領"],["edit","編輯"]];

function snapMob(){ return window.matchMedia('(max-width:680px)').matches; }
function subMob(cb){ const mq=window.matchMedia('(max-width:680px)'); mq.addEventListener('change',cb); return ()=>mq.removeEventListener('change',cb); }

function App() {
  const [t,setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [page,setPage] = useSA('detail');
  const [authed,setAuthed] = useSA(true);
  const isMobile = React.useSyncExternalStore(subMob, snapMob, ()=>false);

  React.useEffect(()=>{ document.documentElement.style.setProperty('--accent', t.accent); }, [t.accent]);

  const go = (p)=>{ if(p==='login') setAuthed(false); if(p==='member') setAuthed(true); setPage(p); window.scrollTo({top:0}); };

  return (
    <div className={isMobile ? 'is-mobile' : ''}>
      {page==='home'   && <PageHome go={go} />}
      {page==='detail' && <PageDetail go={go} canEdit={authed} />}
      {page==='login'  && <PageLogin go={go} />}
      {page==='member' && <PageMember go={go} />}
      {page==='claim'  && <PageClaim go={go} />}
      {page==='edit'   && <PageEdit go={go} />}

      <div className="proto-switch">
        {SCREENS.map(([id,label])=>(<button key={id} className={page===id?'on':''} onClick={()=>go(id)}>{label}</button>))}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="外觀 · THEME" />
        <TweakColor label="強調色 ACCENT" value={t.accent}
          options={["oklch(0.52 0.08 50)","oklch(0.5 0.09 150)","oklch(0.5 0.09 250)","oklch(0.5 0.11 25)"]}
          onChange={v=>setTweak('accent',v)} />
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', lineHeight:1.7, marginTop:4 }}>
          版面已鎖定所選變體：<br/>圖文 tabs · 認領 cards · 登入 centered · 編輯器可於頁內切換分欄／單欄。
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
