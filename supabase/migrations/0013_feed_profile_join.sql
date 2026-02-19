drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

do $$
begin
  alter table public.posts
  add constraint posts_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade
  not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.posts
  validate constraint posts_user_id_profiles_fkey;
exception
  when others then null;
end
$$;
