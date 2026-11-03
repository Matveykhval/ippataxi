-- ============================================================================
-- IPPATAXI Migration 004: Driver Dispatch, Assigned Driver Tracking & Strict RBAC
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1. Update bookings schema with assigned_driver_id, declined_by, and status values
alter table public.bookings
  add column if not exists assigned_driver_id uuid references public.staff(user_id) on delete set null,
  add column if not exists declined_by uuid[] not null default '{}';

-- Normalize existing 'new' unassigned rides to 'pending'
update public.bookings
set status = 'pending'
where status = 'new' and assigned_driver_id is null;

-- Allow both new RBAC statuses ('pending', 'accepted', 'completed') and legacy statuses
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'new', 'confirmed', 'accepted', 'assigned', 'completed', 'cancelled'));

alter table public.bookings alter column status set default 'pending';

create index if not exists bookings_dispatch_idx
  on public.bookings (status, assigned_driver_id, created_at desc);

-- 2. Role helper functions (Direct lookup without RLS recursion)
create or replace function public.is_staff() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_exists boolean;
begin
  select exists (select 1 from public.staff where user_id = auth.uid()) into v_exists;
  return coalesce(v_exists, false);
end;
$$;

create or replace function public.is_owner() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_role text;
begin
  select role into v_role from public.staff where user_id = auth.uid();
  return coalesce(v_role = 'owner', false);
end;
$$;

create or replace function public.is_driver() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_role text;
begin
  select role into v_role from public.staff where user_id = auth.uid();
  return coalesce(v_role = 'driver', false);
end;
$$;

-- 3. Strict column-level & state-transition trigger for drivers
-- Explicitly blocks drivers from editing customer details, internal notes, or cancelling rides.
-- Admins/owners have full unrestricted permissions to edit all fields.
create or replace function public.enforce_booking_rbac()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_driver_name text;
begin
  -- Resolve caller's role from staff table
  select role into v_role from public.staff where user_id = auth.uid();

  -- If caller is owner OR service_role, grant full unrestricted edit access
  if v_role = 'owner' or current_setting('request.jwt.claim.role', true) = 'service_role' then
    if new.assigned_driver_id is not null and (old.assigned_driver_id is distinct from new.assigned_driver_id) then
      select name into v_driver_name from public.staff where user_id = new.assigned_driver_id;
      if v_driver_name is not null then
        new.driver := v_driver_name;
      end if;
    elsif new.assigned_driver_id is null and old.assigned_driver_id is not null then
      new.driver := null;
    end if;
    return new;
  end if;

  -- Driver restrictions (strictly enforced ONLY for accounts with role = 'driver')
  if v_role = 'driver' then
    -- Block editing any customer or ride details
    if new.ref is distinct from old.ref
       or new.name is distinct from old.name
       or new.phone is distinct from old.phone
       or new.email is distinct from old.email
       or new.pickup is distinct from old.pickup
       or new.dropoff is distinct from old.dropoff
       or new.pickup_at is distinct from old.pickup_at
       or new.vehicle is distinct from old.vehicle
       or new.passengers is distinct from old.passengers
       or new.ippa is distinct from old.ippa
       or new.notes is distinct from old.notes
       or new.internal_note is distinct from old.internal_note
       or new.track_token is distinct from old.track_token
       or new.created_at is distinct from old.created_at then
      raise exception 'Forbidden: drivers are not permitted to edit customer or ride details.';
    end if;

    -- Explicitly block drivers from cancelling rides
    if new.status = 'cancelled' then
      raise exception 'Forbidden: drivers are not permitted to cancel rides.';
    end if;

    -- Case 1: Driver declines an unassigned pending ride
    if old.assigned_driver_id is null
       and new.assigned_driver_id is null
       and new.status = old.status then
      return new;
    end if;

    -- Case 2: Driver accepts an unassigned pending ride
    if old.assigned_driver_id is null
       and old.status in ('pending', 'new', 'confirmed')
       and new.assigned_driver_id = auth.uid()
       and new.status = 'accepted' then
      select name into v_driver_name from public.staff where user_id = auth.uid();
      new.driver := v_driver_name;
      return new;
    end if;

    -- Case 3: Driver completes a ride already assigned to them
    if old.assigned_driver_id = auth.uid()
       and new.assigned_driver_id = auth.uid()
       and new.status in ('accepted', 'completed') then
      return new;
    end if;

    raise exception 'Forbidden: drivers may only accept pending rides or complete their own assigned rides.';
  end if;

  -- Fallback for any other authenticated staff: allow update
  return new;
end;
$$;

drop trigger if exists trg_enforce_booking_rbac on public.bookings;
create trigger trg_enforce_booking_rbac
  before update on public.bookings
  for each row execute function public.enforce_booking_rbac();

-- 4. Atomic RPC functions for Driver Accept / Decline / Complete
create or replace function public.accept_ride(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_row public.bookings;
  v_name text;
begin
  if not (public.is_driver() or public.is_owner()) then
    raise exception 'Forbidden: only registered drivers can accept rides.';
  end if;

  select name into v_name from public.staff where user_id = auth.uid();

  update public.bookings
  set assigned_driver_id = auth.uid(),
      driver = v_name,
      status = 'accepted'
  where id = p_booking_id
    and assigned_driver_id is null
    and status in ('pending', 'new', 'confirmed')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Deze rit is zojuist door een andere chauffeur geaccepteerd of niet meer beschikbaar.';
  end if;

  return v_row;
end;
$$;

create or replace function public.decline_ride(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_driver() or public.is_owner()) then
    raise exception 'Forbidden: only registered drivers can decline rides.';
  end if;

  update public.bookings
  set declined_by = array_append(array_remove(declined_by, auth.uid()), auth.uid())
  where id = p_booking_id
    and assigned_driver_id is null;
end;
$$;

create or replace function public.complete_ride(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_row public.bookings;
begin
  if not (public.is_driver() or public.is_owner()) then
    raise exception 'Forbidden: unauthorized.';
  end if;

  update public.bookings
  set status = 'completed'
  where id = p_booking_id
    and (assigned_driver_id = auth.uid() or public.is_owner())
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Rit kon niet worden afgerond.';
  end if;

  return v_row;
end;
$$;

revoke all on function public.accept_ride(uuid) from public;
revoke all on function public.decline_ride(uuid) from public;
revoke all on function public.complete_ride(uuid) from public;
grant execute on function public.accept_ride(uuid) to authenticated;
grant execute on function public.decline_ride(uuid) to authenticated;
grant execute on function public.complete_ride(uuid) to authenticated;

-- 5. Update Row Level Security Policies for Strict RBAC
-- Staff table: authenticated staff can read staff list (needed for driver selection and role checks without recursion)
drop policy if exists "staff read own row" on public.staff;
drop policy if exists "staff read all" on public.staff;
create policy "staff read all" on public.staff
  for select to authenticated
  using (true);

-- Public booking creation: allow 'pending' or 'new' initial status
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

-- Drop permissive staff policies on bookings and replace with role-specific policies
drop policy if exists "staff read bookings" on public.bookings;
drop policy if exists "staff update bookings" on public.bookings;
drop policy if exists "owner delete bookings" on public.bookings;
drop policy if exists "owner select bookings" on public.bookings;
drop policy if exists "owner update bookings" on public.bookings;
drop policy if exists "driver select bookings" on public.bookings;
drop policy if exists "driver update bookings" on public.bookings;

-- Owner policies: full read, update, delete on bookings
create policy "owner select bookings" on public.bookings
  for select to authenticated
  using (public.is_owner());

create policy "owner update bookings" on public.bookings
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "owner delete bookings" on public.bookings
  for delete to authenticated
  using (public.is_owner());

-- Driver policies:
-- 1) Can ONLY view unassigned pending rides (not declined by this driver) OR rides assigned to them
create policy "driver select bookings" on public.bookings
  for select to authenticated
  using (
    public.is_driver()
    and (
      (assigned_driver_id is null and status in ('pending', 'new', 'confirmed') and not (auth.uid() = any(declined_by)))
      or assigned_driver_id = auth.uid()
    )
  );

-- 2) Can ONLY update unassigned pending rides (to accept/decline) OR their own assigned rides (to complete)
--    Explicitly blocks 'cancelled' status and deleting rows.
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

-- Messages: restrict to owners only (drivers do not access customer inquiry inbox)
drop policy if exists "staff read messages" on public.messages;
drop policy if exists "staff update messages" on public.messages;
drop policy if exists "owner delete messages" on public.messages;

create policy "owner read messages" on public.messages
  for select to authenticated using (public.is_owner());

create policy "owner update messages" on public.messages
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

create policy "owner delete messages" on public.messages
  for delete to authenticated using (public.is_owner());

-- Update customer status tracking RPC to also resolve driver name from staff table if needed
create or replace function public.get_booking_status(p_token uuid)
returns table (
  ref text, status text, first_name text, pickup text, dropoff text,
  pickup_at timestamptz, vehicle text, ippa text, driver text
)
language sql security definer set search_path = public stable as $$
  select b.ref,
         b.status,
         split_part(b.name, ' ', 1),
         b.pickup,
         b.dropoff,
         b.pickup_at,
         b.vehicle,
         b.ippa,
         coalesce(s.name, b.driver) as driver
  from public.bookings b
  left join public.staff s on s.user_id = b.assigned_driver_id
  where b.track_token = p_token;
$$;

