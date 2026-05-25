-- Run this in Supabase SQL editor.
-- It adds a normalized grade column and updates list_expeditions() so filtering,
-- sorting, pagination, and file counts happen in one DB call.

create or replace function public.expedition_grade_from_name(p_name text)
returns text
language sql
immutable
as $$
  select nullif(upper(substring(coalesce(p_name, '') from '^[\[\［][0-9]+([A-Da-d])')), '')
$$;

alter table public.expeditions
add column if not exists grade text;

update public.expeditions
set grade = public.expedition_grade_from_name(name)
where grade is null
  and public.expedition_grade_from_name(name) is not null;

create or replace function public.set_expedition_grade()
returns trigger
language plpgsql
as $$
begin
  new.grade := public.expedition_grade_from_name(new.name);
  return new;
end;
$$;

drop trigger if exists expeditions_set_grade on public.expeditions;
create trigger expeditions_set_grade
before insert or update of name on public.expeditions
for each row
execute function public.set_expedition_grade();

create index if not exists expeditions_grade_idx
on public.expeditions (grade);

create index if not exists expeditions_date_start_idx
on public.expeditions (date_start);

create index if not exists expeditions_date_end_idx
on public.expeditions (date_end);

create index if not exists expedition_counties_county_expedition_id_idx
on public.expedition_counties (county, expedition_id);

create index if not exists gpx_files_expedition_id_idx
on public.gpx_files (expedition_id);

create index if not exists map_files_expedition_id_idx
on public.map_files (expedition_id);

create index if not exists records_expedition_id_idx
on public.records (expedition_id);

drop function if exists public.list_expeditions(text, text, text[], date, date, integer, integer);
drop function if exists public.list_expeditions(text, text, text[], date, date, integer, integer, text, text);

create or replace function public.list_expeditions(
  p_q text default '',
  p_county text default '',
  p_counties text[] default '{}'::text[],
  p_start date default null,
  p_end date default null,
  p_page integer default 1,
  p_page_size integer default 20,
  p_grade text default '',
  p_sort text default 'latest'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with filtered as (
  select e.*
  from public.expeditions e
  where
    (coalesce(p_q, '') = ''
      or e.name ilike '%' || p_q || '%'
      or e.leader ilike '%' || p_q || '%')
    and (coalesce(p_grade, '') = '' or e.grade = upper(p_grade))
    and (p_start is null or coalesce(e.date_end, e.date_start) >= p_start)
    and (p_end is null or e.date_start <= p_end)
    and (
      coalesce(p_county, '') = ''
      or exists (
        select 1
        from public.expedition_counties ec
        where ec.expedition_id = e.id
          and ec.county = p_county
      )
    )
    and (
      coalesce(array_length(p_counties, 1), 0) = 0
      or exists (
        select 1
        from public.expedition_counties ec
        where ec.expedition_id = e.id
          and ec.county = any(p_counties)
      )
    )
),
page_rows as (
  select *
  from filtered
  order by
    case when p_sort = 'oldest' then coalesce(date_end, date_start) end asc nulls last,
    case when p_sort <> 'oldest' then coalesce(date_end, date_start) end desc nulls last,
    id desc
  limit greatest(p_page_size, 1)
  offset greatest(p_page - 1, 0) * greatest(p_page_size, 1)
),
counts as (
  select
    p.id,
    (select count(*) from public.gpx_files gf where gf.expedition_id = p.id)::int as gpx_count,
    (select count(*) from public.map_files mf where mf.expedition_id = p.id)::int as map_count,
    (select count(*) from public.records rf where rf.expedition_id = p.id)::int as rec_count
  from page_rows p
)
select jsonb_build_object(
  'expeditions',
  coalesce(
    jsonb_agg(
      to_jsonb(p)
      || jsonb_build_object(
        'gpx_count', c.gpx_count,
        'map_count', c.map_count,
        'rec_count', c.rec_count
      )
      order by
        case when p_sort = 'oldest' then coalesce(p.date_end, p.date_start) end asc nulls last,
        case when p_sort <> 'oldest' then coalesce(p.date_end, p.date_start) end desc nulls last,
        p.id desc
    ),
    '[]'::jsonb
  ),
  'total', (select count(*) from filtered),
  'page', greatest(p_page, 1),
  'pageSize', greatest(p_page_size, 1)
)
from page_rows p
left join counts c on c.id = p.id;
$$;

grant execute on function public.list_expeditions(text, text, text[], date, date, integer, integer, text, text)
to anon, authenticated;

-- list_expeditions runs with the function owner's table privileges, so the
-- temporary hotfix grant for expedition_counties can be removed.
revoke select on table public.expedition_counties from anon, authenticated;
