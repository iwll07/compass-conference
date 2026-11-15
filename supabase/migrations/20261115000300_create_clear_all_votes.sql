-- Vote reset for the "Best student presentation" contest.
--
-- File: supabase/migrations/20261115000300_create_clear_all_votes.sql
-- Order: Apply FOURTH of the four voting migrations
--        (after 20261115000000_create_voting_settings_candidates.sql,
--         20261115000100_create_votes.sql and
--         20261115000200_create_voting_functions.sql).
-- Safe to re-run: Yes (CREATE OR REPLACE FUNCTION, REVOKE/GRANT).
--
-- Why this exists: clearing practice votes used to mean deleting rows from the
-- votes table by hand. This function gives the admin panel a "Reset all votes"
-- button that is gated to one verified email in the database, exactly like
-- public.clear_all_registrations(). Hiding the button in the UI is presentation;
-- the exception below is what actually stops anyone else.
--
-- What it does: deletes every row from public.votes and returns how many were
-- removed, so the admin panel can report "N votes deleted". Nothing else changes
-- — the contest status, the live-results flag and the candidate list are left
-- untouched.
--
-- Safe DELETE: the WHERE true clause keeps Supabase's pg_safeupdate extension
-- happy, the same reason clear_all_registrations() uses it.

create or replace function public.clear_all_votes()
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
        raise exception 'Unauthorized: Only fares9005@gmail.com is permitted to reset all votes.';
    end if;

    with deleted as (
        delete from public.votes
        where true
        returning 1
    )
    select count(*)::int into deleted_count from deleted;

    return deleted_count;
end;
$$;

-- Clients execute this through PostgREST, never directly on the table (which
-- has no privileges for anon or authenticated at all).
revoke execute on function public.clear_all_votes() from public, anon;
grant execute on function public.clear_all_votes() to authenticated;

-- ---- Verification queries (run after applying; comments only) ---------------
--
-- 1. The function exists as a security definer with a fixed search_path:
--      select p.proname, p.prosecdef as security_definer, p.proconfig
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public' and p.proname = 'clear_all_votes';
--    Expected: one row, security_definer = true, proconfig includes
--    search_path=public.
--
-- 2. EXECUTE is granted only to authenticated:
--      select routine_name, grantee, privilege_type
--      from information_schema.routine_privileges
--      where routine_schema = 'public'
--        and routine_name = 'clear_all_votes'
--      order by grantee;
--    Expected: rows for authenticated (and the owner / service_role). No row
--    with grantee = 'anon' or grantee = 'PUBLIC'.
--
-- 3. Anyone other than fares9005@gmail.com is refused. Run this while signed in
--    as a different admin in the SQL editor with a claim set, or from the app:
--      select public.clear_all_votes();
--    Expected for any other caller:
--      ERROR: Unauthorized: Only fares9005@gmail.com is permitted to reset all votes.
--
-- 4. The counts return to zero after a reset:
--      select public.voting_results();
--    Expected: total = 0 and every candidate's votes = 0.
