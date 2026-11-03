-- ============================================================================
-- IPPATAXI Migration 005: Add 'admin' role support alongside 'owner'
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1. Allow 'admin' in staff table role constraint
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff drop constraint if exists staff_role_check1;
alter table public.staff add constraint staff_role_check
  check (role in ('owner', 'admin', 'driver'));

-- 2. Update is_owner helper to include both 'owner' and 'admin' for RLS access
create or replace function public.is_owner() returns boolean
language plpgsql security definer set search_path = public stable as $$
declare
  v_role text;
begin
  select role into v_role from public.staff where user_id = auth.uid();
  return coalesce(v_role in ('owner', 'admin'), false);
end;
$$;

-- 3. Update trigger: owners and admins have 100% full edit & dispatch control
create or replace function public.enforce_booking_rbac()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_driver_name text;
begin
  -- Resolve caller's role from staff table directly
  select role into v_role from public.staff where user_id = auth.uid();

  -- Owners and Admins have full administrative control to edit all fields
  if v_role in ('owner', 'admin') or current_setting('request.jwt.claim.role', true) = 'service_role' then
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

  -- Driver restrictions (strictly enforced ONLY for accounts where role = 'driver')
  if v_role = 'driver' then
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

    if new.status = 'cancelled' then
      raise exception 'Forbidden: drivers are not permitted to cancel rides.';
    end if;

    if old.assigned_driver_id is null and new.assigned_driver_id = auth.uid() and new.status = 'accepted' then
      select name into v_driver_name from public.staff where user_id = auth.uid();
      new.driver := v_driver_name;
      return new;
    end if;

    if old.assigned_driver_id is null and new.assigned_driver_id is null and new.status = old.status then
      return new;
    end if;

    if old.assigned_driver_id = auth.uid() and new.status in ('accepted', 'completed') then
      return new;
    end if;

    raise exception 'Forbidden: drivers may only accept pending rides or complete their own assigned rides.';
  end if;

  -- Fallback: allow update
  return new;
end;
$$;

-- Example: To add a new Admin (replace email and name):
-- insert into public.staff (user_id, name, role)
-- select id, 'Admin Naam', 'admin'
-- from auth.users
-- where email = 'admin@ippataxi.nl';
