alter table items enable row level security;
alter table folders enable row level security;
alter table devices enable row level security;
alter table linked_channels enable row level security;
alter table link_codes enable row level security;
alter table processed_messages enable row level security;

create policy "own items" on items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own folders" on folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own devices" on devices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "see own instagram link" on linked_channels for select
  using (auth.uid() = user_id);
-- link_codes, processed_messages: RLS on, no policies → server (secret key) only

-- Storage: private bucket 'uploads'; users use only their own folder '{user_id}/...'
create policy "upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
