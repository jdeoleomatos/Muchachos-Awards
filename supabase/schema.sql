-- Muchachos Awards (sin Supabase Auth). Cooldown: frontend.
-- Supabase suele instalar extensiones en el schema "extensions".
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.categories add column if not exists description text;

create table if not exists public.nominees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.category_nominees (
  category_id uuid not null references public.categories(id) on delete cascade,
  nominee_id uuid not null references public.nominees(id) on delete cascade,
  votes_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (category_id, nominee_id)
);

create index if not exists category_nominees_category_idx on public.category_nominees(category_id);

alter table public.app_users enable row level security;
alter table public.categories enable row level security;
alter table public.nominees enable row level security;
alter table public.category_nominees enable row level security;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists nominees_public_read on public.nominees;
create policy nominees_public_read
on public.nominees
for select
to anon, authenticated
using (true);

drop policy if exists category_nominees_public_read on public.category_nominees;
create policy category_nominees_public_read
on public.category_nominees
for select
to anon, authenticated
using (true);

drop policy if exists app_users_block_all on public.app_users;
create policy app_users_block_all
on public.app_users
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists categories_block_write on public.categories;
create policy categories_block_write
on public.categories
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists nominees_block_write on public.nominees;
create policy nominees_block_write
on public.nominees
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists category_nominees_block_write on public.category_nominees;
create policy category_nominees_block_write
on public.category_nominees
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public._require_admin_by_password(p_username text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
begin
  select * into v_user from public.app_users where username = p_username;
  if v_user.id is null then
    raise exception 'Usuario o contraseña inválidos';
  end if;
  if v_user.password_hash <> extensions.crypt(p_password, v_user.password_hash) then
    raise exception 'Usuario o contraseña inválidos';
  end if;
  if coalesce(v_user.is_admin, false) = false then
    raise exception 'No autorizado';
  end if;
end;
$$;

create or replace function public.admin_login(p_username text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
begin
  select * into v_user from public.app_users where username = p_username;
  if v_user.id is null then
    return json_build_object('ok', false);
  end if;
  if v_user.password_hash <> extensions.crypt(p_password, v_user.password_hash) then
    return json_build_object('ok', false);
  end if;
  return json_build_object(
    'ok', true,
    'id', v_user.id,
    'username', v_user.username,
    'is_admin', v_user.is_admin
  );
end;
$$;

drop function if exists public.admin_create_category(text, text, text);
drop function if exists public.admin_create_category(text, text, text, text);
create or replace function public.admin_create_category(p_username text, p_password text, p_name text, p_description text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  perform public._require_admin_by_password(p_username, p_password);
  insert into public.categories(name, description)
  values (p_name, nullif(p_description, ''))
  returning id into v_id;
  return v_id;
end;
$$;

drop function if exists public.admin_clone_category(text, text, uuid, text, text);
create or replace function public.admin_clone_category(
  p_username text,
  p_password text,
  p_source_category_id uuid,
  p_new_name text,
  p_new_description text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_new_category_id uuid;
begin
  perform public._require_admin_by_password(p_username, p_password);

  insert into public.categories(name, description)
  values (p_new_name, nullif(p_new_description, ''))
  returning id into v_new_category_id;

  insert into public.category_nominees(category_id, nominee_id, votes_count)
  select v_new_category_id, cn.nominee_id, 0
  from public.category_nominees cn
  where cn.category_id = p_source_category_id
  on conflict (category_id, nominee_id) do nothing;

  return v_new_category_id;
end;
$$;

create or replace function public.admin_delete_category(p_username text, p_password text, p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_admin_by_password(p_username, p_password);
  delete from public.categories where id = p_category_id;
end;
$$;

drop function if exists public.admin_update_category_description(text, text, uuid, text);
create or replace function public.admin_update_category_description(
  p_username text,
  p_password text,
  p_category_id uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_updated integer;
begin
  perform public._require_admin_by_password(p_username, p_password);

  update public.categories
  set description = nullif(p_description, '')
  where id = p_category_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Categoría no encontrada';
  end if;
end;
$$;

create or replace function public.admin_add_nominee(p_username text, p_password text, p_category_id uuid, p_nominee_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_nominee_id uuid;
begin
  perform public._require_admin_by_password(p_username, p_password);

  insert into public.nominees(name) values (p_nominee_name)
  returning id into v_nominee_id;

  insert into public.category_nominees(category_id, nominee_id)
  values (p_category_id, v_nominee_id)
  on conflict (category_id, nominee_id) do nothing;

  return v_nominee_id;
end;
$$;

create or replace function public.admin_remove_nominee(p_username text, p_password text, p_category_id uuid, p_nominee_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_admin_by_password(p_username, p_password);
  delete from public.category_nominees
  where category_id = p_category_id and nominee_id = p_nominee_id;
end;
$$;

create or replace function public.cast_vote(p_category_id uuid, p_nominee_id uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_new_count integer;
begin
  update public.category_nominees
  set votes_count = votes_count + 1
  where category_id = p_category_id and nominee_id = p_nominee_id
  returning votes_count into v_new_count;

  if v_new_count is null then
    raise exception 'Nominado no encontrado en esta categoría';
  end if;

  return json_build_object('ok', true, 'votes_count', v_new_count);
end;
$$;

insert into public.app_users(username, password_hash, is_admin)
values (
  'admin@admin',
  extensions.crypt('adminbtadmin', extensions.gen_salt('bf')),
  true
)
on conflict (username) do nothing;
