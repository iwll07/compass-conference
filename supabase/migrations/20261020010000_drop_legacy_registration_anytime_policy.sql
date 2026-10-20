-- Migration: 20261020010000_drop_legacy_registration_anytime_policy.sql
-- Description: Drop legacy "authenticated can register anytime" policy if present
-- Safe to re-run: Yes (uses DROP POLICY IF EXISTS)

drop policy if exists "authenticated can register anytime" on public.registrations;
