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

| RPC | Purpose |
| --- | --- |
| `list_expeditions(p_q, p_county, p_counties, p_start, p_end, p_page, p_page_size, p_grade, p_sort)` | List filtering, sorting, and pagination |
| `get_expedition_dates()` | Available expedition date range |
| `get_expedition_years()` | Years that currently have expedition rows |

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
expeditions
gpx_files
map_files
records
expedition_counties
```

Files are opened through local API routes, which redirect to Supabase Storage public URLs.

## Change Process

1. Add or update SQL/RPC in `sttmountain`.
2. Ask the DB admin to run the migration in dev Supabase.
3. Verify dev data and RPC output.
4. Run the same migration in prod Supabase.
5. Update this repo to consume the new contract.
