# sttmountaincrazy

成大山協網站。這個 repo 負責前端體驗、API route、地圖互動與部署設定；資料庫 schema、RPC、同步腳本與 migration 由 [`sttmountain`](https://github.com/syoslyot/sttmountain) 維護。

## Quick Start

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

本機需要 `.env.local`：

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`NEXT_PUBLIC_` 前綴讓 Next.js 將值暴露給 browser bundle，供登入、認領等前端 auth 操作使用。Render 部署時需同步設定這兩個變數。

## App Entrypoints

| 入口 | 說明 |
| --- | --- |
| `/` | 隨機導向其中一種介面風格 |
| `/formal` | formal 風格首頁 |
| `/formal/[id]` | formal 詳細頁 |
| `/formal/[id]/edit` | 編輯隊伍資料（approved leader 或 staff） |
| `/formal/claim` | 認領頁面（申請與審核） |
| `/formal/member` | 會員個人頁 |
| `/rocket` | rocket 風格首頁 |
| `/expedition/[id]` | rocket 詳細頁 |
| `/hangbao` | hangbao 風格首頁 |
| `/hangbao/[id]` | hangbao 詳細頁 |

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Supabase client
- Leaflet / MapLibre
- Tailwind CSS v4

## Useful Commands

```bash
npm run dev
npx tsc --noEmit
npm run lint
npm test          # Vitest unit tests (30 tests)
npm run test:watch
```

## Documentation

| 文件 | 內容 |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 開發流程、PR 規則、commit 規範 |
| [docs/architecture.md](docs/architecture.md) | 網站架構、資料流、目錄分工 |
| [docs/database-contract.md](docs/database-contract.md) | 前端依賴的 Supabase RPC 與資料 contract（含 RLS 規則） |
| [docs/deployment.md](docs/deployment.md) | Render、GitHub Actions、環境變數 |
| [docs/git-flow.md](docs/git-flow.md) | branch、release、hotfix 流程 |
| [docs/coding-style.md](docs/coding-style.md) | TypeScript、React、CSS 寫法慣例 |
| [docs/formal-theme.md](docs/formal-theme.md) | formal 風格與 UI 維護規則 |
| [docs/membership.md](docs/membership.md) | 會員系統、auth client、認領與編輯 helper |
| [docs/db-migration-report-claims.md](docs/db-migration-report-claims.md) | 認領系統 DB migration 記錄（含安全修正） |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 常見問題與排查步驟 |

## Repository Boundary

本 repo 不保存完整 DB schema，也不新增 Supabase migration。需要新增欄位、RPC 或權限時，流程是：

1. 在 `sttmountain` 新增 migration 與文件。
2. 由 DB 管理者手動套用 dev DB 並驗證。
3. 再套用 prod DB。
4. 最後在本 repo 使用新的 frontend contract。

`SUPABASE_SERVICE_KEY` 不可放入前端 repo 或瀏覽器端程式碼。

## Security Model

- 所有資料寫入皆透過 `SECURITY DEFINER` RPC 進行，RPC 內部驗證呼叫者身份
- 直接操作 `expedition_members` 表的 INSERT 受 RLS 限制（只能是 `role=leader/status=pending`）
- 編輯頁面 `/formal/[id]/edit` 有 client-side auth guard，未授權者會 redirect
- API routes 的檔案刪除操作同時驗證使用者身份與檔案歸屬的 `expedition_id`
- 詳見 [docs/database-contract.md](docs/database-contract.md) 的 RLS 規則章節
