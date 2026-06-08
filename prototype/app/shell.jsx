// app/shell.jsx — 後台頁共用頁首 / 小元件
const { useSyncExternalStore: useSyncSh } = React;

function BackHeader({ go, authed }) {
  const isMobile = useSyncSh(window.subMobile, window.snapMobile, window.snapServer);
  return (
    <header className="formal-header" style={ isMobile?{ padding:'12px 16px' }:null }>
      <div style={{ display:'flex', alignItems:'baseline', gap:14 }}>
        <h1 onClick={()=>go('home')} style={{ fontFamily:'var(--serif)', fontSize:isMobile?18:22, margin:0, fontWeight:500, letterSpacing:'.04em', cursor:'pointer' }}>成大山協</h1>
      </div>
      <nav style={{ display:'flex', gap:isMobile?16:24, alignItems:'baseline' }}>
        {!isMobile && <window.NavTabs />}
        <span style={{ width:1, height:14, background:'var(--border)' }} />
        {authed
          ? <button onClick={()=>go('member')} style={accBtn}>● 程效賢</button>
          : <button onClick={()=>go('login')} style={accBtn}>登入 · LOGIN</button>}
      </nav>
    </header>
  );
}
const accBtn = { fontFamily:'var(--mono)', fontSize:12, letterSpacing:'.04em', color:'var(--fg)', background:'transparent',
  border:'0.5px solid var(--border)', padding:'6px 12px', cursor:'pointer', whiteSpace:'nowrap' };

function XField({ label, hint, children, style, className }) {
  return (
    <div className={"x-field" + (className ? " " + className : "")} style={style}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="x-hint">{hint}</div>}
    </div>
  );
}

function XPill({ status }) {
  const m = { pend:['pend','待審核'], pass:['pass','已通過'], rej:['rej','已退回'] };
  const [c,t] = m[status]||['pend',status];
  return <span className={'x-pill '+c}>{t}</span>;
}

Object.assign(window, { BackHeader, XField, XPill });
