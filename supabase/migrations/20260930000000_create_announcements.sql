-- Announcements: homepage section + /admin authoring.
--
-- The site is a static export, so ALL access to this table happens from the
-- browser with the publishable (anon-equivalent) key. That makes RLS the only
-- thing standing between the public internet and the write path, so both
-- policies below are load-bearing rather than defence-in-depth.
--
-- Run manually in the Supabase SQL Editor if the CLI is not wired to this
-- project.
--
-- ONE-TIME MIGRATION -- NOT SAFELY RE-RUNNABLE. Every statement below is
-- unguarded (`create type`, `create table`, `create index`, `create policy`,
-- `create function`, `create trigger` -- no `if not exists` / `if exists`), and
-- the SQL Editor aborts a pasted script at the first error. So once this file
-- has been applied, re-pasting it stops at the first `create type` and changes
-- nothing. Any later change must go in a NEW, separate migration file: see
-- 20260930120000_add_link_label.sql and 20261003120000_allow_history_delete.sql
-- for two that were added after this file had already been applied.

create type announcement_category as enum
    ('registration', 'speakers', 'agenda', 'sponsors', 'posters', 'general');

create table announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text not null,
    category announcement_category not null default 'general',
    link_target text not null default 'none',
      -- one of: 'registration' | 'speakers' | 'agenda' | 'sponsors' |
      --         'posters' | 'hero' | 'none' | 'custom'
      -- 'hero' is not a page: it renders a link that jumps back to the
      -- homepage hero, where the open-call CTA buttons live. Chosen per
      -- announcement in /admin, so it is only present on the items an editor
      -- pointed at the open calls. Its wording is set per item by the
      -- link_label column added in a later migration.
    custom_url text,
      -- only used when link_target = 'custom'; null otherwise
    published boolean not null default true,
    created_at timestamptz not null default now()
);

-- The homepage orders by created_at desc, so the public read path needs this
-- index; without it every page load sorts the whole table.
create index announcements_published_created_at_idx on announcements (created_at desc) where published = true;

alter table announcements enable row level security;

-- Public read, published rows only. Note this is `for select` alone: anonymous
-- visitors get no INSERT/UPDATE/DELETE policy at all, so those operations are
-- denied by default rather than by an explicit deny.
create policy "public can read published announcements"
    on announcements for select
    using (published = true);

-- Full management for signed-in users. `auth.role()` reads the verified JWT
-- claim, not user_metadata, so it cannot be spoofed by the account owner.
create policy "authenticated users can manage announcements"
    on announcements for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Audit log: who changed which announcement, and when.
--
-- Written by a TRIGGER, not by the admin page. That matters: logging from React
-- would miss any change made directly in the Supabase dashboard or SQL Editor,
-- which is exactly where mistakes happen. The trigger is the only reliable
-- record, and it runs on the database regardless of who or what made the edit.
--
-- Trigger functions are SECURITY DEFINER, so this insert bypasses RLS. That is
-- intentional and narrow: it lets any authenticated user *record* an action
-- (they can already make that change anyway) without granting them the ability
-- to read history.
-- ---------------------------------------------------------------------------
create table announcement_log (
    id uuid primary key default gen_random_uuid(),
    announcement_id uuid not null,
    action text not null check (action in ('created', 'updated', 'deleted')),
    title text not null,
    actor_email text not null,
    created_at timestamptz not null default now()
);

create index announcement_log_created_at_idx on announcement_log (created_at desc);

alter table announcement_log enable row level security;

-- Reads are limited to one named account.
--
-- Uses json_extract_path_text rather than the `->>` operator because the SQL
-- Editor HTML-escapes pasted arrow characters (both auth.jwt() ->> and
-- current_setting(...)::json ->> arrive as `-&gt;&gt;`, a syntax error).
-- request.jwt.claims holds the same verified, signed JWT payload, so this is
-- just as trustworthy as auth.jwt() — and crucially it is NOT user_metadata,
-- which the account owner can edit and so cannot be used for authorization.
create policy "fares can read announcement history"
    on announcement_log for select
    using (json_extract_path_text(current_setting('request.jwt.claims', true)::json, 'email') = 'fares9005@gmail.com');

-- Deletes are scoped to the same single account. A deletable audit log is not
-- tamper-proof, so the privilege is deliberately narrow: nobody else can remove
-- a record even if a delete button were somehow rendered for them.
create policy "fares can delete announcement history"
    on announcement_log for delete
    using (json_extract_path_text(current_setting('request.jwt.claims', true)::json, 'email') = 'fares9005@gmail.com');

create function log_announcement_change() returns trigger
    language plpgsql
    security definer
    set search_path = public
as $$
declare
    -- Same reason as the policy above: a plain function call, no arrow operator.
    actor text := json_extract_path_text(current_setting('request.jwt.claims', true)::json, 'email');
    -- tg_op is 'INSERT' / 'UPDATE' / 'DELETE', but the column's CHECK constraint
    -- only allows 'created' / 'updated' / 'deleted'. They MUST be mapped, not
    -- lowercased: lower(tg_op) emits 'insert', which the CHECK rejects, and that
    -- aborts the triggering statement — so publishing would silently fail for
    -- everyone purely because the audit trail exists.
    verb text := case tg_op
        when 'INSERT' then 'created'
        when 'UPDATE' then 'updated'
        else 'deleted'
    end;
begin
    if tg_op = 'DELETE' then
        -- The row is gone on DELETE, so the id/title come from OLD.
        insert into announcement_log (announcement_id, action, title, actor_email)
        values (old.id, verb, old.title, actor);
    else
        insert into announcement_log (announcement_id, action, title, actor_email)
        values (new.id, verb, new.title, actor);
    end if;
    return null;
end;
$$;

create trigger announcements_audit_log
    after insert or update or delete on announcements
    for each row execute function log_announcement_change();

-- Grants required for the Data API, same reason as the announcements table
-- above: RLS and grants are independent, and missing grants produce a 401.
grant select on announcement_log to authenticated;
grant delete on announcement_log to authenticated;
