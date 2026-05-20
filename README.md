# sttmountaincrazy

成大山協出隊紀錄系統 `v2.0.0`。進入時隨機跳轉至兩種風格之一。

## 風格

| 名稱 | 固定入口 | 詳細頁 | 說明 |
|------|---------|--------|------|
| 火箭羊羊 | `/rocket` | `/expedition/[id]` | Risograph 拼貼風，地圖互動 + GPX 軌跡 |
| 登山夯爆 | `/hangbao` | `/hangbao/[id]` | 台式霓虹風，關鍵字＋縣市＋日期篩選 |

`/` 隨機跳轉至其中一種風格；兩種風格右下角均有切換按鈕。

## 技術棧

- Next.js 16（App Router, Turbopack）
- SQLite（better-sqlite3）
- Leaflet（GPX 軌跡地圖）
- Tailwind CSS v4

## 專案結構

```
app/
  api/          ← GPX / PDF / preview 靜態檔路由
  expedition/   ← 火箭羊羊詳細頁
  hangbao/      ← 登山夯爆詳細頁
  rocket/       ← 火箭羊羊首頁
  page.tsx      ← 隨機跳轉邏輯
components/
  themes/
    hangbao/    ← 登山夯爆 UI 元件
    rocket/     ← 火箭羊羊 UI 元件
lib/
  db.ts         ← SQLite 連線
```

## 本地開發

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 資料庫

SQLite 資料庫路徑由環境變數 `DB_PATH` 指定（預設 `./data/expeditions.db`）。

後端資料由 [sttmountain](https://github.com/syoslyot/sttmountain) 產生，透過掛載 volume 共享 DB 和靜態檔案。

## 型別檢查

```bash
npx tsc --noEmit
```

## 開發流程

`main` 和 `develop` 受 GitHub branch ruleset 保護（設定日期：2025-05-20）：不可直接 push，必須走 PR，CI 須通過。

```
feature/<scope>-<desc>  →  develop  →  main
fix/<scope>-<desc>      →  develop
hotfix/<desc>           →  main + develop
```

Commit 格式遵循 Conventional Commits，詳見 `AGENTS.md`。
