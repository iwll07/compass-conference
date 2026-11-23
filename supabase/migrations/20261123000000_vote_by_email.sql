-- Voting by email allowlist (2026-11-23).
--
-- Registrations via the site were not used; attendance was collected with a
-- Google Form. This replaces phone verification with an approved-email list.
-- Apply in the Supabase SQL Editor AFTER the earlier voting migrations.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE FUNCTION.
-- The one-time cleanup at the end clears old test votes only while the
-- allowlist is still empty, so re-running after the seed cannot wipe votes.
--
-- After applying this migration, paste the email seed (see working.md).

-- 1. Private allowlist. No anon/authenticated privileges: the list is readable
--    only by the security-definer function and by admins in the SQL Editor.
create table if not exists public.voting_eligible_emails (
    email text primary key,
    created_at timestamptz not null default now()
);

alter table public.voting_eligible_emails enable row level security;
revoke all on public.voting_eligible_emails from public, anon, authenticated;

-- 2. cast_vote now takes an email instead of a phone. Postgres cannot rename an
--    input parameter with CREATE OR REPLACE, so drop the old signature first.
drop function if exists public.cast_vote(text, text);

create or replace function public.cast_vote(
    p_candidate_id text,
    p_email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status text;
    v_email text;
begin
    -- Voting must be open.
    select status into v_status
    from public.voting_settings
    where id = 'current';

    if v_status is distinct from 'open' then
        return 'closed';
    end if;

    -- The candidate must exist and be active.
    if not exists (
        select 1
        from public.voting_candidates
        where id = p_candidate_id
          and active
    ) then
        return 'invalid';
    end if;

    -- Normalise and sanity-check the email.
    v_email := lower(btrim(p_email));
    if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
        return 'invalid';
    end if;

    -- Only addresses on the approved list may vote.
    if not exists (
        select 1
        from public.voting_eligible_emails
        where email = v_email
    ) then
        return 'not_registered';
    end if;

    -- One vote per email. voter_key is a one-way hash of the normalised email
    -- plus the contest salt; the address never lands in the votes table.
    insert into public.votes (voter_key, candidate_id)
    values (
        encode(
            sha256(convert_to(v_email || ':compass-2026-vote', 'utf8')),
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

revoke all on function public.cast_vote(text, text) from public;
grant execute on function public.cast_vote(text, text) to anon, authenticated;

-- 3. One-time cleanup of any phone-era test votes. Becomes a no-op as soon as
--    the seed below has been pasted.
do $$
begin
    if not exists (select 1 from public.voting_eligible_emails limit 1) then
        truncate public.votes;
    end if;
end $$;
