# Architecture

`sttmountaincrazy` 是成大山協網站的主要使用者介面 repo。它不負責匯入資料，也不維護 Supabase schema；資料來源與 DB migration 由 `sttmountain` 負責。

本機開成大山協網站時，應啟動這個 repo，網址通常是 `http://localhost:3000`。`sttmountain` repo 內的 `http://localhost:8000` 是 legacy FastAPI/Jinja app，主要保留給舊頁面檢查與匯入流程輔助，不是目前主要網站入口。

## Runtime Flow

```text
Browser
  -> Next.js pages / route handlers
  -> Supabase RPC or Storage redirect
  -> Supabase DB / Storage
```

`/formal`、`/rocket`、`/hangbao` 是不同介面風格。它們可以共享 DB contract，但 UI、CSS、互動模式應各自維護，避免一個 theme 的調整意外影響另一個 theme。

## Directory Guide

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router pages and route handlers |
| `app/api/expeditions/route.ts` | Expedition list/detail/date API facade |
| `app/api/gpx/route.ts` | Redirects GPX/KML files to Supabase Storage |
| `app/api/pdf/route.ts` | Redirects map PDFs/images to Supabase Storage |
| `app/api/preview/route.ts` | Redirects preview images to Supabase Storage |
| `components/themes/formal/` | formal theme UI and map components |
| `components/themes/rocket/` | rocket theme UI and map components |
| `components/themes/hangbao/` | hangbao theme UI and map components |
| `lib/supabase.ts` | Supabase client and data helpers (server-side, service key) |
| `lib/auth.ts` | Browser-side auth client, membership helpers, expedition edit helpers |
| `styles/` | Global and theme-level CSS |

## Auth & Access Control

| 頁面 / 功能 | 需要登入 | 守門方式 |
| --- | --- | --- |
| `/formal`、`/formal/[id]`、`/rocket`、`/hangbao`、`/hangbao/[id]`、`/expedition/[id]` | 否 | 公開頁面 |
| `/formal/claim` — 瀏覽未認領清單 | 否 | 資料公開；submit 前 modal 會 check `!user` |
| `/formal/claim` — 送出認領 | 是 | UI: `if (!user) return`；RPC: authenticated + NULL uid guard |
| `/formal/claim` — Staff 審核區 | staff only | UI: `role === 'staff'`；RPC: staff check + NULL uid guard |
| `/formal/member` | 是 | `useAuth()` 無 user → `router.replace('/login')` |
| `/formal/[id]/edit` | approved leader / can\_edit member / staff | client-side auth guard；所有寫入 RPC 皆有伺服器驗證 |

`role` 值來自 `AuthProvider` → `fetchUserProfile` → Supabase RLS，使用者無法在瀏覽器端竄改。

所有資料寫入操作（更新隊伍、同步成員、儲存圖文、審核認領）皆透過 `SECURITY DEFINER` RPC 執行，RPC 內部再次驗證呼叫者身份。詳見 [database-contract.md](database-contract.md) 的 RLS 規則。

## Data Ownership

Frontend code may read:

- public Supabase RPC results;
- public Storage files;
- server-side detail query results through route/page logic.

Frontend code must not own:

- SQL migration files;
- RLS policy definitions;
- table creation scripts;
- sync or normalize logic.

If a feature needs new DB data, change `sttmountain` first and document the contract in [database-contract.md](database-contract.md).

## Theme Boundaries

Theme components should stay inside their theme directory unless they are generic enough to be used without visual assumptions.

Examples:

- `FormalMapLibre3D.tsx` stays formal-specific.
- `RocketLeafletMap.tsx` stays rocket-specific.
- A purely data-oriented hook can live under `lib/`.

Avoid moving visual behavior into shared helpers just because two themes happen to use similar data today.
