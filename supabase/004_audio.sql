-- =========================================================
-- PROSPOR — 004_audio.sql
-- Allow a voice-note save. Run once in the Supabase SQL editor.
-- =========================================================

alter table items drop constraint if exists items_capture_method_check;

alter table items
  add constraint items_capture_method_check
  check (capture_method in ('share', 'paste', 'screenshot', 'bot', 'pdf', 'audio'));
