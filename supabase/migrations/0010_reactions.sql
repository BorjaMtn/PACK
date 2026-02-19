create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id),
  check (type in ('🐾', '🔥', '🌙', '🖤'))
);

create index if not exists reactions_post_idx on public.reactions (post_id, type);
create index if not exists reactions_user_idx on public.reactions (user_id, created_at desc);

alter table public.reactions enable row level security;

create policy "reactions_select_authenticated"
  on public.reactions
  for select
  to authenticated
  using (true);

create policy "reactions_insert_own"
  on public.reactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "reactions_update_own"
  on public.reactions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reactions_delete_own"
  on public.reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);
