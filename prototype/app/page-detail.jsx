// app/page-detail.jsx — 詳細頁：保留 nav/header/stats/地圖/overlay，新增圖文(tabs)
const { useState: useSD, useRef: useRefD2, useSyncExternalStore: useSyncD } = React;

function CollapsiblePanel({ title, badge, defaultOpen=false, children, style }) {
  const [open,setOpen] = useSD(defaultOpen);
  return (
    <div style={{ position:'absolute', zIndex:1000, background:'color-mix(in oklch, var(--bg) 92%, transparent)',
      backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', border:'0.5px solid var(--border)', ...style }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        width:'100%', padding: open?'11px 16px 9px':'9px 16px', background:'transparent', border:'none', cursor:'pointer',
        borderBottom: open?'0.5px solid var(--border)':'none', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.2em', color:'var(--muted)', textAlign:'left' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <span>{title}</span>
          {badge && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', letterSpacing:'.06em', borderLeft:'0.5px solid var(--border)', paddingLeft:8 }}>{badge}</span>}
        </span>
        <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--fg)', display:'inline-block', lineHeight:1, transform: open?'rotate(0deg)':'rotate(-90deg)', transition:'transform .15s' }}>▾</span>
      </button>
      {open && <div style={{ padding:'9px 16px 13px' }}>{children}</div>}
    </div>
  );
}

function DLRow({ label, filename }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'baseline', padding:'6px 0', borderBottom:'0.5px dotted var(--border)', cursor:'pointer' }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.12em', color:'var(--accent)', paddingRight:4 }}>{label}</span>
      <div style={{ overflow:'hidden' }}><div style={{ fontFamily:'var(--serif)', fontSize:12.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{filename}</div></div>
      <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)' }}>↓</span>
    </div>
  );
}

// 圖文區塊
function JBlock({ b }) {
  if (b.type==='text')  return <p className="x-jp">{b.text}</p>;
  if (b.type==='quote') return <blockquote className="x-jq">{b.text}</blockquote>;
  if (b.type==='image') return (<figure className="x-jfig"><div className="x-photo" style={{ height:b.w==='full'?340:240 }}><span className="tag">PHOTO · {b.cap}</span></div><figcaption className="x-jcap">圖 · {b.cap}</figcaption></figure>);
  if (b.type==='twincol') return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, margin:'0 0 28px' }}>
      {[b.a,b.b].map((c,i)=>(<figure key={i} style={{ margin:0 }}><div className="x-photo" style={{ height:200 }}><span className="tag">PHOTO · {c.cap}</span></div><figcaption className="x-jcap">圖 · {c.cap}</figcaption></figure>))}
    </div>);
  return null;
}

function Journal({ canEdit, go }) {
  const J = window.DATA.JOURNAL;
  const [day,setDay] = useSD(0);
  const cur = J[day];
  return (
    <div className="x-journal">
      <div className="x-wrap">
        <div className="x-journal-head">
          <div className="x-label">圖文紀錄 <span className="en">FIELD JOURNAL</span></div>
          {canEdit && <button className="x-btn sm" onClick={()=>go('edit')}>✎ 編輯紀錄</button>}
        </div>
      </div>
      <div className="x-daytabs">
        <div className="x-wrap" style={{ display:'flex', gap:0, padding:'0 36px' }}>
          {J.map((d,i)=>(
            <button key={i} className={`x-daytab${day===i?' active':''}`} onClick={()=>setDay(i)}>
              <span className="d">{d.day}</span><span className="dt">{d.date}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="x-wrap">
        <div className="x-journal-body">
          <div className="x-day-head">
            <span className="x-day-no">{cur.day}</span>
            <div><div className="x-day-label">{cur.label}</div><div className="x-day-date">{cur.date} · 2026</div></div>
          </div>
          {cur.blocks.map((b,i)=><JBlock key={i} b={b} />)}
          <div style={{ borderTop:'0.5px solid var(--border)', paddingTop:18, marginTop:18, fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
            <span>紀錄 · 程效賢　最後更新 2026-05-08</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageDetail({ go, canEdit=false }) {
  const exp = window.DATA.DETAIL;
  const [tileLayer,setTile] = useSD('emap');
  const [mapMode,setMapMode] = useSD('2d');
  const [elev,setElev] = useSD([]);
  const [mSheet,setMSheet] = useSD('elev');
  const hoverRef = useRefD2(), leaveRef = useRefD2();
  const isMobile = useSyncD(window.subMobile, window.snapMobile, window.snapServer);
  const days = 4;

  const onElev = React.useCallback(pts=>setElev(pts),[]);
  const gpxFiles = exp.gpx_files, hasFiles = exp.map_files.length + exp.records.length > 0;

  const tileBtns = (cls, activeStyle) => (
    <>
      <button onClick={()=>setMapMode('3d')} style={tileBtnStyle(mapMode==='3d')}>3D</button>
      {window.MAP_OPTIONS.map(([k,l])=>(
        <button key={k} onClick={()=>{ setMapMode('2d'); setTile(k); }} style={tileBtnStyle(mapMode==='2d'&&tileLayer===k)}>{l}</button>
      ))}
    </>
  );

  // ── 手機 ──
  if (isMobile) {
    return (
      <div className="x-scroll-root">
        <div style={{ background:'var(--bg)', borderBottom:'0.5px solid var(--border)' }}>
          <header style={{ padding:'8px 18px 10px', display:'flex', alignItems:'center', gap:10 }}>
            <span onClick={()=>go('home')} style={{ fontFamily:'var(--mono)', fontSize:19, color:'var(--muted)', cursor:'pointer', flexShrink:0 }}>←</span>
            <h1 style={{ fontFamily:'var(--serif)', fontSize:16, fontWeight:500, margin:0, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.name}</h1>
          </header>
          <div style={{ padding:'6px 18px 8px', display:'flex', gap:'4px 10px', flexWrap:'wrap', alignItems:'baseline', fontFamily:'var(--mono)', fontSize:9.5, color:'var(--muted)', borderTop:'0.5px solid var(--border)' }}>
            <span style={{ color:'var(--fg)', whiteSpace:'nowrap' }}>{exp.date_start.slice(5)} → {exp.date_end.slice(5)}</span>
            <span style={{ whiteSpace:'nowrap' }}>{exp.county}{exp.region} <span style={{ color:'var(--accent)' }}>→</span> {exp.county_exit}{exp.region_exit}</span>
            <span style={{ whiteSpace:'nowrap' }}>領隊 {exp.leader}</span>
            <span style={{ whiteSpace:'nowrap', color:'var(--accent)' }}>{exp.grade}級</span>
          </div>
        </div>
        <div style={{ position:'relative', height:'52vh' }}>
          <FormalMap tileLayer={tileLayer} onElevation={onElev} hoverRef={hoverRef} leaveRef={leaveRef} />
        </div>
        {/* 地圖資訊面板（手機：靜態於地圖下方）*/}
        <div style={{ borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)' }}>
          <div style={{ display:'flex' }}>
            {[['elev','海拔圖'],['gpx','GPX / KML'],['dl','下載'],['map','地圖']].map(([v,l])=>(
              <button key={v} onClick={()=>setMSheet(v)} style={{ flex:1, padding:'10px 0', background:'transparent', border:'none',
                borderBottom: mSheet===v?'1.5px solid var(--accent)':'1.5px solid transparent', fontFamily:'var(--serif)', fontSize:12, color: mSheet===v?'var(--fg)':'var(--muted)', cursor:'pointer' }}>{l}</button>
            ))}
          </div>
          <div style={{ padding:'10px 14px', minHeight:120 }}>
            {mSheet==='elev' && (elev.length>=2 ? <ElevChart points={elev} height={120} style={{ borderTop:'none' }} /> : <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textAlign:'center', padding:'16px 0' }}>載入中…</div>)}
            {mSheet==='gpx' && gpxFiles.map((f,i)=>(<label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}><span style={{ width:11, height:11, background:'#9b4f1c' }} /><span style={{ fontFamily:'var(--serif)', fontSize:13 }}>{f.filename}</span></label>))}
            {mSheet==='dl' && (<div>{[['直企',exp.preview_image?'茶茶牙頓小眾化 20260501.png':null],...exp.map_files.map(f=>['地圖',f.filename]),...exp.records.map(f=>['紀錄',f.filename])].filter(x=>x[1]).map((x,i)=><DLRow key={i} label={x[0]} filename={x[1]} />)}</div>)}
            {mSheet==='map' && (<div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{tileBtns()}</div>)}
          </div>
        </div>
        <Journal canEdit={canEdit} go={go} />
      </div>
    );
  }

  // ── 桌機 ──
  return (
    <div className="x-scroll-root">
      <header className="formal-detail-header">
        <span onClick={()=>go('home')} style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--muted)', letterSpacing:'.08em', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>← 返回</span>
        <h1 style={{ fontFamily:'var(--serif)', fontSize:20, fontWeight:500, margin:0, letterSpacing:'.01em', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.name}</h1>
        <span style={{ fontFamily:'var(--mono)', fontSize:11.55, color:'var(--muted)', letterSpacing:'.04em', flexShrink:0, whiteSpace:'nowrap' }}>{exp.date_start} – {exp.date_end} · {days}D</span>
      </header>
      <div className="formal-detail-stats">
        <div className="formal-detail-stats-left">
          <span style={{ whiteSpace:'nowrap' }}>{exp.county}{exp.region} <span style={{ color:'var(--accent)' }}> → </span> {exp.county_exit}{exp.region_exit}</span>
          <span style={{ color:'var(--muted)', whiteSpace:'nowrap' }}>領隊 <span style={{ color:'var(--fg)' }}>{exp.leader}</span></span>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', letterSpacing:'.06em', whiteSpace:'nowrap' }}>{exp.grade}級</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', letterSpacing:'.15em' }}>底圖</span>
          {tileBtns()}
        </div>
      </div>

      {/* 地圖（固定高度，可往下捲動）*/}
      <div className="formal-map-area" style={{ flex:'none', height:'min(66vh, 620px)' }}>
        <FormalMap tileLayer={tileLayer} onElevation={onElev} hoverRef={hoverRef} leaveRef={leaveRef} />
        {gpxFiles.length>0 && (
          <CollapsiblePanel title="航跡 GPX/KML" badge={`1/${gpxFiles.length}`} style={{ top:12, left:12, width:'clamp(160px,44vw,240px)' }}>
            {gpxFiles.map((f,i)=>(
              <label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', cursor:'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor:'#9b4f1c' }} />
                <span style={{ width:10, height:10, background:'#9b4f1c', flexShrink:0 }} />
                <span style={{ flex:1, fontFamily:'var(--serif)', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.filename}</span>
              </label>
            ))}
          </CollapsiblePanel>
        )}
        {hasFiles && (
          <CollapsiblePanel title="下載" badge={String((exp.preview_image?1:0)+exp.map_files.length+exp.records.length)} style={{ top:12, right:12, width:'clamp(130px,38vw,260px)' }}>
            {exp.preview_image && <DLRow label="直企" filename="茶茶牙頓小眾化 20260501.png" />}
            {exp.map_files.map((f,i)=><DLRow key={i} label="地圖" filename={f.filename} />)}
            {exp.records.map((f,i)=><DLRow key={i} label="紀錄" filename={f.filename} />)}
          </CollapsiblePanel>
        )}
        {mapMode==='2d' && elev.length>=2 && (
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'50%', zIndex:1000 }}>
            <ElevChart points={elev} showHeader onHover={pt=>hoverRef.current&&hoverRef.current(pt)} onLeave={()=>leaveRef.current&&leaveRef.current()}
              style={{ background:'color-mix(in oklch, var(--bg) 92%, transparent)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }} />
          </div>
        )}
      </div>

      <Journal canEdit={canEdit} go={go} />
    </div>
  );
}

function tileBtnStyle(active){
  return { background: active?'var(--accent)':'transparent', color: active?'var(--bg)':'var(--muted)',
    border:`0.5px solid ${active?'var(--accent)':'var(--border)'}`, padding:'3px 8px',
    fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.06em', cursor:'pointer' };
}

Object.assign(window, { PageDetail });
