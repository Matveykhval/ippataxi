-- IPPATAXI backend schema (Supabase / Postgres)
-- Run once in: Supabase dashboard -> SQL Editor -> New query -> Run.
-- (If upgrading an existing database, run supabase/004_driver_dispatch_rbac.sql instead.)
--
-- Security model (Strict RBAC)
--   * Public website (anon key): INSERT-only for bookings and messages. Cannot read anything.
--   * Owner ('owner' role in public.staff): Full access to bookings, messages, driver assignment, and deletion.
--   * Driver ('driver' role in public.staff):
--       - Can ONLY view pending unassigned rides (not declined by them) and rides assigned to their user_id.
--       - Can ONLY accept/decline pending rides or mark their own accepted rides as completed.
--       - Explicitly blocked from deleting rides, cancelling rides, or editing customer details.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- staff
create table if not exists public.staff (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  role          text not null default 'driver' check (role in ('owner', 'admin', 'senior_driver', 'driver')),
  is_blocked    boolean not null default false,
  last_login_at timestamptz
);
alter table public.staff enable row level security;

create or replace function public.is_staff() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_blocked boolean;
begin
  select is_blocked into v_blocked from public.staff where user_id = auth.uid();
  return coalesce(not v_blocked, false);
end;
$$;

create or replace function public.is_owner() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_role text;
  v_blocked boolean;
begin
  select role, is_blocked into v_role, v_blocked from public.staff where user_id = auth.uid();
  return coalesce(not v_blocked and v_role in ('owner', 'admin'), false);
end;
$$;

create or replace function public.is_driver() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_role text;
  v_blocked boolean;
begin
  select role, is_blocked into v_role, v_blocked from public.staff where user_id = auth.uid();
  return coalesce(not v_blocked and v_role in ('driver', 'senior_driver'), false);
end;
$$;

create or replace function public.can_read_messages() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_role text;
  v_blocked boolean;
begin
  select role, is_blocked into v_role, v_blocked from public.staff where user_id = auth.uid();
  return coalesce(not v_blocked and v_role in ('owner', 'admin', 'senior_driver'), false);
end;
$$;

drop policy if exists "staff read own row" on public.staff;
drop policy if exists "staff read all" on public.staff;
create policy "staff read all" on public.staff
  for select to authenticated using (true);

-- ------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  track_token        uuid not null default gen_random_uuid(),
  ref                text not null,
  name               text not null,
  phone              text not null,
  email              text,
  pickup             text not null,
  dropoff            text not null,
  pickup_at          timestamptz,
  vehicle            text,
  passengers         int,
  ippa               text,
  notes              text,
  status             text not null default 'pending'
                     check (status in ('pending', 'new', 'confirmed', 'accepted', 'assigned', 'completed', 'cancelled')),
  assigned_driver_id uuid references public.staff(user_id) on delete set null,
  driver             text,
  declined_by        uuid[] not null default '{}',
  internal_note      text
);
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create unique index if not exists bookings_track_token_idx on public.bookings (track_token);
create index if not exists bookings_dispatch_idx on public.bookings (status, assigned_driver_id, created_at desc);
alter table public.bookings enable row level security;

drop policy if exists "public can create bookings" on public.bookings;
create policy "public can create bookings" on public.bookings
  for insert to anon
  with check (
    status in ('pending', 'new')
    and assigned_driver_id is null
    and driver is null
    and internal_note is null
    and char_length(name)    between 1 and 100
    and char_length(phone)   between 5 and 30
    and char_length(pickup)  between 1 and 200
    and char_length(dropoff) between 1 and 200
    and email is not null and char_length(email) between 5 and 150 and position('@' in email) > 1
    and (notes is null or char_length(notes) <= 500)
  );

drop policy if exists "owner select bookings" on public.bookings;
create policy "owner select bookings" on public.bookings
  for select to authenticated using (public.is_owner());

drop policy if exists "owner update bookings" on public.bookings;
create policy "owner update bookings" on public.bookings
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "owner delete bookings" on public.bookings;
create policy "owner delete bookings" on public.bookings
  for delete to authenticated using (public.is_owner());

drop policy if exists "driver select bookings" on public.bookings;
create policy "driver select bookings" on public.bookings
  for select to authenticated
  using (
    public.is_driver()
    and (
      (assigned_driver_id is null and status in ('pending', 'new', 'confirmed') and not (auth.uid() = any(declined_by)))
      or assigned_driver_id = auth.uid()
    )
  );

drop policy if exists "driver update bookings" on public.bookings;
create policy "driver update bookings" on public.bookings
  for update to authenticated
  using (
    public.is_driver()
    and (
      (assigned_driver_id is null and status in ('pending', 'new', 'confirmed'))
      or assigned_driver_id = auth.uid()
    )
  )
  with check (
    public.is_driver()
    and (assigned_driver_id = auth.uid() or assigned_driver_id is null)
    and status in ('pending', 'new', 'confirmed', 'accepted', 'completed')
  );

-- ------------------------------------------------------------- messages
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text,
  email      text not null,
  message    text not null,
  status     text not null default 'new' check (status in ('new', 'read', 'replied', 'archived'))
);
create index if not exists messages_created_idx on public.messages (created_at desc);
alter table public.messages enable row level security;

drop policy if exists "public can send messages" on public.messages;
create policy "public can send messages" on public.messages
  for insert to anon
  with check (
    status = 'new'
    and char_length(name)    between 1 and 100
    and char_length(email)   between 3 and 150
    and char_length(message) between 1 and 2000
    and (phone is null or char_length(phone) <= 30)
  );

drop policy if exists "owner read messages" on public.messages;
create policy "owner read messages" on public.messages
  for select to authenticated using (public.is_owner());

drop policy if exists "owner update messages" on public.messages;
create policy "owner update messages" on public.messages
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "owner delete messages" on public.messages;
create policy "owner delete messages" on public.messages
  for delete to authenticated using (public.is_owner());

-- ----------------------------------------------------------- site_settings
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.site_settings (key, value)
values ('currency_mode', 'ippa')
on conflict (key) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists "admin write site_settings" on public.site_settings;
create policy "admin write site_settings" on public.site_settings
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ------------------------------------------------- grants (least privilege)
revoke all on public.bookings, public.messages, public.staff from anon, authenticated;
grant insert on public.bookings, public.messages to anon;
grant select, update, delete on public.bookings, public.messages to authenticated;
grant select on public.staff to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- ------------------------------------------------ make yourself the owner
-- 1) Create your user in Authentication -> Users.
-- 2) Replace the e-mail below and run this statement:
--
-- insert into public.staff (user_id, name, role)
-- select id, 'Your Name', 'owner' from auth.users where email = 'you@example.com';
--
-- Drivers: same, with role 'driver'.
