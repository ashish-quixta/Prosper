-- =========================================================
-- PROSPOR — 005_youtube.sql
-- Allow YouTube saves. Run once in the Supabase SQL editor.
-- =========================================================

alter type platform add value if not exists 'youtube';
