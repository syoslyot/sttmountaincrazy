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

## CI 驗證

每個 PR 到 `main` 都會自動跑以下驗證，全部通過才能 merge：

| 驗證 | 指令 | 抓什麼問題 |
|------|------|-----------|
| TypeScript 型別檢查 | `npx tsc --noEmit` | 型別不符（`string` 傳給 `number`、`undefined` 存取等）、import 路徑錯誤 |
| ESLint | `npm run lint` | 程式碼風格、潛在 bug（未使用變數、`==` 代替 `===`）、React Hooks 規則 |

merge 進 `main` 後另外跑（不屬於 PR 驗證）：

| 步驟 | 說明 |
|------|------|
| Docker build + push | 確認 `Dockerfile` 語法正確、`npm run build` 可完成 Production build |
| Watchtower | 部署伺服器偵測新 image 後自動重啟容器 |

## 部署架構備忘

### 現有流程的限制

每次 push，不論改了幾行，都要跑完整個 build 流程（`npm run build` → `docker build` → push image → Watchtower 換 container）。Docker image 是不可變快照，沒有「只更新某一行」的操作，只能整包替換。

代價：build 時間約 3–8 分鐘；Watchtower 停舊 container 到新 container 就緒之間有短暫停機。

### 業界解法（目前規模不需要，作為學習紀錄）

| 技術 | 解決什麼問題 | 說明 |
|------|------------|------|
| **增量 build**（monorepo + turborepo） | build 時間長 | 只重新 build 有變動的套件/服務，其餘從 cache 取 |
| **藍綠部署**（Blue-Green Deployment） | 停機時間 | 先啟動新 container 並確認健康，再把流量切過去，舊 container 才停。零停機。 |
| **Kubernetes Rolling Update** | 停機時間 + 水平擴展 | 多個 container 逐一替換，永遠保持部分舊 container 在服務中，不全停。需要 K8s 叢集。 |

**這個專案現況**：3–5 分鐘 build + 幾秒停機完全可以接受，不需要上述機制。

> 未來可新增的驗證：E2E 測試（Playwright）、bundle size 分析（`@next/bundle-analyzer`）

## 開發流程

`main` 和 `develop` 受 GitHub branch ruleset 保護（設定日期：2025-05-20）：不可直接 push，必須走 PR；`main` 另要求 `lint-and-type-check` job 通過。

```
feature/<scope>-<desc>  →  develop  →  main
fix/<scope>-<desc>      →  develop
hotfix/<desc>           →  main + develop
```

Commit 格式遵循 Conventional Commits，詳見 `AGENTS.md`。
