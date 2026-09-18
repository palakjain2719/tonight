-- Movie Matchmaker schema.
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.
-- All reads/writes go through server-side API routes using the service-role
-- key, so RLS is enabled with no policies: anon/authenticated clients are
-- denied direct table access by default. The browser only ever talks to
-- Supabase Realtime (broadcast channels), never the tables directly.

create extension if not exists "pgcrypto";

do $$ begin
  create type partner_role as enum ('a', 'b');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type session_status as enum (
    'awaiting_b',
    'generating',
    'swiping',
    'matched',
    'final_choice',
    'completed'
  );
exception when duplicate_object then null;
end $$;

-- A "couple" persists across sessions on the same pair of devices so watch
-- history can inform future recommendations. Identified by an opaque id
-- stored client-side (localStorage), not by any real identity.
create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete set null,
  status session_status not null default 'awaiting_b',
  round int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists preferences (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  partner partner_role not null,
  moods text[] not null default '{}',
  mood_text text,
  languages text[] not null default '{}',
  content_type text not null check (content_type in ('movies', 'series')),
  min_rating numeric not null,
  eras text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (session_id, partner)
);

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  brief jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, round)
);

create table if not exists titles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  year int,
  poster_path text,
  overview text,
  runtime int,
  imdb_rating numeric,
  genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (session_id, round, tmdb_id, media_type)
);

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  partner partner_role not null,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  unique (session_id, round, partner, tmdb_id, media_type)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  created_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  rating int not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_preferences_session on preferences(session_id);
create index if not exists idx_titles_session_round on titles(session_id, round);
create index if not exists idx_swipes_session_round on swipes(session_id, round);
create index if not exists idx_swipes_lookup on swipes(session_id, round, tmdb_id, media_type);
create index if not exists idx_sessions_couple on sessions(couple_id);

alter table couples enable row level security;
alter table sessions enable row level security;
alter table preferences enable row level security;
alter table briefs enable row level security;
alter table titles enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table ratings enable row level security;
