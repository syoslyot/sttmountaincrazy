// app/page-home.jsx — 出隊紀錄列表（完整比照 FormalHome，桌機 + 手機）
const { useState: useSH, useCallback: useCbH, useSyncExternalStore: useSyncH } = React;

const COUNTY_GRID = {
  '基隆':{r:0,c:4}, '台北':{r:0,c:3}, '新北':{r:1,c:3.5}, '桃園':{r:1,c:2},
  '新竹':{r:2,c:1.5}, '苗栗':{r:3,c:1}, '宜蘭':{r:2,c:4}, '台中':{r:4,c:0.8},
  '彰化':{r:5,c:0.8}, '南投':{r:5,c:2.4}, '雲林':{r:6,c:0.6}, '花蓮':{r:5,c:4},
  '嘉義':{r:7,c:0.8}, '台南':{r:8,c:1}, '高雄':{r:9,c:1.6}, '台東':{r:8,c:3.6}, '屏東':{r:10,c:2.4},
};
function fmtLeader(l){ return l && l.length>5 ? '？' : l; }
function subMobile(cb){ const mq=window.matchMedia('(max-width:680px)'); mq.addEventListener('change',cb); return ()=>mq.removeEventListener('change',cb); }
function snapMobile(){ return window.matchMedia('(max-width:680px)').matches; }
function snapServer(){ return false; }

function CountyGrid({ selected, onToggle, mobile=false }) {
  const SIZE = mobile?26:24, GAP = mobile?4:10;
  const entries = Object.entries(COUNTY_GRID);
  const maxR = Math.max(...entries.map(([,v])=>v.r)), maxC = Math.max(...entries.map(([,v])=>v.c));
  const W=(maxC+1)*(SIZE+GAP)+(mobile?20:40), H=(maxR+1)*(SIZE+GAP)+(mobile?4:8);
  return (
    <div style={{ position:'relative', width:W, height:H }}>
      {entries.map(([name,{r,c}])=>{
        const active = selected.includes(name);
        return (
          <button key={name} onClick={()=>onToggle(name)} title={name}
            style={{ position:'absolute', left:c*(SIZE+GAP), top:r*(SIZE+GAP), width:SIZE, height:SIZE, padding:0, border:'none',
              cursor:'pointer', background:'transparent', fontFamily:'var(--serif)', fontSize: mobile?undefined:SIZE*0.55,
              color: active?'var(--accent)':'var(--muted)', fontWeight: active?600:400,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            {mobile
              ? <span style={{ writingMode:'vertical-rl', textOrientation:'upright', fontSize:11, lineHeight:1.1 }}>{name}</span>
              : <span style={{ borderBottom: active?'1.5px solid var(--accent)':'1px solid var(--border)', padding:'0 1px', lineHeight:1.4 }}>{name}</span>}
          </button>
        );
      })}
    </div>
  );
}

function NavTabs({ size=14 }) {
  const tabs=[['關於',0],['投稿',0],['出隊紀錄',1]];
  return tabs.map(([label,active])=>(
    <span key={label} style={{ fontFamily:'var(--serif)', fontSize:size, letterSpacing:'.04em', cursor:'default',
      color: active?'var(--fg)':'var(--muted)', borderBottom: active?'1.5px solid var(--accent)':'none', paddingBottom:1 }}>{label}</span>
  ));
}

function SpecimenCard({ exp, onClick }) {
  const sameRegion = exp.region_entry_county===exp.region_exit_county && exp.region_entry_town===exp.region_exit_town;
  return (
    <div className="formal-card" onClick={onClick}>
      <div>
        <div className="formal-card-no">REC.</div>
        <div className="formal-card-num">{String(exp.id).padStart(3,'0')}</div>
        {exp.grade && <div className="formal-card-grade">{exp.grade}級</div>}
      </div>
      <div>
        <h2 className="formal-card-name">{exp.name}</h2>
        <div className="formal-card-region">
          {exp.region_entry_county&&exp.region_entry_town ? `${exp.region_entry_county}${exp.region_entry_town}`:null}
          {!sameRegion && exp.region_exit_county && exp.region_exit_town && (
            <> <span className="formal-accent">→</span> {exp.region_exit_county}{exp.region_exit_town}</>)}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignSelf:'stretch' }}>
        <div className="formal-card-date">{exp.date_start} - {exp.date_end}</div>
        {exp.leader && <div className="formal-card-date-end" style={{ marginTop:10 }}>領隊 {fmtLeader(exp.leader)}</div>}
        {(exp.gpx_count>0||exp.map_count>0||exp.rec_count>0) && (
          <div style={{ marginTop:'auto', paddingTop:3, display:'flex', gap:8, justifyContent:'flex-end' }}>
            {exp.gpx_count>0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', letterSpacing:'.04em' }}>GPX / KML: {exp.gpx_count}</span>}
            {exp.map_count>0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'#3d6b9e', letterSpacing:'.04em' }}>MAP: {exp.map_count}</span>}
            {exp.rec_count>0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', letterSpacing:'.04em' }}>REC: {exp.rec_count}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileExpCard({ exp, onClick }) {
  const hasBadges = exp.gpx_count>0||exp.map_count>0||exp.rec_count>0;
  const sameRegion = exp.region_entry_county===exp.region_exit_county && exp.region_entry_town===exp.region_exit_town;
  return (
    <div onClick={onClick} style={{ padding:'12px 18px', borderBottom:'0.5px solid var(--border)', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:4 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', letterSpacing:'.06em', paddingTop:1, flex:1, minWidth:0 }}>
          REC.{String(exp.id).padStart(3,'0')}{exp.leader && <span style={{ whiteSpace:'nowrap' }}> / 領隊 {fmtLeader(exp.leader)}</span>}
        </span>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--fg)', letterSpacing:'.02em', whiteSpace:'nowrap', flexShrink:0 }}>
          {exp.date_start}{exp.date_end?` – ${exp.date_end.slice(5)}`:''}
        </div>
      </div>
      <h3 style={{ fontFamily:'var(--serif)', fontSize:17, fontWeight:500, margin:0, lineHeight:1.25, letterSpacing:'.01em' }}>{exp.name}</h3>
      <div style={{ marginTop:6, fontFamily:'var(--serif)', fontSize:12, color:'var(--muted)', lineHeight:1.5, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
        <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {exp.region_entry_county&&exp.region_entry_town ? `${exp.region_entry_county}${exp.region_entry_town}`:null}
          {!sameRegion && exp.region_exit_county && exp.region_exit_town && <> <span style={{ color:'var(--accent)' }}>→</span> {exp.region_exit_county}{exp.region_exit_town}</>}
        </span>
        {hasBadges && (
          <span style={{ display:'flex', gap:8, flexShrink:0, whiteSpace:'nowrap' }}>
            {exp.gpx_count>0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)' }}>GPX·{exp.gpx_count}</span>}
            {exp.map_count>0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'#3d6b9e' }}>MAP·{exp.map_count}</span>}
            {exp.rec_count>0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)' }}>REC·{exp.rec_count}</span>}
          </span>
        )}
      </div>
    </div>
  );
}

function MobileSelect({ value, options, open, onOpen, onChange }) {
  const sel = options.find(o=>o.value===value);
  const label = value==='all'||value===''?'全選':(sel?sel.label:'全選');
  return (
    <div className="formal-mobile-select">
      <button type="button" className="formal-mobile-select-trigger" onClick={onOpen}>{label}</button>
      {open && <div className="formal-mobile-select-menu">
        {options.map(o=>(
          <button key={o.value} type="button" className={`formal-mobile-select-option${o.value===value?' active':''}`} onClick={()=>onChange(o.value)}>{o.label}</button>
        ))}
      </div>}
    </div>
  );
}

function PageHome({ go }) {
  const D = window.DATA;
  const years = D.YEARS;
  const [query,setQuery] = useSH('');
  const [counties,setCounties] = useSH([]);
  const [year,setYear] = useSH('all');
  const [grade,setGrade] = useSH('');
  const [sort,setSort] = useSH('latest');
  const [mSel,setMSel] = useSH(null);
  const isMobile = useSyncH(subMobile, snapMobile, snapServer);
  const toggleCounty = useCbH(c=>setCounties(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]),[]);

  let exps = D.EXPEDITIONS.filter(e=>{
    if (query && !(e.name.includes(query)||(e.leader||'').includes(query))) return false;
    if (year!=='all' && !e.date_start.startsWith(year)) return false;
    if (grade && e.grade!==grade) return false;
    if (counties.length && !counties.some(c=>e.region_entry_county===c||e.region_exit_county===c)) return false;
    return true;
  });
  exps = [...exps].sort((a,b)=> sort==='latest'? b.date_start.localeCompare(a.date_start) : a.date_start.localeCompare(b.date_start));
  const total = D.EXPEDITIONS.length;
  const open = e => go('detail', e.id);

  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', width:'100%', minHeight:'100dvh', background:'var(--bg)', color:'var(--fg)', fontFamily:'var(--serif)' }}>
        <header style={{ padding:'10px 18px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'baseline', gap:10 }}>
          <h1 style={{ fontFamily:'var(--serif)', fontSize:18, fontWeight:500, margin:0, letterSpacing:'.04em' }}>成大山協</h1>
          <nav style={{ marginLeft:'auto', display:'flex', gap:16, alignItems:'baseline' }}><NavTabs size={13} /></nav>
        </header>
        <section style={{ padding:'14px 18px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flexShrink:0 }}><CountyGrid selected={counties} onToggle={toggleCounty} mobile /></div>
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.2em', color:'var(--muted)', marginBottom:6 }}>INDEX · BY COUNTY</div>
            <h2 style={{ fontFamily:'var(--serif)', fontSize:18, fontWeight:500, margin:0, lineHeight:1.3, letterSpacing:'.02em' }}>
              選擇縣市<br/>以索引<br/><span style={{ color:'var(--accent)', fontStyle:'italic' }}>歷年出隊。</span>
            </h2>
          </div>
        </section>
        <div className="formal-mobile-filter-row">
          <label className="formal-mobile-filter-field formal-mobile-filter-query">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="請輸入隊伍名稱或領隊" />
          </label>
          <label className="formal-mobile-filter-field">
            <MobileSelect value={year} options={[{value:'all',label:'ALL'},...years.map(y=>({value:y,label:y}))]} open={mSel==='year'} onOpen={()=>setMSel(p=>p==='year'?null:'year')} onChange={v=>{setYear(v);setMSel(null);}} />
          </label>
          <label className="formal-mobile-filter-field">
            <MobileSelect value={grade} options={[{value:'',label:'ALL'},...['A','B','C','D'].map(g=>({value:g,label:g}))]} open={mSel==='grade'} onOpen={()=>setMSel(p=>p==='grade'?null:'grade')} onChange={v=>{setGrade(v);setMSel(null);}} />
          </label>
        </div>
        <div style={{ padding:'10px 18px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.15em', color:'var(--muted)' }}>EXPEDITIONS</span>
          <span style={{ fontFamily:'var(--serif)', fontSize:15, fontWeight:500 }}>{exps.length}</span>
          {counties.length>0 && <span style={{ marginLeft:'auto', fontFamily:'var(--serif)', fontSize:11, color:'var(--accent)' }}>{counties.join('、')}</span>}
        </div>
        <div>
          {exps.map(e=><MobileExpCard key={e.id} exp={e} onClick={()=>open(e)} />)}
          {exps.length===0 && <div style={{ padding:'60px 0', textAlign:'center', fontFamily:'var(--serif)', fontSize:14, color:'var(--muted)' }}>沒有符合條件的出隊紀錄</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="formal-root scrollable">
      <header className="formal-header">
        <div style={{ display:'flex', alignItems:'baseline', gap:14 }}>
          <h1 style={{ fontFamily:'var(--serif)', fontSize:22, margin:0, fontWeight:500, letterSpacing:'.04em' }}>成大山協</h1>
        </div>
        <nav style={{ display:'flex', gap:24, alignItems:'baseline' }}><NavTabs /></nav>
      </header>
      <div className="formal-body-shell">
        <div className="formal-body">
          <aside className="formal-sidebar">
            <div>
              <div className="formal-filter-label">搜尋 · QUERY</div>
              <div className="formal-search-wrap">
                <span className="formal-search-icon">⌕</span>
                <input className="formal-search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="名稱／領隊" />
              </div>
            </div>
            <div>
              <div className="formal-filter-label">地區 · REGION{counties.length>0 && <button className="formal-clear-btn" onClick={()=>setCounties([])}>CLEAR</button>}</div>
              <div style={{ padding:'14px', background:'var(--bg)', border:'0.5px solid var(--border)' }}><CountyGrid selected={counties} onToggle={toggleCounty} /></div>
            </div>
            <div>
              <div className="formal-filter-label">年份 · YEAR</div>
              <div className="formal-year-chips">
                {['all',...years].map(y=>(<button key={y} className={`formal-year-chip${year===y?' active':''}`} onClick={()=>setYear(y)}>{y==='all'?'ALL':y}</button>))}
              </div>
            </div>
            <div>
              <div className="formal-filter-label">級數 · GRADE{grade && <button className="formal-clear-btn" onClick={()=>setGrade('')}>CLEAR</button>}</div>
              <div className="formal-grade-chips">
                {['A','B','C','D'].map(g=>(<button key={g} className={`formal-grade-chip${grade===g?' active':''}`} onClick={()=>setGrade(g===grade?'':g)}>{g}</button>))}
              </div>
            </div>
            <div className="formal-sidebar-footer"><div>FOUNDED&nbsp;1982</div><div>NCKU&nbsp;TAINAN&nbsp;·&nbsp;TW</div></div>
          </aside>
          <div className="formal-result-area">
            <div className="formal-result-bar">
              <div style={{ display:'flex', alignItems:'baseline', gap:14 }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.15em', color:'var(--muted)' }}>結果 · RESULTS</span>
                <span style={{ fontFamily:'var(--serif)', fontSize:22, fontWeight:500 }}>{String(exps.length).padStart(2,'0')}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>/ {String(total).padStart(2,'0')}</span>
                {counties.length>0 && <span style={{ fontFamily:'var(--serif)', fontSize:13, color:'var(--muted)' }}>· 在&nbsp;{counties.map((c,i)=><span key={c}><span className="formal-accent">{c}</span>{i<counties.length-1?'、':''}</span>)}</span>}
              </div>
              <button className="formal-sort-btn" type="button" onClick={()=>setSort(p=>p==='latest'?'oldest':'latest')}>排序&nbsp;<span className="formal-sort-value">{sort==='latest'?'最新 ↓':'最舊 ↑'}</span></button>
            </div>
            <div className="formal-result-list">
              <div className="formal-result-list-inner">
                {exps.map(e=><SpecimenCard key={e.id} exp={e} onClick={()=>open(e)} />)}
                {exps.length===0 && <div style={{ padding:'60px 0', textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--serif)', fontSize:14, color:'var(--muted)', marginBottom:6 }}>沒有符合條件的出隊紀錄</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.1em', color:'var(--muted)' }}>NO RESULTS</div>
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PageHome, NavTabs, fmtLeader, snapMobile, subMobile, snapServer });
