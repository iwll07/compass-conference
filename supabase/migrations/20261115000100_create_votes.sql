-- Votes for the "Best student presentation" contest.
--
-- File: supabase/migrations/20261115000100_create_votes.sql
-- Order: Apply SECOND of the three voting migrations
--        (after 20261115000000_create_voting_settings_candidates.sql,
--         before 20261115000200_create_voting_functions.sql).
-- Safe to re-run: Yes (IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
--
-- One row per voter. The primary key is the voter key, so a second vote from
-- the same phone cannot be inserted even if two requests race.
--
-- voter_key = encode(sha256(convert_to(<normalised phone> || ':compass-2026-vote',
--                                  'utf8')), 'hex')
-- The function that writes it lives in the next migration. The phone itself is
-- never stored here.
--
-- There is deliberately NO foreign key to public.registrations. Votes must
-- survive registrations being deleted (including the admin "Delete all"
-- action), so they cannot reference a registration row. The registration check
-- happens at vote time inside cast_vote().
--
-- Privileges: anon and authenticated get NOTHING. There are no RLS policies,
-- because no client should read or write this table directly. Only the
-- security-definer functions in the next migration (and the dashboard owner)
-- may touch it.

create table if not exists public.votes (
    voter_key text primary key,
    candidate_id text not null references public.voting_candidates(id),
    created_at timestamptz not null default now()
);

alter table public.votes enable row level security;

revoke all on public.votes from public, anon, authenticated;

-- Tallies group by candidate_id; this keeps that cheap as votes accumulate.
create index if not exists votes_candidate_id_idx
    on public.votes (candidate_id);

-- ---- Verification queries (run after applying; comments only) ---------------
--
-- 1. The table shape is as intended:
--      select column_name, data_type, is_nullable
--      from information_schema.columns
--      where table_schema = 'public' and table_name = 'votes'
--      order by ordinal_position;
--    Expected: voter_key text NO, candidate_id text NO, created_at
--    timestamp with time zone NO.
--
-- 2. anon and authenticated have no privileges on votes:
--      select grantee, privilege_type
--      from information_schema.role_table_grants
--      where table_schema = 'public'
--        and table_name = 'votes'
--        and grantee in ('anon', 'authenticated');
--    Expected: 0 rows.
--
-- 3. The candidate foreign key exists and does NOT point at registrations:
--      select conname,
--             pg_get_constraintdef(oid) as definition
--      from pg_constraint
--      where conrelid = 'public.votes'::regclass
--        and contype = 'f';
--    Expected: one row, definition references public.voting_candidates(id).
--    No constraint mentioning registrations.
--
-- 4. RLS is on:
--      select relrowsecurity from pg_class where oid = 'public.votes'::regclass;
--    Expected: true.
