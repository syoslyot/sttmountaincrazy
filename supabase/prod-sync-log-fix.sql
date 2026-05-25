-- Run this in the production Supabase SQL editor.
-- It makes the sync tables match the Google Drive sync scripts.
-- Keep service_role as the writer; do not expose sync logs to anon clients.

create table if not exists public.sync_state (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into public.sync_state (key, value)
values ('last_synced_at', '1970-01-01T00:00:00+00:00')
on conflict (key) do nothing;

create table if not exists public.sync_logs (
  id bigserial primary key,
  synced_at timestamptz not null default now(),
  trigger text,
  status text not null default 'success',
  new_count integer not null default 0,
  existing_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  log_text text,
  created_at timestamptz not null default now()
);

alter table public.sync_logs
  add column if not exists synced_at timestamptz not null default now(),
  add column if not exists trigger text,
  add column if not exists status text not null default 'success',
  add column if not exists new_count integer not null default 0,
  add column if not exists existing_count integer not null default 0,
  add column if not exists skipped_count integer not null default 0,
  add column if not exists error_count integer not null default 0,
  add column if not exists errors jsonb not null default '[]'::jsonb,
  add column if not exists log_text text,
  add column if not exists created_at timestamptz not null default now();

alter table public.records
add column if not exists file_path text;

alter table public.sync_state enable row level security;
alter table public.sync_logs enable row level security;

grant all on table public.sync_state to service_role;
grant all on table public.sync_logs to service_role;
grant usage, select on sequence public.sync_logs_id_seq to service_role;

-- Optional dashboard check:
-- select relname, relrowsecurity
-- from pg_class
-- where relname in ('sync_state', 'sync_logs');
