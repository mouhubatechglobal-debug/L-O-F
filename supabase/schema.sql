-- Target schema for a real Supabase project.
-- Do not run this against the Node API database: ids and auth differ.
-- Passwords live in Supabase Auth only. This file has no password column.
-- The app stays on the Node API until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY exist.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  nom text not null default '',
  prenom text not null default '',
  pseudo text unique not null,
  sexe text,
  bio text not null default '',
  birth_date text,
  birth_place text,
  avatar jsonb,
  theme text not null default 'amour',
  lang text not null default 'fr',
  wallpaper text,
  role text not null default 'player' check (role in ('player', 'admin')),
  seen_welcome boolean not null default false,
  awa_invited boolean not null default false,
  last_played jsonb not null default '{}',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm', 'group')),
  name text,
  pin_until bigint not null default 0,
  ephemeral_ms bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  text text not null,
  hidden_for jsonb not null default '[]',
  forwarded boolean not null default false,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references public.profiles(id),
  game_id text not null,
  difficulty text not null default 'doux',
  category text not null default 'fun',
  status text not null default 'open',
  state jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  game_id text not null,
  winner_id uuid,
  draw boolean not null default false,
  scores jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.game_results enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());

create policy friends_own on public.friend_requests for all to authenticated
  using (from_id = auth.uid() or to_id = auth.uid())
  with check (from_id = auth.uid() or to_id = auth.uid());

create policy chat_members_own on public.chat_members for select to authenticated using (user_id = auth.uid());
create policy messages_member on public.messages for select to authenticated using (
  exists (select 1 from public.chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid())
);
create policy messages_insert_own on public.messages for insert to authenticated with check (
  author_id = auth.uid()
  and exists (select 1 from public.chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid())
);

create policy rooms_member on public.rooms for select to authenticated using (
  host_id = auth.uid()
  or exists (select 1 from public.room_members m where m.room_id = rooms.id and m.user_id = auth.uid())
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('wallpapers', 'wallpapers', false)
on conflict (id) do nothing;

create policy avatar_read on storage.objects for select to public using (bucket_id = 'avatars');
create policy avatar_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy wallpaper_own on storage.objects for all to authenticated
  using (bucket_id = 'wallpapers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'wallpapers' and (storage.foldername(name))[1] = auth.uid()::text);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.rooms;
