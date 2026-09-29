create type platform as enum ('instagram', 'reddit', 'x', 'linkedin', 'other');
create type item_status as enum ('saving', 'summarising', 'ready', 'limited', 'failed');

create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

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
  folder_id uuid references folders on delete set null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tsv tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(caption, ''))
  ) stored
);
create index items_feed on items (user_id, created_at desc);
create index items_queue on items (status, updated_at);
create index items_search on items using gin (tsv);
create unique index items_user_url on items (user_id, source_url) where source_url is not null;

create table devices (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  platform text,
  created_at timestamptz not null default now()
);

-- server-only tables
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

-- server work queue: hands out new items safely across multiple server copies
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
revoke execute on function claim_items from anon, authenticated;

-- live updates to the app
alter publication supabase_realtime add table items;
