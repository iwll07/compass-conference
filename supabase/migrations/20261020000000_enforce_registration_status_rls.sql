-- Enforce Registration Status via Row-Level Security
--
-- File: supabase/migrations/20261020000000_enforce_registration_status_rls.sql
-- Depends on: 20261018000000_create_registrations.sql, 20261019050000_create_registration_settings.sql
--
-- Safe to re-run: Yes
--   - Uses CREATE OR REPLACE FUNCTION
--   - Uses DROP POLICY IF EXISTS before creating policies
--   - Idempotent GRANT and REVOKE statements
--
-- What this does:
-- 1. Creates `public.registration_is_open()`:
--    - Returns boolean (true if registration_settings has status = 'open' for id = 'current').
--    - STABLE, SECURITY DEFINER, SET search_path = public.
--    - Executable by `anon` and `authenticated`; revoked from `public`.
--
-- 2. Replaces the open INSERT policy on `public.registrations`:
--    - Drops the old permissive policy "anyone can register".
--    - Creates "anon can register when open" for role `anon` WITH CHECK (public.registration_is_open()).
--    - Creates "authenticated can register in preview" for role `authenticated` WITH CHECK (true),
--      allowing signed-in admins to test submissions regardless of public registration status.
--
-- 3. Column-level insert grants remain unchanged (anon and authenticated can only insert the 8 permitted columns).

-- 1. Helper function: registration_is_open()
create or replace function public.registration_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (select status = 'open' from public.registration_settings where id = 'current'),
        false
    );
$$;

revoke execute on function public.registration_is_open() from public;
grant execute on function public.registration_is_open() to anon, authenticated;

-- 2. Drop existing permissive INSERT policy
drop policy if exists "anyone can register" on public.registrations;
drop policy if exists "anon can register when open" on public.registrations;
drop policy if exists "authenticated can register in preview" on public.registrations;

-- 3. Create role-specific INSERT policies
-- Anon role: only permitted when registration is open
create policy "anon can register when open"
    on public.registrations
    for insert
    to anon
    with check (public.registration_is_open());

-- Authenticated role: permitted in any status (e.g. admin form preview)
create policy "authenticated can register in preview"
    on public.registrations
    for insert
    to authenticated
    with check (true);
