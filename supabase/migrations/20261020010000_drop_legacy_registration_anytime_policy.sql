-- Migration: 20261020010000_drop_legacy_registration_anytime_policy.sql
-- Description: Drop legacy "authenticated can register anytime" policy if present and ensure preview policy exists
-- Safe to re-run: Yes (uses DROP POLICY IF EXISTS)

drop policy if exists "authenticated can register anytime" on public.registrations;

-- Ensure the authenticated preview INSERT policy is present
drop policy if exists "authenticated can register in preview" on public.registrations;
create policy "authenticated can register in preview"
    on public.registrations
    for insert
    to authenticated
    with check (true);
