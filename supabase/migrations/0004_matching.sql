create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  is_like boolean not null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

create index if not exists swipes_to_user_idx on public.swipes (to_user);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.chats enable row level security;

create policy "swipes_select_involved"
  on public.swipes
  for select
  to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "swipes_insert_own"
  on public.swipes
  for insert
  to authenticated
  with check (auth.uid() = from_user);

create policy "swipes_update_own"
  on public.swipes
  for update
  to authenticated
  using (auth.uid() = from_user)
  with check (auth.uid() = from_user);

create policy "swipes_delete_own"
  on public.swipes
  for delete
  to authenticated
  using (auth.uid() = from_user);

create policy "matches_select_involved"
  on public.matches
  for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "matches_insert_involved"
  on public.matches
  for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "chats_select_involved"
  on public.chats
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = chats.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "chats_insert_involved"
  on public.chats
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = chats.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );
