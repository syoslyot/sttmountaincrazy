# Architecture

`sttmountaincrazy` 是前端展示 repo。它不負責匯入資料，也不維護 Supabase schema；資料來源與 DB migration 由 `sttmountain` 負責。

## Runtime Flow

```text
Browser
  -> Next.js pages / route handlers
  -> Supabase RPC or Storage redirect
  -> Supabase DB / Storage
```

`/formal`、`/rocket`、`/hangbao` 是不同展示風格。它們可以共享 DB contract，但 UI、CSS、互動模式應各自維護，避免一個 theme 的調整意外影響另一個 theme。

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
| `lib/supabase.ts` | Supabase client and data helpers |
| `styles/` | Global and theme-level CSS |

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
