# Database Contract

`sttmountain` is the source of truth for Supabase SQL. This document records only the frontend contract consumed by `sttmountaincrazy`.

## Source of Truth

| Repo | Owns |
| --- | --- |
| `sttmountain` | DB schema, migrations, RPC, sync scripts, storage writes |
| `sttmountaincrazy` | Frontend pages, API routes, map UI, storage redirects |

Do not add SQL migrations to this repo.

## Required Environment Variables

```text
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Server-only service keys must not be exposed to browser code.

## RPC

| RPC | Purpose | Auth |
| --- | --- | --- |
| `list_expeditions(p_q, p_county, p_counties, p_start, p_end, p_page, p_page_size, p_grade, p_sort)` | List filtering, sorting, and pagination. Only returns expeditions with an approved leader. | anon |
| `get_expedition_dates()` | Available expedition date range | anon |
| `get_expedition_years()` | Years that currently have expedition rows | anon |
| `list_unclaimed_expeditions()` | Expeditions without an approved leader. Returns `claim_status: 'unclaimed' \| 'pending'` per row. | authenticated |
| `submit_expedition_claim(p_expedition_id, p_evidence)` | Submit a pending leader claim for an expedition | authenticated |
| `list_pending_claims()` | List all pending leader claims with claimant info | staff only |
| `review_expedition_claim(p_claim_id, p_action)` | Approve or reject a pending claim (`p_action`: `'approved'` \| `'rejected'`) | staff only |
| `update_expedition(p_id, p_name, p_grade, p_date_start, ...)` | Update expedition fields. Sets `sync_locked = true`; only staff may pass `sync_locked = false`. | approved leader or staff |

`list_expeditions()` returns:

```text
{ expeditions, total, page, pageSize }
```

Each expedition row used by the frontend should include:

```text
id, name, grade, date_start, date_end,
region_entry_county, region_entry_town,
region_exit_county, region_exit_town,
leader, preview_image,
gpx_count, map_count, rec_count
```

`get_expedition_years()` returns a descending array of years:

```text
[2026, 2024]
```

It should only include years with at least one expedition. Do not synthesize missing intermediate years in the frontend.

## Detail Page Data

Detail pages read an expedition and related rows:

```text
expeditions            (includes transport, keeper, participants, sync_locked)
gpx_files
map_files
record_files           (renamed from records in migration 0019)
expedition_counties
```

Files are opened through local API routes, which redirect to Supabase Storage public URLs.

## Membership Tables

### `user_profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `auth.users.id` | unique |
| `role` | `member_role` enum | `staff \| member \| newcomer \| partner` |
| `name` | `text` nullable | 真實姓名 |
| `nickname` | `text` nullable | 暱稱 |
| `contact` | `text` nullable | 聯絡資訊 |
| `avatar_url` | `text` nullable | 頭像 URL |
| `joined_at` | `timestamptz` nullable | 入社日期 |
| `created_at` | `timestamptz` | default `now()` |

Frontend reads `user_profiles` via the browser-side auth client (RLS-governed, anon key).  
Server-side staff client must NOT be used to read `user_profiles` unless explicitly needed.

### `expedition_members`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` PK | |
| `expedition_id` | `bigint` FK → `expeditions.id` | |
| `user_id` | `uuid` FK → `auth.users.id` | |
| `role` | `text` | `'leader'` \| `'member'` |
| `status` | `text` | `'pending'` \| `'approved'` \| `'rejected'` |
| `evidence` | `text` nullable | 認領申請佐證說明 |
| `created_at` | `timestamptz` | default `now()` |

Used for the claim workflow and determining which expeditions appear in public listing.

For role types, helper functions, and component usage, see [membership.md](membership.md).  
For the migration SQL, see [db-migration-report-membership.md](db-migration-report-membership.md) and [db-migration-report-claims.md](db-migration-report-claims.md).

## Change Process

1. Add or update SQL/RPC in `sttmountain`.
2. Ask the DB staff to run the migration in dev Supabase.
3. Verify dev data and RPC output.
4. Run the same migration in prod Supabase.
5. Update this repo to consume the new contract.
