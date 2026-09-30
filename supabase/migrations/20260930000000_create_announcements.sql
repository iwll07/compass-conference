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
