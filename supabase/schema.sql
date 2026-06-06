-- Gachi MVP Database Schema
-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- Users
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  phone         varchar unique not null,
  name          varchar,
  age           integer,
  photo_url     varchar,
  trust_score   integer default 0,
  selfie_verified boolean default false,
  doc_verified  boolean default false,
  trusted_contact varchar,
  created_at    timestamptz default now(),
  last_active   timestamptz default now()
);

alter table users enable row level security;
create policy "Users can read own row" on users for select using (auth.uid() = id);
create policy "Users can insert own row" on users for insert with check (auth.uid() = id);
create policy "Users can update own row" on users for update using (auth.uid() = id);

-- Activities
create type timeframe_type as enum ('today', 'this_week', 'someday');

create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  category    varchar not null,
  title       varchar not null,
  timeframe   timeframe_type not null default 'today',
  is_public   boolean default false,
  location    geometry(point, 4326),
  city        varchar,
  district    varchar,
  created_at  timestamptz default now(),
  expires_at  timestamptz default now() + interval '7 days'
);

alter table activities enable row level security;

-- SELECT: own rows (any auth, including anonymous) + all public rows
create policy "Users can read own activities" on activities
  for select using (auth.uid() = user_id);
create policy "Public activities visible to all" on activities
  for select using (is_public = true);

-- INSERT: auth.uid() must match user_id (works for anonymous sessions too)
create policy "Users can insert own activities" on activities
  for insert with check (auth.uid() = user_id);

-- UPDATE / DELETE: own rows only
create policy "Users can update own activities" on activities
  for update using (auth.uid() = user_id);
create policy "Users can delete own activities" on activities
  for delete using (auth.uid() = user_id);

-- Matches
create type match_format as enum ('solo', 'small_group', 'large_group');
create type match_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  format      match_format not null default 'solo',
  status      match_status not null default 'pending',
  location    varchar,
  meetup_time timestamptz,
  created_at  timestamptz default now()
);

alter table matches enable row level security;
-- A user can see any match they are a participant in
create policy "Participants can read their matches" on matches
  for select using (
    id in (select match_id from match_participants where user_id = auth.uid())
  );

-- Match participants
create table if not exists match_participants (
  match_id    uuid references matches(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  confirmed   boolean default false,
  gps_active  boolean default false,
  primary key (match_id, user_id)
);

alter table match_participants enable row level security;
create policy "Participants can see their matches" on match_participants
  for select using (auth.uid() = user_id);

-- Chat messages (retained 30 days per spec)
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references matches(id) on delete cascade not null,
  user_id     uuid references users(id) not null,
  user_name   varchar not null,
  text        text not null,
  created_at  timestamptz default now()
);

alter table chat_messages enable row level security;
-- Any participant in the match can read + insert messages
create policy "Participants can read chat" on chat_messages
  for select using (
    match_id in (select match_id from match_participants where user_id = auth.uid())
  );
create policy "Participants can send messages" on chat_messages
  for insert with check (
    auth.uid() = user_id
    and match_id in (select match_id from match_participants where user_id = auth.uid())
  );

-- Enable real-time replication for both tables
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table match_participants;

-- Ratings
create table if not exists ratings (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references matches(id) on delete cascade,
  rater_id    uuid references users(id),
  ratee_id    uuid references users(id),
  score       integer check (score between 1 and 5),
  comment     text,
  created_at  timestamptz default now()
);

alter table ratings enable row level security;
create policy "Users can submit ratings" on ratings for insert with check (auth.uid() = rater_id);
create policy "Users can see ratings about themselves" on ratings for select using (auth.uid() = ratee_id);

-- Safety events
create type safety_zone as enum ('yellow', 'red', 'black', 'sos');

create table if not exists safety_events (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid references matches(id),
  user_id       uuid references users(id),
  zone          safety_zone not null,
  triggered_at  timestamptz default now(),
  resolved_at   timestamptz,
  gps_lat       double precision,
  gps_lng       double precision
);

alter table safety_events enable row level security;
create policy "Users can log own safety events" on safety_events
  for insert with check (auth.uid() = user_id);

-- Auto-delete GPS data after 48 hours (run as a cron job or pg_cron)
-- delete from safety_events where triggered_at < now() - interval '48 hours';
