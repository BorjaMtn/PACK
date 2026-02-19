alter table public.chats
add column if not exists therian_type text;

alter table public.chats
alter column match_id drop not null;

create unique index if not exists chats_therian_type_unique_idx
  on public.chats (therian_type)
  where therian_type is not null;

do $$
begin
  alter table public.chats
  add constraint chats_match_or_pack_check
  check (
    ((match_id is not null)::int + (therian_type is not null)::int) = 1
  );
exception
  when duplicate_object then null;
end
$$;

drop policy if exists "chats_select_involved" on public.chats;
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
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and chats.therian_type is not null
        and p.therian_type = chats.therian_type
    )
  );

drop policy if exists "chats_insert_involved" on public.chats;
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
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and chats.therian_type is not null
        and p.therian_type = chats.therian_type
    )
  );

drop policy if exists "messages_select_involved" on public.messages;
create policy "messages_select_involved"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chats c
      left join public.matches m on m.id = c.match_id
      left join public.profiles p on p.id = auth.uid()
      where c.id = messages.chat_id
        and (
          (m.user_a = auth.uid() or m.user_b = auth.uid())
          or (c.therian_type is not null and p.therian_type = c.therian_type)
        )
    )
  );

drop policy if exists "messages_insert_sender_involved" on public.messages;
create policy "messages_insert_sender_involved"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chats c
      left join public.matches m on m.id = c.match_id
      left join public.profiles p on p.id = auth.uid()
      where c.id = messages.chat_id
        and (
          (m.user_a = auth.uid() or m.user_b = auth.uid())
          or (c.therian_type is not null and p.therian_type = c.therian_type)
        )
    )
  );
