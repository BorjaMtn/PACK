create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  city text not null,
  date timestamptz not null,
  therian_type text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists meetups_therian_date_idx on public.meetups (therian_type, date asc);
create index if not exists meetups_creator_idx on public.meetups (created_by, created_at desc);

create table if not exists public.meetup_participants (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (meetup_id, user_id)
);

create index if not exists meetup_participants_meetup_idx on public.meetup_participants (meetup_id);
create index if not exists meetup_participants_user_idx on public.meetup_participants (user_id, created_at desc);

alter table public.meetups enable row level security;
alter table public.meetup_participants enable row level security;

create policy "meetups_select_authenticated"
  on public.meetups
  for select
  to authenticated
  using (true);

create policy "meetups_insert_own"
  on public.meetups
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "meetups_update_own"
  on public.meetups
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "meetups_delete_own"
  on public.meetups
  for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "meetup_participants_select_authenticated"
  on public.meetup_participants
  for select
  to authenticated
  using (true);

create policy "meetup_participants_insert_own"
  on public.meetup_participants
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "meetup_participants_delete_own"
  on public.meetup_participants
  for delete
  to authenticated
  using (auth.uid() = user_id);
