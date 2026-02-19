create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

create index if not exists blocks_to_user_idx on public.blocks (to_user);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user', 'message')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);

alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy "blocks_select_involved"
  on public.blocks
  for select
  to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "blocks_insert_own"
  on public.blocks
  for insert
  to authenticated
  with check (auth.uid() = from_user);

create policy "blocks_delete_own"
  on public.blocks
  for delete
  to authenticated
  using (auth.uid() = from_user);

create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "reports_insert_own"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);
