# sttmountcrazy

成大山協出隊紀錄系統。進入時隨機顯示兩種風格之一。

## 風格

| 名稱 | 路由 | 說明 |
|------|------|------|
| 火箭羊羊 | `/` | Risograph 拼貼風，地圖互動篩選出隊紀錄 |
| 登山夯爆 | `/` 或 `/hangbao` | 台式霓虹風，關鍵字＋縣市＋日期篩選 |

每次進入 `/` 隨機分配風格；`/hangbao` 為登山夯爆的固定入口。

## 技術棧

- Next.js 15 (App Router)
- SQLite（better-sqlite3）
- Leaflet（GPX 軌跡地圖）
- Tailwind CSS

## 本地開發

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 資料庫

SQLite 資料庫路徑由環境變數 `DB_PATH` 指定（預設 `./data/expeditions.db`）。

## 型別檢查

```bash
npx tsc --noEmit
```
