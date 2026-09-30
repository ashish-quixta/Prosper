-- =========================================================
-- PROSPOR — 001_schema.sql
-- Tables, indexes, triggers, work-queue function, realtime
-- =========================================================

-- ---------- RESET (safe while there's no real data) ----------
drop function if exists claim_items(int);
drop table if exists items cascade;
drop table if exists folders cascade;
drop table if exists devices cascade;
drop table if exists linked_channels cascade;
drop table if exists link_codes cascade;
drop table if exists processed_messages cascade;
drop function if exists set_updated_at() cascade;
drop type if exists item_status;
drop type if exists platform;

-- ---------- TYPES ----------
create type platform as enum ('instagram', 'reddit', 'x', 'linkedin', 'other');
create type item_status as enum ('saving', 'summarising', 'ready', 'limited', 'failed');

-- ---------- FOLDERS ----------
create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (user_id, id)          -- lets items check the folder belongs to the same user
);

-- ---------- ITEMS (one row per save) ----------
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  platform platform not null default 'other',
  capture_method text not null check (capture_method in ('share', 'paste', 'screenshot', 'bot')),
  source_url text,
  image_path text,          -- screenshot in Storage; deleted + cleared after summarizing
  media_url text,           -- reel video URL from the bot; cleared after processing
  caption text,             -- Instagram caption from the bot
  status item_status not null default 'saving',
  attempts int not null default 0,
  error text,
  title text,
  summary text,
  key_points jsonb,         -- array of strings
  tags text[],
  folder_id uuid,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tsv tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(caption, ''))
  ) stored,
  -- an item can only go into a folder owned by the same user;
  -- deleting the folder just un-files the item
  constraint items_folder_owner_fkey
    foreign key (user_id, folder_id) references folders (user_id, id)
    on delete set null (folder_id)
);

create index items_feed   on items (user_id, created_at desc);
create index items_queue  on items (status, created_at) where status in ('saving', 'summarising');
create index items_search on items using gin (tsv);
create unique index items_user_url on items (user_id, source_url) where source_url is not null;

-- keep updated_at correct on every edit
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

-- ---------- DEVICES (push notification tokens) ----------
create table devices (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  platform text,
  created_at timestamptz not null default now()
);

-- ---------- SERVER-ONLY TABLES (Instagram bot) ----------
create table linked_channels (
  instagram_id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  linked_at timestamptz not null default now()
);

create table link_codes (
  code text primary key,
  user_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table processed_messages (
  mid text primary key,
  received_at timestamptz not null default now()
);

-- ---------- SERVER WORK QUEUE ----------
-- hands out new items safely, even with several server copies running
create or replace function claim_items(max_items int)
returns setof items language sql as $$
  update items set status = 'summarising', attempts = attempts + 1, updated_at = now()
  where id in (
    select id from items where status = 'saving'
    order by created_at limit max_items
    for update skip locked
  )
  returning *;
$$;

-- only the server (secret key) may run it
revoke execute on function claim_items(int) from public, anon, authenticated;
grant execute on function claim_items(int) to service_role;

-- ---------- LIVE UPDATES TO THE APP ----------
alter publication supabase_realtime add table items;