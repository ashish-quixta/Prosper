-- =========================================================
-- PROSPOR — 002_policies.sql
-- Row Level Security + storage rules
-- Run AFTER 001_schema.sql and after creating the private 'uploads' bucket
-- =========================================================

-- ---------- TURN ON ROW LEVEL SECURITY ----------
alter table items              enable row level security;
alter table folders            enable row level security;
alter table devices            enable row level security;
alter table linked_channels    enable row level security;
alter table link_codes         enable row level security;
alter table processed_messages enable row level security;

-- ---------- APP ACCESS: users see and change only their own rows ----------
drop policy if exists "own items" on items;
create policy "own items" on items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own folders" on folders;
create policy "own folders" on folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own devices" on devices;
create policy "own devices" on devices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "see own instagram link" on linked_channels;
create policy "see own instagram link" on linked_channels for select
  using (auth.uid() = user_id);

-- link_codes and processed_messages: RLS on, no policies
-- → only the server (secret key) can read or write them

-- ---------- STORAGE: private 'uploads' bucket, users use only their own folder ----------
drop policy if exists "upload own" on storage.objects;
create policy "upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read own" on storage.objects;
create policy "read own" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);