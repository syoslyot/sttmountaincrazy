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
- **詳細頁**：server-side Supabase query（expeditions + gpx_files + map_files + records + expedition_counties）
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

## 資料庫 Contract

資料庫的 source of truth 在 `sttmountain`：

- `sttmountain/db/schema.sql`：目前完整 schema
- `sttmountain/db/migrations/`：既有 dev/prod DB 的版本化 SQL 變更
- `sttmountain/docs/database.md`：migration、dev/prod 套用與驗證流程

本 repo 不保存完整 DB schema，避免前端 repo 和 DB repo 各自維護 SQL 後產生 drift。這裡只記錄前端依賴的 contract。

### RPC

| RPC | 用途 |
|---|---|
| `list_expeditions(p_q, p_county, p_counties, p_start, p_end, p_page, p_page_size, p_grade, p_sort)` | 列表篩選、排序、分頁 |
| `get_expedition_dates()` | 首頁年份/日期範圍 |
| `get_expedition_years()` | formal 首頁實際有資料的年份清單 |

`list_expeditions()` 回傳：

```text
{ expeditions, total, page, pageSize }
```

每筆 expedition 至少需要：

```text
id, name, grade, date_start, date_end,
region_entry_county, region_entry_town,
region_exit_county, region_exit_town,
leader, preview_image,
gpx_count, map_count, rec_count
```

詳細頁仍透過 server-side Supabase query 讀取 `expeditions` 及相關檔案表；若需要新增欄位或 RPC 參數，先在 `sttmountain` 建 migration 並套用 dev/prod，再修改本 repo。

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
