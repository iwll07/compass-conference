-- Registration Admin Upgrade (b): Deletion audit log and trigger
--
-- File: supabase/migrations/20261019020000_registrations_deletion_log.sql
-- Order: Apply SECOND among the registrations admin upgrade migrations.
-- Safe to re-run: Yes (uses CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
--                DROP TRIGGER IF EXISTS, DROP POLICY IF EXISTS).
--
-- Changes:
-- 1. Create table public.registration_log:
--    - id uuid primary key default gen_random_uuid()
--    - deleted_at timestamptz default now() not null
--    - deleted_by text not null (JWT email or 'dashboard')
--    - registration_id uuid not null
--    - full_name text not null
--    * DATA PRIVACY: NEVER store email, phone, or any other sensitive registrant fields.
-- 2. AFTER DELETE trigger on public.registrations writes to registration_log.
--    Trigger function is security definer, set search_path = public, so it can write
--    to registration_log even though clients have zero INSERT privileges on it.
-- 3. Row Level Security on registration_log:
--    - RLS enabled.
--    - SELECT granted to authenticated, but restricted by policy strictly to 'fares9005@gmail.com'.
--    - Clients have NO INSERT, UPDATE, or DELETE grants on registration_log.

create table if not exists public.registration_log (
    id uuid primary key default gen_random_uuid(),
    deleted_at timestamptz default now() not null,
    deleted_by text not null,
    registration_id uuid not null,
    full_name text not null
);

alter table public.registration_log enable row level security;

-- Revoke all direct client modifications; clients must never directly write or mutate the audit log
revoke all on public.registration_log from anon, authenticated;
grant select on public.registration_log to authenticated;

-- SELECT policy: only fares9005@gmail.com can read the deletion log
drop policy if exists "fares can read registration deletion log" on public.registration_log;
create policy "fares can read registration deletion log"
    on public.registration_log for select
    to authenticated
    using (
        lower(
            json_extract_path_text(
                current_setting('request.jwt.claims', true)::json,
                'email'
            )
        ) = 'fares9005@gmail.com'
    );

-- Trigger function: logs registration deletions.
-- Uses security definer with explicit search_path = public so it runs with table owner
-- privileges to insert into registration_log without exposing INSERT grants to authenticated/anon.
create or replace function public.log_registration_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    actor text := lower(
        json_extract_path_text(
            current_setting('request.jwt.claims', true)::json,
            'email'
        )
    );
begin
    if actor is null or btrim(actor) = '' then
        actor := 'dashboard';
    end if;

    insert into public.registration_log (
        registration_id,
        deleted_by,
        full_name
    ) values (
        old.id,
        actor,
        old.full_name
    );

    return old;
end;
$$;

-- Trigger: fires AFTER DELETE for each row on public.registrations
drop trigger if exists registrations_deletion_audit on public.registrations;
create trigger registrations_deletion_audit
    after delete on public.registrations
    for each row
    execute function public.log_registration_deletion();
