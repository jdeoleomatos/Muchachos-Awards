create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

insert into public.app_users(username, password_hash, is_admin)
values (
  'admin@admin',
  extensions.crypt('adminbtadmin', extensions.gen_salt('bf')),
  true
)
on conflict (username) do nothing;
