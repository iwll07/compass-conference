-- Per-announcement wording for the hero jump link.
--
-- Editing the existing create_announcements.sql would NOT be enough: that
-- migration has already run against the live database, so a change to it is
-- never re-executed. Adding a column therefore needs its own migration file.
--
-- Nullable on purpose. Null means "use the default" (HERO_LINK_LABEL in
-- lib/announcements.ts), so existing rows and every non-hero target need no
-- backfill and no UPDATE against production data.

alter table announcements add column if not exists link_label text;

comment on column announcements.link_label is
    'Editor-written wording for the hero jump link; null means use the default label.';