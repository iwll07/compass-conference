-- Announcements: homepage section + /admin authoring.
--
-- The site is a static export, so ALL access to this table happens from the
-- browser with the publishable (anon-equivalent) key. That makes RLS the only
-- thing standing between the public internet and the write path, so both
-- policies below are load-bearing rather than defence-in-depth.
--
-- Run manually in the Supabase SQL Editor if the CLI is not wired to this
-- project. Statements are idempotent-ish but intended as a one-time migration.

create type announcement_category as enum
    ('registration', 'speakers', 'agenda', 'sponsors', 'posters', 'general');

create table announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text not null,
    category announcement_category not null default 'general',
    link_target text not null default 'none',
      -- one of: 'registration' | 'speakers' | 'agenda' | 'sponsors' |
      --         'posters' | 'none' | 'custom'
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

-- Reads are limited to one named account. auth.jwt() ->> 'email' is a VERIFIED
-- claim from the signed token, not user_metadata (which the account owner can
-- edit), so this cannot be spoofed from the client.
create policy "fares can read announcement history"
    on announcement_log for select
    using (auth.jwt() ->> 'email') = 'fares9005@gmail.com';

create function log_announcement_change() returns trigger
    language plpgsql
    security definer
    set search_path = public
as $$
begin
    if tg_op = 'INSERT' or tg_op = 'UPDATE' then
        insert into announcement_log (announcement_id, action, title, actor_email)
        values (new.id, lower(tg_op), new.title, auth.jwt() ->> 'email');
    else
        -- The row is gone on DELETE, so the id/title come from OLD.
        insert into announcement_log (announcement_id, action, title, actor_email)
        values (old.id, 'deleted', old.title, auth.jwt() ->> 'email');
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
