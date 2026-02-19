do $$
begin
  alter table public.messages
  add constraint messages_sender_id_profiles_fkey
  foreign key (sender_id) references public.profiles (id) on delete cascade
  not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.messages
  validate constraint messages_sender_id_profiles_fkey;
exception
  when others then null;
end
$$;
