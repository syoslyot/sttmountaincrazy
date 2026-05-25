# sttmountaincrazy

成大山協瘋狂小甜甜直企展示系統 `v2.0.0`。進入時隨機跳轉至兩種風格之一。

## 風格

| 名稱 | 固定入口 | 詳細頁 | 說明 |
|------|---------|--------|------|
| 火箭羊羊 | `/rocket` | `/expedition/[id]` | Risograph 拼貼風，地圖互動 + GPX 軌跡 |
| 登山夯爆 | `/hangbao` | `/hangbao/[id]` | 台式霓虹風，關鍵字＋縣市＋日期篩選 |

`/` 隨機跳轉至其中一種風格；兩種風格右下角均有切換按鈕。

## 技術棧

- Next.js 16（App Router, Turbopack）
- Supabase（PostgreSQL + Storage）
- Leaflet（GPX 軌跡地圖）
- Tailwind CSS v4

## 資料來源

所有出隊資料存放於 [Supabase](https://supabase.com) 雲端資料庫，由 [sttmountain](https://github.com/syoslyot/sttmountain) 的 `normalize.py` 負責匯入。
Supabase schema、RPC、權限與 migration 由 `sttmountain` 維護；本 repo 只保留前端程式與 API route，不保存 SQL migration。

- **列表查詢**：呼叫 Supabase RPC `list_expeditions()`
- **詳細頁**：Supabase nested select（expeditions + gpx_files + map_files + records + members）
- **GPX / PDF / 預覽圖**：重新導向至 Supabase Storage 公開 URL

## 專案結構

```
app/
  api/
    expeditions/      ← 列表（RPC）、詳細（nested select）、日期範圍（RPC）
    gpx/              ← redirect → Supabase Storage gpx bucket
    pdf/              ← redirect → Supabase Storage maps bucket
    preview/          ← redirect → Supabase Storage previews bucket
  expedition/         ← 火箭羊羊詳細頁
  hangbao/            ← 登山夯爆詳細頁
  rocket/             ← 火箭羊羊首頁
  page.tsx            ← 隨機跳轉邏輯
components/
  themes/
    hangbao/          ← 登山夯爆 UI 元件
    rocket/           ← 火箭羊羊 UI 元件
lib/
  supabase.ts         ← Supabase client + fetchExpeditionById()
```

## 資料庫 Schema

資料庫的 source of truth 在 `sttmountain`：

- `sttmountain/db/schema.sql`：目前完整 schema
- `sttmountain/db/migrations/`：既有 dev/prod DB 的版本化 SQL 變更
- `sttmountain/docs/database.md`：migration、dev/prod 套用與驗證流程

本節只記錄前端會用到的 contract，避免前端 repo 和 DB repo 各自保存一份 SQL 後產生 drift。

### `expeditions` 主要欄位

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | int | 流水號（自動遞增） |
| `name` | text | 出隊名稱（含前綴，如 `[3D活]`） |
| `date_start` | date | 入山日 |
| `date_end` | date | 出山日（nullable） |
| `region_entry_county` | text | 入山縣市 |
| `region_entry_town` | text | 入山鄉鎮 |
| `region_exit_county` | text | 出山縣市（nullable） |
| `region_exit_town` | text | 出山鄉鎮（nullable） |
| `leader` | text | 領隊姓名（nullable） |
| `grade` | text | 級數，由 DB trigger 從名稱 prefix 解析 |
| `preview_image` | text | 預覽圖 Storage 路徑（nullable） |

### `expedition_counties`（多對多）

| 欄位 | 說明 |
|------|------|
| `expedition_id` | FK → expeditions.id |
| `county` | 經過的縣市名稱 |

### `gpx_files` / `map_files` / `records`

| 欄位 | 說明 |
|------|------|
| `expedition_id` | FK → expeditions.id |
| `filename` | 顯示名稱 |
| `file_path` | Supabase Storage 路徑 |

### `sync_logs`

| 欄位 | 說明 |
|------|------|
| `synced_at` | 同步時間戳 |
| `trigger` | `schedule` / `workflow_dispatch` / `local` |
| `status` | `success` / `partial` / `failed` |
| `new_count` / `existing_count` / `skipped_count` / `error_count` | 各類數量 |
| `errors` | jsonb，錯誤詳情陣列 |

## 本地開發

```bash
npm install
```

建立 `.env.local`：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 部署（Render）

在 Render dashboard 的 Environment 設定：

| 變數 | 說明 |
|------|------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | anon（public）key，唯讀 |

資料由 sttmountain 的 normalize.py 寫入 Supabase，部署不包含任何資料檔案。

如果前端需要新的 DB 欄位或 RPC 參數，流程是：

1. 在 `sttmountain` 新增 migration 與文件。
2. 先套 dev DB 並驗證 `sync_drive.py` / `normalize.py`。
3. 再套 prod DB。
4. 最後在 `sttmountaincrazy` 使用新的 frontend contract。

## 型別檢查

```bash
npx tsc --noEmit
```

## CI 驗證

每個 PR 到 `main` 都會自動跑以下驗證，全部通過才能 merge：

| 驗證 | 指令 | 抓什麼問題 |
|------|------|-----------|
| TypeScript 型別檢查 | `npx tsc --noEmit` | 型別不符、import 路徑錯誤 |
| ESLint | `npm run lint` | 程式碼風格、潛在 bug、React Hooks 規則 |

merge 進 `main` 後另外跑：

| 步驟 | 說明 |
|------|------|
| Docker build + push | 確認 `Dockerfile` 語法正確、`npm run build` 可完成 |
| Render | 偵測新 image 後自動重新部署 |

## 開發流程

`main` 和 `develop` 受 GitHub branch ruleset 保護（設定日期：2025-05-20）：不可直接 push，必須走 PR；`main` 另要求 `lint-and-type-check` job 通過。

```
feature/<scope>-<desc>  →  develop  →  main
fix/<scope>-<desc>      →  develop
hotfix/<desc>           →  main + develop
```

Commit 格式遵循 Conventional Commits，詳見 `AGENTS.md`。
