-- Registration Status Control: 3-state toggle (soon, open, closed)
--
-- File: supabase/migrations/20261019050000_create_registration_settings.sql
-- Order: Apply FIFTH (after 20261019040000_clear_all_registrations_where_true.sql).
-- Safe to re-run: Yes (uses IF NOT EXISTS, DROP POLICY IF EXISTS, DROP TRIGGER IF EXISTS).
--
-- Features:
-- 1. Table public.registration_settings with single row (id = 'current'):
--    - id text primary key default 'current'
--    - status text not null default 'soon' check (status in ('soon', 'open', 'closed'))
--    - updated_at timestamptz not null default now()
--    - updated_by text
-- 2. RLS enabled:
--    - SELECT: granted to anon and authenticated (public can read the current status)
--    - UPDATE: granted to authenticated admins (all signed-in users can toggle status)
--    - INSERT / DELETE: revoked from all clients
-- 3. Trigger updates updated_at and updated_by from JWT claims on change.

create table if not exists public.registration_settings (
    id text primary key default 'current',
    status text not null default 'soon' check (status in ('soon', 'open', 'closed')),
    updated_at timestamptz not null default now(),
    updated_by text
);

-- Seed initial row as 'soon' if not already present
insert into public.registration_settings (id, status)
values ('current', 'soon')
on conflict (id) do nothing;

alter table public.registration_settings enable row level security;

-- Revoke default privileges
revoke all on public.registration_settings from anon, authenticated;

-- Grants
grant select (id, status, updated_at, updated_by) on public.registration_settings to anon, authenticated;
grant update (status) on public.registration_settings to authenticated;

-- SELECT policy: anyone can read the registration status
drop policy if exists "anyone can read registration_settings" on public.registration_settings;
create policy "anyone can read registration_settings"
    on public.registration_settings for select
    using (true);

-- UPDATE policy: any authenticated admin can update registration status
drop policy if exists "authenticated admins can update registration_settings" on public.registration_settings;
create policy "authenticated admins can update registration_settings"
    on public.registration_settings for update
    to authenticated
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated' and status in ('soon', 'open', 'closed'));

-- Trigger function: automatically records timestamp and editor email on update
create or replace function public.touch_registration_settings()
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

-- Revoke client API execution of the internal trigger function
revoke execute on function public.touch_registration_settings() from public, anon, authenticated;

drop trigger if exists registration_settings_touch on public.registration_settings;
create trigger registration_settings_touch
    before update on public.registration_settings
    for each row
    execute function public.touch_registration_settings();
