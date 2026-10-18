-- Add specified text columns and constraints for 'Other' nationality & university.
--
-- PURPOSE:
-- Allows attendees who select 'Other' for Nationality or University to specify
-- their institution / country without loosening the canonical dropdown CHECK constraints.
--
-- SAFE TO RE-RUN:
-- - `alter table ... add column if not exists` is idempotent.
-- - Adding constraints is wrapped in a `do $$` block checking `pg_constraint`,
--   so re-running will not error with duplicate constraint names.
-- - Column and table grants are safe to re-run.
--
-- NOT SAFE / WILL FAIL IF:
-- Existing rows violate the new constraints when the migration is applied.
--
-- PRE-MIGRATION AUDIT QUERY (check for violating rows before running):
--
--   select id, nationality, nationality_other, university, university_other
--   from public.registrations
--   where (nationality = 'Other' and (nationality_other is null or char_length(trim(nationality_other)) < 2 or char_length(trim(nationality_other)) > 60))
--      or (nationality <> 'Other' and nationality_other is not null)
--      or (university = 'Other' and (university_other is null or char_length(trim(university_other)) < 2 or char_length(trim(university_other)) > 100))
--      or (university <> 'Other' and university_other is not null);
--
-- If this query returns rows, update or fix them before running this migration.
--
-- VERIFICATION QUERIES (run after applying):
--
-- 1. Verify columns exist:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'registrations'
--     and column_name in ('nationality_other', 'university_other')
--   order by column_name;
--
-- 2. Verify constraints are attached:
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.registrations'::regclass
--     and conname in (
--       'registrations_nationality_other_len',
--       'registrations_nationality_other_required',
--       'registrations_university_other_len',
--       'registrations_university_other_required'
--     )
--   order by conname;
--
-- 3. Verify INSERT grants:
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_name = 'registrations'
--     and column_name in ('nationality_other', 'university_other')
--   order by grantee, column_name;
--

-- ---- Add Columns ------------------------------------------------------------

alter table public.registrations
    add column if not exists nationality_other text,
    add column if not exists university_other text;

-- ---- Add Constraints (Idempotent via pg_constraint checks) -----------------

do $$
begin
    -- nationality_other length: null or trimmed length between 2 and 60
    if not exists (
        select 1 from pg_constraint
        where conname = 'registrations_nationality_other_len'
          and conrelid = 'public.registrations'::regclass
    ) then
        alter table public.registrations
            add constraint registrations_nationality_other_len
            check (nationality_other is null or (char_length(trim(nationality_other)) >= 2 and char_length(trim(nationality_other)) <= 60));
    end if;

    -- nationality_other required iff nationality = 'Other'
    if not exists (
        select 1 from pg_constraint
        where conname = 'registrations_nationality_other_required'
          and conrelid = 'public.registrations'::regclass
    ) then
        alter table public.registrations
            add constraint registrations_nationality_other_required
            check ((nationality = 'Other' and nationality_other is not null) or (nationality <> 'Other' and nationality_other is null));
    end if;

    -- university_other length: null or trimmed length between 2 and 100
    if not exists (
        select 1 from pg_constraint
        where conname = 'registrations_university_other_len'
          and conrelid = 'public.registrations'::regclass
    ) then
        alter table public.registrations
            add constraint registrations_university_other_len
            check (university_other is null or (char_length(trim(university_other)) >= 2 and char_length(trim(university_other)) <= 100));
    end if;

    -- university_other required iff university = 'Other'
    if not exists (
        select 1 from pg_constraint
        where conname = 'registrations_university_other_required'
          and conrelid = 'public.registrations'::regclass
    ) then
        alter table public.registrations
            add constraint registrations_university_other_required
            check ((university = 'Other' and university_other is not null) or (university <> 'Other' and university_other is null));
    end if;
end $$;

-- ---- Column-Level Grants ----------------------------------------------------

-- Grant INSERT on the new columns to anon and authenticated
grant insert (nationality_other, university_other)
    on public.registrations to anon, authenticated;

-- Existing SELECT grant from 20261018000000_create_registrations.sql is table-level
-- ("grant select on registrations to authenticated;"), so newly added columns are
-- already accessible to authenticated users via RLS policy. Reaffirming here:
grant select on public.registrations to authenticated;
