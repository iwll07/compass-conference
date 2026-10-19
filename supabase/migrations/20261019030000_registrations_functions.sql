-- Registration Admin Upgrade (c): Summary and search functions
--
-- File: supabase/migrations/20261019030000_registrations_functions.sql
-- Order: Apply THIRD among the registrations admin upgrade migrations.
-- Safe to re-run: Yes (uses CREATE OR REPLACE FUNCTION, REVOKE/GRANT).
--
-- Changes:
-- 1. registration_summary():
--    - Returns total count, counts by university (highest count first),
--      and counts by academic year in canonical order (First Year ... Graduate).
--    - JSON output format:
--      {
--        "total": <number>,
--        "by_university": [ {"university": "...", "count": <number>}, ... ],
--        "by_academic_year": [ {"academic_year": "...", "count": <number>}, ... ]
--      }
--    - security invoker so RLS policies on public.registrations apply.
-- 2. search_registrations(q, university, academic_year, nationality, limit, offset):
--    - Fully parameterised SQL queries against public.registrations.
--    - Performs case-insensitive substring search across full_name, email, or phone.
--    - Phone normalisation in search: strips spaces, dashes, dots, parens, and any leading '0',
--      so typing e.g. "01012345678" or "1012345678" matches stored "+201012345678".
--    - Exact match filters on university, academic_year, nationality (or all when null/empty).
--    - Returns table with matching rows, plus total_count (count(*) over()).
--    - security invoker so caller permissions and RLS apply.
-- 3. Security & Grants:
--    - Revoke execute from public and anon.
--    - Grant execute to authenticated only.

create or replace function public.registration_summary()
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
    result json;
begin
    select json_build_object(
        'total', (select count(*)::int from public.registrations),
        'by_university', coalesce((
            select json_agg(u_row)
            from (
                select
                    university,
                    count(*)::int as count
                from public.registrations
                group by university
                order by count(*) desc, university asc
            ) u_row
        ), '[]'::json),
        'by_academic_year', coalesce((
            select json_agg(y_row)
            from (
                select
                    academic_year,
                    count(*)::int as count
                from public.registrations
                group by academic_year
                order by case academic_year
                    when 'First Year' then 1
                    when 'Second Year' then 2
                    when 'Third Year' then 3
                    when 'Fourth Year' then 4
                    when 'Fifth Year' then 5
                    when 'Intern' then 6
                    when 'Graduate' then 7
                    else 8
                end asc
            ) y_row
        ), '[]'::json)
    ) into result;

    return result;
end;
$$;

create or replace function public.search_registrations(
    q text default null,
    p_university text default null,
    p_academic_year text default null,
    p_nationality text default null,
    p_limit int default 25,
    p_offset int default 0
)
returns table (
    id uuid,
    created_at timestamptz,
    full_name text,
    email text,
    phone text,
    nationality text,
    nationality_other text,
    university text,
    university_other text,
    academic_year text,
    total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
    clean_q text := btrim(coalesce(q, ''));
    phone_digits text;
begin
    -- Strip common non-digits and leading 0 for phone matching
    if clean_q <> '' then
        phone_digits := regexp_replace(clean_q, '[^0-9]', '', 'g');
        if phone_digits like '0%' then
            phone_digits := substring(phone_digits from 2);
        end if;
    else
        phone_digits := '';
    end if;

    return query
    select
        r.id,
        r.created_at,
        r.full_name,
        r.email,
        r.phone,
        r.nationality,
        r.nationality_other,
        r.university,
        r.university_other,
        r.academic_year,
        count(*) over() as total_count
    from public.registrations r
    where
        -- Text search filter
        (
            clean_q = ''
            or r.full_name ilike '%' || clean_q || '%'
            or r.email ilike '%' || clean_q || '%'
            or (phone_digits <> '' and r.phone like '%' || phone_digits || '%')
        )
        -- University filter
        and (
            p_university is null
            or p_university = ''
            or r.university = p_university
        )
        -- Academic year filter
        and (
            p_academic_year is null
            or p_academic_year = ''
            or r.academic_year = p_academic_year
        )
        -- Nationality filter
        and (
            p_nationality is null
            or p_nationality = ''
            or r.nationality = p_nationality
        )
    order by r.created_at desc, r.id desc
    limit coalesce(p_limit, 25)
    offset coalesce(p_offset, 0);
end;
$$;

-- Explicitly revoke execute from public and anon, grant to authenticated only
revoke execute on function public.registration_summary() from public, anon;
grant execute on function public.registration_summary() to authenticated;

revoke execute on function public.search_registrations(text, text, text, text, int, int) from public, anon;
grant execute on function public.search_registrations(text, text, text, text, int, int) to authenticated;
