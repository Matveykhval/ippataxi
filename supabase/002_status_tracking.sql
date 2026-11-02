-- Status tracking for customers. Run once in Supabase -> SQL Editor (after schema.sql).

-- Secret, unguessable token per booking. It is the "password" inside the link customers get.
alter table public.bookings
  add column if not exists track_token uuid not null default gen_random_uuid();
create unique index if not exists bookings_track_token_idx on public.bookings (track_token);

-- Public lookup: returns ONLY non-sensitive fields, and only for the exact token.
-- (Visitors still cannot read the bookings table itself.)
create or replace function public.get_booking_status(p_token uuid)
returns table (
  ref text, status text, first_name text, pickup text, dropoff text,
  pickup_at timestamptz, vehicle text, ippa text, driver text
)
language sql security definer set search_path = public stable as $$
  select b.ref, b.status, split_part(b.name, ' ', 1), b.pickup, b.dropoff,
         b.pickup_at, b.vehicle, b.ippa, b.driver
  from public.bookings b
  where b.track_token = p_token;
$$;

revoke all on function public.get_booking_status(uuid) from public;
grant execute on function public.get_booking_status(uuid) to anon, authenticated;


-- E-mail is now required for new bookings (enforced for the public website).
drop policy if exists "public can create bookings" on public.bookings;
create policy "public can create bookings" on public.bookings
  for insert to anon
  with check (
    status = 'new' and driver is null and internal_note is null
    and char_length(name)    between 1 and 100
    and char_length(phone)   between 5 and 30
    and char_length(pickup)  between 1 and 200
    and char_length(dropoff) between 1 and 200
    and email is not null and char_length(email) between 5 and 150 and position('@' in email) > 1
    and (notes is null or char_length(notes) <= 500)
  );
