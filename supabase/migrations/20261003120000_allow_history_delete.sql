-- Allow the owner to delete announcement history rows.
--
-- This is a SEPARATE file on purpose. The delete-history work was originally
-- added to 20260930000000_create_announcements.sql, but that migration has
-- already been applied to the live database, so editing it would never take
-- effect -- and it is not safely re-runnable: every statement in it is
-- unguarded (`create type`, `create table`, `create policy`, `create trigger`,
-- with no `if not exists` / `if exists`), and the SQL Editor aborts a pasted
-- script at the first error. Re-pasting that file would stop at the first
-- `create type` and these two statements would never be reached. Same reason
-- 20260930120000_add_link_label.sql exists as its own file.
--
-- Mahmoud does NOT need to paste this into the Supabase SQL Editor: as of
-- 2026-10-03 the DELETE policy is ALREADY live on the project, and
-- has_table_privilege('authenticated','public.announcement_log','DELETE') is
-- true, so the /admin Delete buttons already work. Do not paste this file into
-- the live project -- the policy name already exists and `create policy` would
-- fail with a duplicate-object error. This file exists so that a FRESH database
-- built from the migration history reaches the correct end state, and as the
-- record of where the policy is authored.
--
-- WHY THIS IS A SEPARATE FILE, though the live database already has it: the
-- delete-history policy and grant were originally written into
-- 20260930000000_create_announcements.sql. That file has already been applied,
-- and it is NOT safely re-runnable -- every statement in it is unguarded
-- (`create type`, `create table`, `create policy`, `create trigger`, with no
-- `if not exists` / `if exists`) and the SQL Editor aborts a pasted script at
-- the first error, so re-pasting it would stop at the first `create type` and
-- never reach this policy. Anyone rebuilding from the migration history would
-- have got a database WITHOUT the delete policy. Same reason
-- 20260930120000_add_link_label.sql is its own file.
--
-- json_extract_path_text rather than the `->>` operator, deliberately: the SQL
-- Editor HTML-escapes a pasted arrow into `-&gt;&gt;`, which is a syntax error.
-- A plain function call has no arrow to escape, and request.jwt.claims holds
-- the same verified, signed JWT payload as auth.jwt() -- so this is just as
-- trustworthy, and it is NOT user_metadata, which the account owner can edit.
--
-- The privilege is scoped to the same single address as the SELECT policy on
-- this table. Every other admin account has no DELETE policy at all, so the
-- buttons fail for them even if rendered. Keep in sync with HISTORY_EMAIL in
-- app/admin/page.tsx.

create policy "fares can delete announcement history"
    on announcement_log for delete
    using (json_extract_path_text(current_setting('request.jwt.claims', true)::json, 'email') = 'fares9005@gmail.com');

-- Grants and policies are independent: a missing grant produces a 401 before
-- the policy is ever consulted, so the DELETE policy above does nothing
-- without this line.
grant delete on announcement_log to authenticated;