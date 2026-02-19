create table if not exists public.pack_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  therian_type text,
  emoji text not null default '🐾',
  created_at timestamptz not null default now()
);

create table if not exists public.pack_group_memberships (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.pack_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pack_id, user_id)
);

create index if not exists pack_group_memberships_user_idx on public.pack_group_memberships (user_id);

alter table public.pack_groups enable row level security;
alter table public.pack_group_memberships enable row level security;

create policy "pack_groups_select_authenticated"
  on public.pack_groups
  for select
  to authenticated
  using (true);

create policy "pack_group_memberships_select_authenticated"
  on public.pack_group_memberships
  for select
  to authenticated
  using (true);
