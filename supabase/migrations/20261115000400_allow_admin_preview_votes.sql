-- Let a signed-in admin cast a real vote from the vote preview.
--
-- File: supabase/migrations/20261115000400_allow_admin_preview_votes.sql
-- Order: Apply FIFTH of the voting migrations (after
--        20261115000300_create_clear_all_votes.sql).
-- Safe to re-run: Yes (CREATE OR REPLACE FUNCTION, REVOKE/GRANT).
--
-- Why this exists:
--   /vote/?preview=true renders the ballot for a signed-in admin even while
--   the public status is not 'open', so the real page can be checked before
--   it goes live. That preview would be useless if every "Confirm my vote"
--   came back 'closed', so cast_vote has to let the preview write a real vote.
--   It is the same escape hatch registration already has:
--   20261020000000_enforce_registration_status_rls.sql lets the
--   `authenticated` role insert a registration while registration is closed.
--
-- What changes:
--   public.cast_vote(p_candidate_id, p_phone) keeps the exact body from
--   20261115000200_create_voting_functions.sql, except the status gate is
--   skipped when the caller's JWT role is 'authenticated'. Every other check
--   is unchanged (candidate must exist and be active, phone must be canonical
--   +20, phone must belong to a registration, one vote per voter key), so a
--   preview vote is a real vote cast under the real rules.
--
--   Anonymous visitors still get 'closed' while voting is shut, and
--   voting_results() is untouched, so this cannot reveal counts that the
--   public is not allowed to see.

-- ---- cast_vote (admin preview build) ---------------------------------------

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
    v_role text;
begin
    -- 0. The caller's role tells a preview apart from the public page. Read
    --    with json_extract_path_text, never ->> : the Supabase SQL Editor
    --    HTML-escapes ->> into -&gt;&gt; and breaks the function on paste.
    v_role := json_extract_path_text(
        current_setting('request.jwt.claims', true)::json,
        'role'
    );

    -- 1. Voting must be open — unless an admin is using the preview.
    select status into v_status
    from public.voting_settings
    where id = 'current';

    if v_status is distinct from 'open'
       and v_role is distinct from 'authenticated' then
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

-- ---- Grants -----------------------------------------------------------------

revoke all on function public.cast_vote(text, text) from public;

grant execute on function public.cast_vote(text, text) to anon, authenticated;

-- ---- Verification queries (run after applying; comments only) ---------------
--
-- 1. Anonymous callers still see the shutdown:
--      -- Run while status = 'closed' (or 'soon'):
--      set local role anon;
--      select public.cast_vote('digital-phenotyping-mental-health', '+201000000000');
--      reset role;
--    Expected: 'closed'.
--
-- 2. The preview path is a browser check, not a SQL one: sign in on /admin,
--    open "Open vote preview", and confirm a registered phone. Expected: the
--    vote is recorded and the card becomes "Your vote". An anonymous browser
--    on the same URL must still resolve to the closed/soon page, with no
--    ballot and no banner.
