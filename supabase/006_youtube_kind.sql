-- =========================================================
-- PROSPOR — 006_youtube_kind.sql
-- Remember whether a YouTube save is a Short, video, or podcast.
-- Run once in the Supabase SQL editor.
-- =========================================================

alter table items
  add column if not exists youtube_kind text;

alter table items
  drop constraint if exists items_youtube_kind_check;

alter table items
  add constraint items_youtube_kind_check
  check (youtube_kind is null or youtube_kind in ('short', 'video', 'podcast'));
