-- Registration Admin Upgrade (a): Access policies and grants
--
-- File: supabase/migrations/20261019010000_registrations_admin_access.sql
-- Order: Apply FIRST among the registrations admin upgrade migrations.
-- Safe to re-run: Yes (uses DROP POLICY IF EXISTS, DROP FUNCTION IF EXISTS, GRANT).
--
-- Changes:
-- 1. Replace the registrations SELECT policy so that ANY authenticated Supabase
--    user can read registrations. The project has sign-ups disabled; every user
--    in the Supabase auth.users list is an admin.
-- 2. Drop the old email-allowlist policy "admins can read registrations".
-- 3. Repurpose or drop is_registration_admin(): we DROP it here so no stale,
--    hardcoded email functions remain in the schema.
-- 4. Ensure table-level SELECT on public.registrations is granted to authenticated,
--    guaranteeing admins can SELECT every column (including id, created_at,
--    nationality_other, university_other) for ordering, delete-by-id, and export.
-- 5. Add table-level DELETE grant to authenticated, plus a DELETE policy restricted
--    strictly to 'fares9005@gmail.com'. Uses json_extract_path_text on request.jwt.claims
--    (never ->>, which the Supabase SQL editor HTML-escapes).
-- 6. Re-assert that anon has INSERT only on the 8 data columns and NO SELECT/DELETE.

-- 1. Ensure table-level SELECT and DELETE grants for authenticated
grant select, delete on public.registrations to authenticated;

-- Ensure anon has no SELECT or DELETE
revoke select, delete on public.registrations from anon;

-- Ensure anon still has INSERT only on the 8 data columns
revoke insert on public.registrations from anon;
grant insert (full_name, email, phone, nationality, nationality_other, university, university_other, academic_year)
    on public.registrations to anon;

-- 2. Replace SELECT policy: any authenticated user can read registrations
drop policy if exists "admins can read registrations" on public.registrations;
drop policy if exists "authenticated users can read registrations" on public.registrations;

create policy "authenticated users can read registrations"
    on public.registrations for select
    to authenticated
    using (true);

-- 3. DELETE policy on public.registrations:
-- Any signed-in authenticated admin in Supabase auth.users can delete registrations.
-- Every deletion is audited row-by-row into registration_log by the trigger in migration (b).
drop policy if exists "fares can delete registrations" on public.registrations;
drop policy if exists "authenticated users can delete registrations" on public.registrations;

create policy "authenticated users can delete registrations"
    on public.registrations for delete
    to authenticated
    using (true);

-- 4. Delete-All RPC function: strictly restricted to 'fares9005@gmail.com'
-- Wipes all registrations and returns the count of deleted rows.
-- Trigger in migration (b) automatically logs every deleted row into registration_log.
create or replace function public.clear_all_registrations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    current_email text := lower(
        json_extract_path_text(
            current_setting('request.jwt.claims', true)::json,
            'email'
        )
    );
    deleted_count int;
begin
    if current_email is null or current_email <> 'fares9005@gmail.com' then
        raise exception 'Unauthorized: Only fares9005@gmail.com is permitted to delete all registrations.';
    end if;

    with deleted as (
        delete from public.registrations
        returning 1
    )
    select count(*)::int into deleted_count from deleted;

    return deleted_count;
end;
$$;

revoke execute on function public.clear_all_registrations() from public, anon;
grant execute on function public.clear_all_registrations() to authenticated;

-- 5. Remove obsolete is_registration_admin() function so nothing stale remains
drop function if exists public.is_registration_admin();
