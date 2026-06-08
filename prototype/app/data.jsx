// app/data.jsx — 模擬資料（對齊真實 Expedition schema）
window.DATA = (function () {
  const YEARS = ["2026","2025","2024","2023"];

  // 列表資料（real schema 欄位）
  const EXPEDITIONS = [
    { id:24, name:"[3D活]恐龍飛高高", grade:"D", date_start:"2026-06-05", date_end:"2026-06-07",
      leader:"", region_entry_county:"高雄", region_entry_town:"桃源區", region_exit_county:"高雄", region_exit_town:"桃源區",
      gpx_count:0, map_count:0, rec_count:0 },
    { id:13, name:"[3D勘] 茶茶牙頓小眾化 20260501", grade:"D", date_start:"2026-04-30", date_end:"2026-05-03",
      leader:"程效賢", region_entry_county:"台東", region_entry_town:"達仁鄉", region_exit_county:"屏東", region_exit_town:"獅子鄉",
      gpx_count:1, map_count:2, rec_count:1, featured:true },
    { id:14, name:"[2D活]狼訓：你是否在雪山救過一群野狼", grade:"D", date_start:"2026-03-28", date_end:"2026-03-29",
      leader:"葉桐", region_entry_county:"屏東", region_entry_town:"獅子鄉", region_exit_county:"屏東", region_exit_town:"獅子鄉",
      gpx_count:0, map_count:1, rec_count:0 },
    { id:12, name:"[8B活] 鬼轉丹大溫泉巡禮 20250207", grade:"B", date_start:"2025-02-06", date_end:"2025-02-14",
      leader:"", region_entry_county:"南投", region_entry_town:"信義鄉", region_exit_county:"南投", region_exit_town:"信義鄉",
      gpx_count:1, map_count:1, rec_count:3 },
    { id:11, name:"[5C活] 嘉明湖會師-布拉克桑線 20240710", grade:"C", date_start:"2024-07-09", date_end:"2024-07-14",
      leader:"程效賢", region_entry_county:"台東", region_entry_town:"海端鄉", region_exit_county:"台東", region_exit_town:"海端鄉",
      gpx_count:1, map_count:2, rec_count:0 },
    { id:9, name:"[8B活] 嘉明湖會師_拉庫賽珂多美麗___20240707", grade:"B", date_start:"2024-07-06", date_end:"2024-07-14",
      leader:"", region_entry_county:"花蓮", region_entry_town:"卓溪鄉", region_exit_county:"台東", region_exit_town:"海端鄉",
      gpx_count:1, map_count:1, rec_count:0 },
    { id:7, name:"[4C活] 奇萊東稜下嵐山 20240615", grade:"C", date_start:"2024-06-15", date_end:"2024-06-18",
      leader:"林宥辰", region_entry_county:"花蓮", region_entry_town:"秀林鄉", region_exit_county:"南投", region_exit_town:"仁愛鄉",
      gpx_count:1, map_count:1, rec_count:2 },
    { id:5, name:"[3A活] 谷關七雄之東卯山訓練", grade:"A", date_start:"2023-05-04", date_end:"2023-05-04",
      leader:"葉桐", region_entry_county:"台中", region_entry_town:"和平區", region_exit_county:"台中", region_exit_town:"和平區",
      gpx_count:1, map_count:1, rec_count:1 },
  ];

  // 詳細頁（REC.013）
  const DETAIL = {
    id:13, name:"[3D勘] 茶茶牙頓小眾化 20260501", grade:"D",
    date_start:"2026-04-30", date_end:"2026-05-03", leader:"程效賢",
    county:"台東", region:"達仁鄉", county_exit:"屏東", region_exit:"獅子鄉",
    gpx_files:[
      { file_path:"chacha_main.gpx", filename:"茶茶牙頓主稜.gpx" },
    ],
    map_files:[
      { file_path:"a3.pdf", filename:"A3茶茶牙頓地圖.pdf" },
      { file_path:"a4.pdf", filename:"A4西都騎溪地圖.pdf" },
    ],
    records:[
      { file_path:"rec.pdf", filename:"260501-茶茶牙頓喝茶茶紀錄.pdf" },
    ],
    preview_image:"chacha.png",
  };

  // 圖文紀錄 — 依天數分段（tabs），段內可自由排版
  const JOURNAL = [
    { day:"D0", date:"04/30", label:"接駁・台東大武進駐",
      blocks:[
        { type:"text", text:"傍晚從台東大武車站集合，包車沿東 70 鄉道駛入登山口。雨勢時大時小，眾人在派出所旁的雨棚下整裝、分配公裝。隊伍今晚不上切，先在溪邊腹地紮營養精蓄銳。" },
        { type:"image", w:"full", cap:"大武車站集合・全隊整裝" },
        { type:"text", text:"留守確認、行動糧清點完畢。明日預計重裝上切稜線，落差近千米，是本行程最硬的一天。" },
      ]},
    { day:"D1", date:"05/01", label:"登山口 → 茶茶牙頓山西南鞍",
      blocks:[
        { type:"text", text:"清晨五點摸黑出發。前段沿廢棄林道緩升，林相由低海拔闊葉漸轉為針闊混生；行至 1 號路標附近遇崩塌地形，架繩通過。" },
        { type:"twincol", a:{cap:"崩塌地形架繩"}, b:{cap:"稜線箭竹海"} },
        { type:"text", text:"午後鑽行箭竹密林，能見度不足五米，全靠 GPS 與前人路條判位。傍晚抵達西南鞍部營地，紮營後濃霧鎖山。" },
        { type:"quote", text:"「茶茶牙頓的箭竹，是會吃人的。」── 領隊 程效賢" },
      ]},
    { day:"D2", date:"05/02", label:"主稜縱走 → 佳吉安山",
      blocks:[
        { type:"text", text:"今日為全程精華稜段，連續通過 13、15、17 號展望點。天氣轉晴，南向可遠眺中央山脈南段，北望大武地壘層巒疊翠。" },
        { type:"image", w:"full", cap:"主稜展望・中央山脈南段" },
        { type:"text", text:"午後於佳吉安山前的水源營地紮營，取水點需下切約 80 米，來回耗時近一小時。" },
      ]},
    { day:"D3", date:"05/03", label:"陡下 → 臺鐵枋野站收隊",
      blocks:[
        { type:"text", text:"最後一日一路陡下，海拔由 1335 米降至溪谷。下切途中數次涉溪，水位及膝。中午前抵達臺鐵枋野站旁產道，包車接駁返回台東，全隊平安完成。" },
        { type:"twincol", a:{cap:"涉溪下切"}, b:{cap:"枋野站收隊合影"} },
      ]},
  ];

  // 未認領隊伍
  const UNCLAIMED = [
    { id:24, name:"[3D活]恐龍飛高高", county:"高雄", date_start:"2026-06-05", grade:"D" },
    { id:12, name:"[8B活] 鬼轉丹大溫泉巡禮 20250207", county:"南投", date_start:"2025-02-06", grade:"B" },
    { id:9, name:"[8B活] 嘉明湖會師_拉庫賽珂多美麗", county:"花蓮", date_start:"2024-07-06", grade:"B" },
    { id:6, name:"[2D活] 鳶嘴稍來雲海行 20240420", county:"台中", date_start:"2024-04-20", grade:"D" },
    { id:4, name:"[5C活] 南二段橫斷 20240328", county:"南投", date_start:"2024-03-28", grade:"C" },
    { id:2, name:"[3D勘] 北大武西稜探勘 20240210", county:"屏東", date_start:"2024-02-10", grade:"D" },
  ];

  // 會員（role: 領隊 可編輯；其他為參與者）
  const MEMBER = {
    name:"程效賢", account:"chenghs", role:"一般會員",
    email:"chenghs@example.ncku.edu.tw", nick:"老程", contact:"0912-345-678",
    joined:"2023-09", teamsLed:6, recordsWritten:4,
    teams:[
      { id:13, name:"[3D勘] 茶茶牙頓小眾化 20260501", role:"領隊", status:"pass", date:"2026-04-30" },
      { id:11, name:"[5C活] 嘉明湖會師-布拉克桑線", role:"領隊", status:"pass", date:"2024-07-09" },
      { id:7,  name:"[4C活] 奇萊東稜下嵐山", role:"隊員", status:"pass", date:"2024-06-15" },
      { id:2,  name:"[3D勘] 北大武西稜探勘", role:"領隊", status:"pend", date:"2024-02-10" },
    ],
  };

  const COUNTIES = ["基隆","台北","新北","桃園","新竹","苗栗","宜蘭","台中","彰化","南投","雲林","花蓮","嘉義","台南","高雄","台東","屏東"];

  return { YEARS, EXPEDITIONS, DETAIL, JOURNAL, UNCLAIMED, MEMBER, COUNTIES };
})();
