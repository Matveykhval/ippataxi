-- IPPATAXI backend schema (Supabase / Postgres)
-- Run once in: Supabase dashboard -> SQL Editor -> New query -> Run.
--
-- Security model
--   * The public website (anon key) can ONLY insert new bookings/messages. It can never read them.
--   * Only logged-in users listed in `staff` can read/update. Only 'owner' can delete.
--   * Turn OFF public sign-ups (Authentication -> Sign In / Providers -> "Allow new users to sign up"),
--     then create users manually (Authentication -> Users -> Add user).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- staff
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name    text not null,
  role    text not null default 'driver' check (role in ('owner', 'driver'))
);
alter table public.staff enable row level security;

create or replace function public.is_staff() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'owner');
$$;

drop policy if exists "staff read own row" on public.staff;
create policy "staff read own row" on public.staff
  for select to authenticated using (user_id = auth.uid() or public.is_owner());

-- ------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  ref          text not null,
  name         text not null,
  phone        text not null,
  email        text,
  pickup       text not null,
  dropoff      text not null,
  pickup_at    timestamptz,
  vehicle      text,
  passengers   int,
  ippa         text,
  notes        text,
  status       text not null default 'new'
               check (status in ('new', 'confirmed', 'assigned', 'completed', 'cancelled')),
  driver       text,
  internal_note text
);
create index if not exists bookings_created_idx on public.bookings (created_at desc);
alter table public.bookings enable row level security;

drop policy if exists "public can create bookings" on public.bookings;
create policy "public can create bookings" on public.bookings
  for insert to anon
  with check (
    status = 'new' and driver is null and internal_note is null
    and char_length(name)    between 1 and 100
    and char_length(phone)   between 5 and 30
    and char_length(pickup)  between 1 and 200
    and char_length(dropoff) between 1 and 200
    and (email is null or char_length(email) <= 150)
    and (notes is null or char_length(notes) <= 500)
  );

drop policy if exists "staff read bookings" on public.bookings;
create policy "staff read bookings" on public.bookings
  for select to authenticated using (public.is_staff());

drop policy if exists "staff update bookings" on public.bookings;
create policy "staff update bookings" on public.bookings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "owner delete bookings" on public.bookings;
create policy "owner delete bookings" on public.bookings
  for delete to authenticated using (public.is_owner());

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

drop policy if exists "staff read messages" on public.messages;
create policy "staff read messages" on public.messages
  for select to authenticated using (public.is_staff());

drop policy if exists "staff update messages" on public.messages;
create policy "staff update messages" on public.messages
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "owner delete messages" on public.messages;
create policy "owner delete messages" on public.messages
  for delete to authenticated using (public.is_owner());

-- ------------------------------------------------- grants (least privilege)
revoke all on public.bookings, public.messages, public.staff from anon, authenticated;
grant insert on public.bookings, public.messages to anon;
grant select, update, delete on public.bookings, public.messages to authenticated;
grant select on public.staff to authenticated;

-- ------------------------------------------------ make yourself the owner
-- 1) Create your user in Authentication -> Users.
-- 2) Replace the e-mail below and run this statement:
--
-- insert into public.staff (user_id, name, role)
-- select id, 'Your Name', 'owner' from auth.users where email = 'you@example.com';
--
-- Drivers: same, with role 'driver'.

