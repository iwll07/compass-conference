-- Voting functions for the "Best student presentation" contest.
--
-- File: supabase/migrations/20261115000200_create_voting_functions.sql
-- Order: Apply THIRD of the three voting migrations
--        (after 20261115000000_create_voting_settings_candidates.sql and
--         20261115000100_create_votes.sql).
-- Safe to re-run: Yes (CREATE OR REPLACE FUNCTION, REVOKE/GRANT).
--
-- What this creates:
--
-- 1. public.cast_vote(p_candidate_id text, p_phone text) returns text
--    The only way a vote can be written. Returns one of:
--      'ok'            — vote recorded
--      'closed'        — status is not 'open'
--      'invalid'       — unknown/inactive candidate, or bad phone format
--      'not_registered'— no registration with that phone
--      'already_voted' — this voter_key already has a row in votes
--    Checks run in that order. It returns only the code — never registration
--    data, never a voter key.
--
-- 2. public.voting_results() returns json
--    {status, live_results, total, candidates: [{id, votes}]}
--    Signed-in callers always get counts. Anonymous callers get counts only
--    when status = 'closed', or status = 'open' and live_results = true.
--    Otherwise candidates = [] and total = 0.
--
-- Both run as the table owner (security definer) with a fixed search_path, so
-- they can reach votes / voting_candidates / registrations while anon cannot.
-- EXECUTE is revoked from PUBLIC and granted only to anon and authenticated.

-- ---- cast_vote --------------------------------------------------------------

create or replace function public.cast_vote(
    p_candidate_id text,
    p_phone text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status text;
    v_phone text;
begin
    -- 1. Voting must be open.
    select status into v_status
    from public.voting_settings
    where id = 'current';

    if v_status is distinct from 'open' then
        return 'closed';
    end if;

    -- 2. The candidate must exist and be active.
    if not exists (
        select 1
        from public.voting_candidates
        where id = p_candidate_id
          and active
    ) then
        return 'invalid';
    end if;

    -- 3. The phone must be in the canonical +20 format. The client sends
    --    normalizeEgyptianPhone() output, so anything else is a bad request.
    v_phone := btrim(p_phone);

    if v_phone is null or v_phone !~ '^\+20(10|11|12|15)[0-9]{8}$' then
        return 'invalid';
    end if;

    -- 4. The phone must belong to a registration.
    if not exists (
        select 1
        from public.registrations
        where phone = v_phone
    ) then
        return 'not_registered';
    end if;

    -- 5. Record the vote. The voter_key is a one-way hash of the normalised
    --    phone plus a fixed contest salt; the phone never lands in the table.
    --    ON CONFLICT DO NOTHING makes a second vote a no-op, even under a race.
    insert into public.votes (voter_key, candidate_id)
    values (
        encode(
            sha256(convert_to(v_phone || ':compass-2026-vote', 'utf8')),
            'hex'
        ),
        p_candidate_id
    )
    on conflict (voter_key) do nothing;

    if not found then
        return 'already_voted';
    end if;

    return 'ok';
end;
$$;

-- ---- voting_results ---------------------------------------------------------

create or replace function public.voting_results()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_status text;
    v_live boolean;
    v_role text;
    v_total bigint;
    v_candidates json;
begin
    select status, live_results
    into v_status, v_live
    from public.voting_settings
    where id = 'current';

    v_status := coalesce(v_status, 'soon');
    v_live := coalesce(v_live, false);

    -- Deliberately json_extract_path_text, never ->> : the Supabase SQL Editor
    -- HTML-escapes ->> into -&gt;&gt; and breaks the function on paste.
    v_role := json_extract_path_text(
        current_setting('request.jwt.claims', true)::json,
        'role'
    );

    -- Treat a missing role (SQL editor, anon key) exactly like anon.
    if v_role is null or v_role = '' or v_role = 'anon' then
        if not (v_status = 'closed' or (v_status = 'open' and v_live)) then
            return json_build_object(
                'status', v_status,
                'live_results', v_live,
                'total', 0,
                'candidates', '[]'::json
            );
        end if;
    end if;

    -- Counts are computed only for active candidates, so a removed presentation
    -- disappears from the results (and from the total) instead of leaving an
    -- orphan row with no name attached.
    select
        coalesce(sum(t.votes), 0)::bigint,
        coalesce(
            json_agg(
                json_build_object(
                    'id', c.id,
                    'votes', coalesce(t.votes, 0)
                )
                order by c.position, c.id
            ),
            '[]'::json
        )
    into v_total, v_candidates
    from public.voting_candidates c
    left join (
        select candidate_id, count(*)::bigint as votes
        from public.votes
        group by candidate_id
    ) t on t.candidate_id = c.id
    where c.active;

    return json_build_object(
        'status', v_status,
        'live_results', v_live,
        'total', v_total,
        'candidates', v_candidates
    );
end;
$$;

-- ---- Grants -----------------------------------------------------------------

revoke all on function public.cast_vote(text, text) from public;
revoke all on function public.voting_results() from public;

grant execute on function public.cast_vote(text, text) to anon, authenticated;
grant execute on function public.voting_results() to anon, authenticated;

-- ---- Verification queries (run after applying; comments only) ---------------
--
-- 1. Both functions exist with the expected security settings:
--      select p.proname,
--             p.prosecdef as security_definer,
--             p.provolatile,
--             p.proconfig
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public'
--        and p.proname in ('cast_vote', 'voting_results');
--    Expected: cast_vote has security_definer = true, provolatile = 'v',
--    proconfig includes search_path=public. voting_results has
--    security_definer = true, provolatile = 's', same search_path.
--
-- 2. EXECUTE grants for the two functions:
--      select routine_name, grantee, privilege_type
--      from information_schema.routine_privileges
--      where routine_schema = 'public'
--        and routine_name in ('cast_vote', 'voting_results')
--        and grantee in ('anon', 'authenticated', 'PUBLIC')
--      order by routine_name, grantee;
--    Expected: 4 rows — each function has EXECUTE for anon and for
--    authenticated. No row with grantee = 'PUBLIC'. (The table can also list
--    the owner and service_role; those rows are normal and not a problem.)
--
-- 3. anon still cannot read the underlying tables:
--      select grantee, privilege_type
--      from information_schema.role_table_grants
--      where table_schema = 'public'
--        and table_name in ('votes', 'voting_candidates', 'registrations')
--        and grantee = 'anon';
--    Expected: 0 rows.
--
-- 4. Hidden results leak nothing to anon:
--      -- Run once while status = 'open' and live_results = false:
--      set local role anon;
--      select public.voting_results();
--      reset role;
--    Expected: {"status":"open","live_results":false,"total":0,
--    "candidates":[]}. Change live_results to true (or Close voting) and the
--    same call returns real counts.
