-- Voting settings and candidates for the "Best student presentation" contest.
--
-- File: supabase/migrations/20261115000000_create_voting_settings_candidates.sql
-- Order: Apply FIRST of the three voting migrations
--        (then 20261115000100_create_votes.sql,
--         then 20261115000200_create_voting_functions.sql).
-- Safe to re-run: Yes (IF NOT EXISTS, DROP POLICY IF EXISTS, DROP TRIGGER IF EXISTS).
--
-- Run manually in the Supabase SQL Editor — this project is not linked to the
-- Supabase CLI. Do not run against the live database until you are ready for
-- voting to appear on the site.
--
-- What this creates:
-- 1. public.voting_settings — a single row (id = 'current') holding the contest
--    status (soon | open | closed) and whether live results are shown while open.
-- 2. public.voting_candidates — the presentations people can vote for. This table
--    deliberately stores only id / position / active. Titles, presenter names and
--    photos live in lib/voting-candidates.json, because they are render data, not
--    vote data, and must never be editable through the API.
--
-- Privileges:
--   - anon and authenticated may SELECT only the columns listed below from
--     voting_settings (the page needs status + live_results).
--   - authenticated may UPDATE only status and live_results.
--   - anon and authenticated get NO privileges on voting_candidates.
--     Only the seed script / dashboard (owner) may write it.

-- ---- Settings ---------------------------------------------------------------

create table if not exists public.voting_settings (
    id text primary key default 'current',
    status text not null default 'soon' check (status in ('soon', 'open', 'closed')),
    live_results boolean not null default false,
    updated_at timestamptz not null default now(),
    updated_by text
);

-- Seed the single row as 'soon' if it is missing.
insert into public.voting_settings (id, status)
values ('current', 'soon')
on conflict (id) do nothing;

alter table public.voting_settings enable row level security;

-- Revoke default Supabase grants, then grant back only what is needed.
revoke all on public.voting_settings from public, anon, authenticated;

grant select (id, status, live_results, updated_at, updated_by)
    on public.voting_settings to anon, authenticated;

grant update (status, live_results)
    on public.voting_settings to authenticated;

-- SELECT policy: anyone may read the status and the live-results flag.
drop policy if exists "anyone can read voting_settings" on public.voting_settings;
create policy "anyone can read voting_settings"
    on public.voting_settings for select
    using (true);

-- UPDATE policy: any signed-in user may change the status and live-results flag.
-- (There is no separate voting-admin list, by design: any signed-in admin can
-- run the contest, same as the registration status control.)
drop policy if exists "authenticated admins can update voting_settings" on public.voting_settings;
create policy "authenticated admins can update voting_settings"
    on public.voting_settings for update
    to authenticated
    using (auth.role() = 'authenticated')
    with check (
        auth.role() = 'authenticated'
        and status in ('soon', 'open', 'closed')
    );

-- Trigger: record updated_at and the editor's email on every update.
create or replace function public.touch_voting_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.updated_at := now();
    new.updated_by := lower(
        json_extract_path_text(
            current_setting('request.jwt.claims', true)::json,
            'email'
        )
    );
    if new.updated_by is null or btrim(new.updated_by) = '' then
        new.updated_by := 'dashboard';
    end if;
    return new;
end;
$$;

-- The trigger function is internal; no client needs to call it directly.
revoke execute on function public.touch_voting_settings() from public, anon, authenticated;

drop trigger if exists voting_settings_touch on public.voting_settings;
create trigger voting_settings_touch
    before update on public.voting_settings
    for each row
    execute function public.touch_voting_settings();

-- ---- Candidates -------------------------------------------------------------

create table if not exists public.voting_candidates (
    id text primary key,
    position integer not null default 0,
    active boolean not null default true
);

alter table public.voting_candidates enable row level security;

-- No client privileges at all. The public page renders the candidate list from
-- lib/voting-candidates.json; tallies come from voting_results().
revoke all on public.voting_candidates from public, anon, authenticated;

-- ---- Verification queries (run after applying; comments only) ---------------
--
-- 1. The settings row exists and starts closed to the public:
--      select id, status, live_results from public.voting_settings;
--    Expected: exactly one row, id = 'current', status = 'soon',
--    live_results = false.
--
-- 2. Column-level SELECT grants on the settings table:
--      select grantee, privilege_type, column_name
--      from information_schema.column_privileges
--      where table_schema = 'public'
--        and table_name = 'voting_settings'
--        and grantee in ('anon', 'authenticated')
--      order by grantee, privilege_type, column_name;
--    Expected: anon has SELECT on id, status, live_results, updated_at,
--    updated_by (5 rows). authenticated has the same 5 SELECT rows plus
--    UPDATE on status and live_results (2 rows). No INSERT or DELETE rows
--    for either role. (role_table_grants shows 0 rows for both roles here,
--    because every grant is column-level.)
--
-- 3. No table privileges on voting_candidates:
--      select grantee, privilege_type
--      from information_schema.role_table_grants
--      where table_schema = 'public'
--        and table_name = 'voting_candidates'
--        and grantee in ('anon', 'authenticated');
--    Expected: 0 rows.
--
-- 4. RLS is on for both tables:
--      select relname, relrowsecurity
--      from pg_class
--      where oid in ('public.voting_settings'::regclass,
--                    'public.voting_candidates'::regclass);
--    Expected: both rows show relrowsecurity = true.
