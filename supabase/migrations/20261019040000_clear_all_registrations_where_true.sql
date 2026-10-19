-- Registration Admin Upgrade (d): Add WHERE true to clear_all_registrations
--
-- File: supabase/migrations/20261019040000_clear_all_registrations_where_true.sql
-- Order: Apply FOURTH (after 20261019030000_registrations_functions.sql).
-- Safe to re-run: Yes (uses CREATE OR REPLACE FUNCTION).
--
-- Rationale:
-- Unqualified DELETE statements (delete from table without a WHERE clause)
-- can be rejected by Supabase API sessions and safety extensions (e.g. pg_safeupdate).
-- Adding 'where true' satisfies the WHERE-clause requirement while maintaining
-- identical bulk-deletion behaviour and performance.

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
        where true
        returning 1
    )
    select count(*)::int into deleted_count from deleted;

    return deleted_count;
end;
$$;

revoke execute on function public.clear_all_registrations() from public, anon;
grant execute on function public.clear_all_registrations() to authenticated;
