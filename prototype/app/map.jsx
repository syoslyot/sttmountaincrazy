// app/map.jsx — 真實 Leaflet 地圖 + 海拔剖面圖（移植自 FormalLeafletMap / FormalElevationChart）
const { useState: useStateMap, useRef: useRefMap, useEffect: useEffectMap, useCallback: useCbMap } = React;

const ACCENT_HEX = "#8a6a4a"; // ≈ oklch(0.52 0.08 50)
const TRACK_COLOR = "#9b4f1c";

const TILE_URLS = {
  topo: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OpenTopoMap", maxZoom: 17 },
  sat: { url: "https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}", attr: "© 國土測繪中心", maxZoom: 20 },
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap", maxZoom: 19 },
  emap: { url: "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}", attr: "© 國土測繪中心 EMAP", maxZoom: 20 },
  rudy: { url: "https://tile.happyman.idv.tw/map/moi_osm/{z}/{x}/{y}.png", attr: "© Taiwan TOPO", maxZoom: 20 },
  google: { url: "https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", attr: "© Google", maxZoom: 20, subdomains: "0123" },
  jm1924: { url: "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}", attr: "© 國土測繪中心", maxZoom: 18 },
  landuse1956: { url: "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}", attr: "© 國土測繪中心", maxZoom: 18 },
  landuse1956_250k: { url: "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}", attr: "© 國土測繪中心", maxZoom: 16 }
};
window.MAP_OPTIONS = [
["topo", "Topo"], ["emap", "EMAP"], ["sat", "Sat"], ["osm", "OSM"], ["rudy", "魯地圖"],
["google", "Google Map"], ["jm1924", "日治"], ["landuse1956", "Landuse"], ["landuse1956_250k", "Landuse1"]];


// ─── 合成航跡（茶茶牙頓：東側起 → 西南收）──────────────────────────────
function haversine(a, b) {const R = 6371000,dLat = (b[0] - a[0]) * Math.PI / 180,dLon = (b[1] - a[1]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));}

const TRACK = function () {
  const anchors = [
  [22.406, 120.905, 40], [22.404, 120.882, 260], [22.398, 120.862, 560], [22.392, 120.842, 860],
  [22.384, 120.826, 1120], [22.374, 120.812, 1300], [22.366, 120.804, 1335], [22.357, 120.798, 1120],
  [22.349, 120.790, 940], [22.342, 120.782, 660], [22.336, 120.772, 360], [22.331, 120.762, 60]];

  const N = 200,latlngs = [],elevs = [];
  const start = Date.parse("2026-05-01T05:00:00+08:00");
  const totalMs = (58 * 60 + 9) * 60 * 1000;
  let cum = 0;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) * (anchors.length - 1);
    const k = Math.min(anchors.length - 2, Math.floor(t)),f = t - k;
    const lat = anchors[k][0] + (anchors[k + 1][0] - anchors[k][0]) * f + Math.sin(i * 0.9) * 0.0006;
    const lng = anchors[k][1] + (anchors[k + 1][1] - anchors[k][1]) * f + Math.cos(i * 0.7) * 0.0009;
    const ele = anchors[k][2] + (anchors[k + 1][2] - anchors[k][2]) * f + Math.sin(i * 1.7) * 22 + Math.sin(i * 0.5) * 14;
    if (i > 0) cum += haversine(latlngs[i - 1], [lat, lng]);
    latlngs.push([lat, lng]);
    elevs.push({ dist: cum, ele: Math.max(20, ele), lat, lng, time: start + i / (N - 1) * totalMs });
  }
  // 20 個編號路標
  const waypoints = [];
  for (let n = 1; n <= 20; n++) {const idx = Math.round((n - 0.5) / 20 * (N - 1));waypoints.push({ idx, lat: latlngs[idx][0], lng: latlngs[idx][1], label: String(n) });}
  return { latlngs, elevs, waypoints };
}();
window.TRACK = TRACK;

// ─── 海拔剖面圖（移植 FormalElevationChart）───────────────────────────
function formatDur(ms) {const m = Math.max(0, Math.round(ms / 60000)),h = Math.floor(m / 60),mm = m % 60;return h <= 0 ? `${mm} 分` : `${h} 小時 ${mm} 分`;}
function ElevChart({ points, onHover, onLeave, style, showHeader = false, height = 112 }) {
  const [hoverPt, setHoverPt] = useStateMap(null);
  if (!points || points.length < 2) return null;
  const W = 800,H = height,PAD = { top: 10, right: 16, bottom: 18, left: 54 };
  const iW = W - PAD.left - PAD.right,iH = H - PAD.top - PAD.bottom;
  const maxDist = points[points.length - 1].dist;
  const eles = points.map((p) => p.ele),minE = Math.min(...eles),maxE = Math.max(...eles),eRange = maxE - minE || 1;
  const sx = (d) => PAD.left + d / maxDist * iW,sy = (e) => PAD.top + iH - (e - minE) / eRange * iH;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.dist).toFixed(1)},${sy(p.ele).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${sx(maxDist).toFixed(1)},${(PAD.top + iH).toFixed(1)} L${PAD.left},${(PAD.top + iH).toFixed(1)} Z`;
  let gain = 0,loss = 0,prev = points[0].ele;
  for (let i = 1; i < points.length; i++) {const d = points[i].ele - prev;if (Math.abs(d) > 5) {d > 0 ? gain += d : loss -= d;prev = points[i].ele;}}
  const dur = points[points.length - 1].time - points[0].time;
  const startTime = points[0].time;
  const yTicks = [0, 1, 2, 3].map((i) => minE + eRange * i / 3);
  const xCount = Math.min(6, Math.floor(maxDist / 10000) + 1);
  const xTicks = Array.from({ length: xCount }, (_, i) => maxDist * i / (xCount - 1));
  const onMove = (e) => {const r = e.currentTarget.getBoundingClientRect();
    const tgt = Math.max(0, Math.min(maxDist, ((e.clientX - r.left) / r.width * W - PAD.left) / iW * maxDist));
    const best = points.reduce((a, p) => Math.abs(p.dist - tgt) < Math.abs(a.dist - tgt) ? p : a);
    setHoverPt(best);onHover && onHover(best);};
  return (
    <div style={{ flexShrink: 0, background: "var(--bg)", borderTop: "0.5px solid var(--border)", ...style }}>
      {showHeader &&
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "8px 20px 4px",
        fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--muted)" }}>
          <span>海拔圖 · ELEVATION</span>
          <span style={{ display: "flex", gap: 20, fontSize: 11.25 }}>
            <span>◷ {formatDur(dur)}</span><span>↔ {(maxDist / 1000).toFixed(1)} km</span>
            <span>↑ {Math.round(gain)} m</span><span>↓ {Math.round(loss)} m</span><span>▲ {Math.round(maxE)} m</span>
          </span>
        </div>
      }
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
      style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMove}
      onMouseLeave={() => {setHoverPt(null);onLeave && onLeave();}}>
        <path d={areaD} fill="color-mix(in oklch, var(--accent) 15%, transparent)" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
        {yTicks.map((e, i) => {const y = sy(e);return <g key={i}>
          <line x1={PAD.left} y1={y} x2={PAD.left + iW} y2={y} stroke="var(--border)" strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">{Math.round(e)}</text>
        </g>;})}
        {xTicks.map((d, i) => <text key={i} x={sx(d)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">{(d / 1000).toFixed(0)}k</text>)}
        {hoverPt && (() => {const hx = sx(hoverPt.dist),hy = sy(hoverPt.ele);
          const elapsed = formatDur(hoverPt.time - startTime);
          const lbl = `${(hoverPt.dist / 1000).toFixed(1)}km · ${Math.round(hoverPt.ele)}m · ${elapsed}`;
          const tw = lbl.length * 5.5 + 12,tx = hx + 8 + tw > W ? hx - tw - 8 : hx + 8;
          return <g>
            <line x1={hx} y1={PAD.top} x2={hx} y2={PAD.top + iH} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={hx} cy={hy} r={4} fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
            <rect x={tx} y={hy - 17} width={tw} height={14} fill="var(--bg)" stroke="var(--accent)" strokeWidth="0.5" rx={1} />
            <text x={tx + 6} y={hy - 6} fontSize="10" fill="var(--accent)" fontFamily="var(--mono)">{lbl}</text>
          </g>;
        })()}
      </svg>
    </div>);

}

// ─── Leaflet 地圖 ───────────────────────────────────────────────────
function FormalMap({ tileLayer = "emap", onElevation, hoverRef, leaveRef, active = true }) {
  const elRef = useRefMap(null),mapRef = useRefMap(null),tileRef = useRefMap(null),hoverMk = useRefMap(null);
  const [zoomOn, setZoomOn] = useStateMap(false);

  useEffectMap(() => {
    if (!elRef.current || mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    // 預設：滾輪捲動頁面；點擊地圖才啟用滾輪縮放，滑鼠移出即恢復捲動
    map.on("click", () => { map.scrollWheelZoom.enable(); setZoomOn(true); });
    const onLeave = () => { map.scrollWheelZoom.disable(); setZoomOn(false); };
    elRef.current.addEventListener("mouseleave", onLeave);
    const cfg = TILE_URLS[tileLayer] || TILE_URLS.emap;
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: cfg.maxZoom, subdomains: cfg.subdomains || "abc" }).addTo(map);
    L.control.scale({ metric: true, imperial: false }).addTo(map);

    // 航跡
    const line = L.polyline(TRACK.latlngs, { color: TRACK_COLOR, weight: 3, opacity: .9 }).addTo(map);
    // 編號路標
    TRACK.waypoints.forEach((w) => {
      const icon = L.divIcon({ className: "", iconSize: [27, 27], iconAnchor: [13.5, 13.5],
        html: `<div style="width:27px;height:27px;background:${TRACK_COLOR};color:#f6f4ef;border:2.25px solid #f6f4ef;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3);display:grid;place-items:center;font-family:var(--mono);font-size:13.5px;font-weight:700;line-height:1">${w.label}</div>` });
      L.marker([w.lat, w.lng], { icon }).addTo(map);
    });
    const mk = (bg, fg, t) => L.divIcon({ className: "", iconSize: [35, 28], iconAnchor: [17.5, 14],
      html: `<div style="background:${bg};color:${fg};padding:4px 9px;font-family:var(--mono);font-size:13.75px;border:1px solid ${fg};letter-spacing:.06em">${t}</div>` });
    L.marker(TRACK.latlngs[0], { icon: mk("#f6f4ef", TRACK_COLOR, "起"), zIndexOffset: 2000 }).addTo(map);
    L.marker(TRACK.latlngs[TRACK.latlngs.length - 1], { icon: mk("#f6f4ef", TRACK_COLOR, "終"), zIndexOffset: 2000 }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [34, 34] });
    onElevation && onElevation(TRACK.elevs);

    if (hoverRef) hoverRef.current = (pt) => {
      if (hoverMk.current) hoverMk.current.setLatLng([pt.lat, pt.lng]);else
      hoverMk.current = L.circleMarker([pt.lat, pt.lng], { radius: 9, color: ACCENT_HEX, fillColor: "#f6f4ef", fillOpacity: 1, weight: 3 }).addTo(map);
    };
    if (leaveRef) leaveRef.current = () => {hoverMk.current && hoverMk.current.remove();hoverMk.current = null;};

    setTimeout(() => map.invalidateSize(), 120);
    return () => {map.remove();mapRef.current = null;};
  }, []);

  // 切換底圖
  useEffectMap(() => {
    const map = mapRef.current;if (!map || !window.L) return;
    if (tileRef.current) {tileRef.current.remove();}
    const cfg = TILE_URLS[tileLayer] || TILE_URLS.emap;
    tileRef.current = window.L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: cfg.maxZoom, subdomains: cfg.subdomains || "abc" }).addTo(map);
  }, [tileLayer]);

  // 容器尺寸變動時重算
  useEffectMap(() => {if (active && mapRef.current) setTimeout(() => mapRef.current.invalidateSize(), 160);}, [active]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={elRef} style={{ width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
        pointerEvents: "none", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".04em",
        color: zoomOn ? "var(--accent)" : "var(--muted)", background: "color-mix(in oklch, var(--bg) 86%, transparent)",
        border: "0.5px solid var(--border)", padding: "4px 10px", whiteSpace: "nowrap",
        opacity: zoomOn ? 0.92 : 0.82 }}>
        {zoomOn ? "縮放已啟用 · 滑鼠移出地圖即可繼續捲動頁面" : "滾輪捲動頁面 · 點一下地圖以啟用縮放"}
      </div>
    </div>);

}

Object.assign(window, { ElevChart, FormalMap });