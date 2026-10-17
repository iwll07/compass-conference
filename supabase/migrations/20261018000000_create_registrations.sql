-- Registration table for COMPASS conference attendees.
--
-- SAFE TO RE-RUN: all structural statements use `if not exists` or
-- `drop ... if exists` / `create or replace`, so re-pasting this file into
-- the Supabase SQL Editor is harmless. HOWEVER, changing a CHECK constraint
-- on an existing column or altering a column type requires a NEW migration
-- file (ALTER TABLE ... DROP CONSTRAINT + ADD CONSTRAINT), because
-- `if not exists` does not apply to constraints and the old constraint
-- blocks the new one.
--
-- Run manually in the Supabase SQL Editor — the project is not linked to the
-- Supabase CLI. Do NOT run against the live database until you are ready for
-- the form to start accepting registrations.
--
-- Mirrors the option lists in lib/registration.ts. A unit test
-- (tests/registration.test.ts) asserts every dropdown value appears here.

-- ---- Table ------------------------------------------------------------------

create table if not exists registrations (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    full_name text not null,
    email text not null,
    phone text not null,
    nationality text not null,
    university text not null,
    academic_year text not null,

    -- Length limits mirror the client-side validators in lib/registration.ts.
    constraint registrations_name_length check (char_length(full_name) >= 3 and char_length(full_name) <= 100),
    constraint registrations_email_length check (char_length(email) >= 3 and char_length(email) <= 254),

    -- Phone matches the normalised format: +20 followed by a valid operator
    -- prefix (10, 11, 12 or 15) and 8 more digits.
    constraint registrations_phone_format check (phone ~ '^\+20(10|11|12|15)[0-9]{8}$'),

    -- Dropdown values: exactly the lists from lib/registration.ts.
    constraint registrations_nationality_valid check (nationality in (
        'Egypt', 'Sudan', 'Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Syria', 'Other'
    )),
    constraint registrations_university_valid check (university in (
        'Beni Suef National University', 'Beni Suef University',
        'Benha National University', 'Alexandria National University',
        'Mansoura National University', 'American University',
        'New Giza University', 'New Valley University', 'Other'
    )),
    constraint registrations_academic_year_valid check (academic_year in (
        'First Year', 'Second Year', 'Third Year', 'Fourth Year',
        'Fifth Year', 'Intern', 'Graduate'
    ))
);

-- Unique index on normalised email: prevents duplicate registrations regardless
-- of the case the user typed.
create unique index if not exists registrations_email_unique_idx
    on registrations (lower(email));

-- ---- Row Level Security -----------------------------------------------------

alter table registrations enable row level security;

-- Revoke everything first, then grant only what is needed. This is explicit
-- rather than relying on defaults: a future Supabase update that changes the
-- default grant cannot silently widen access.
revoke all on registrations from anon, authenticated;

-- INSERT only on the six data columns — clients must not be able to set id or
-- created_at. Column-level grant: anon and authenticated may INSERT, but only
-- the listed columns.
grant insert (full_name, email, phone, nationality, university, academic_year)
    on registrations to anon, authenticated;

-- INSERT policy: anyone may insert (the real gate is the column-level grant
-- above, plus the CHECK constraints).
drop policy if exists "anyone can register" on registrations;
create policy "anyone can register"
    on registrations for insert
    with check (true);

-- SELECT: only registration admins. The function checks the JWT email.
grant select on registrations to authenticated;

-- is_registration_admin(): returns true when the JWT email is in a hardcoded
-- list. Uses json_extract_path_text (never `->>`, which the SQL Editor
-- HTML-escapes into `-&gt;&gt;`). Mirrors the REGISTRATION_ADMIN_EMAILS list in
-- app/admin/page.tsx — keep in sync.
create or replace function is_registration_admin()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
as $$
    select lower(
        json_extract_path_text(
            current_setting('request.jwt.claims', true)::json,
            'email'
        )
    ) in ('fares9005@gmail.com')
$$;

drop policy if exists "admins can read registrations" on registrations;
create policy "admins can read registrations"
    on registrations for select
    using (is_registration_admin());

-- No UPDATE or DELETE policies: registrations are immutable from the API.
-- Deleting a registrant must be done in the Supabase Table Editor or via SQL.
