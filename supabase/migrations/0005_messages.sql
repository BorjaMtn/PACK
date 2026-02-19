create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_created_idx
  on public.messages (chat_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_involved"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chats c
      join public.matches m on m.id = c.match_id
      where c.id = messages.chat_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "messages_insert_sender_involved"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chats c
      join public.matches m on m.id = c.match_id
      where c.id = messages.chat_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end
$$;
