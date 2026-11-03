-- ============================================================================
-- IPPATAXI Migration 006: Staff Management Dashboard & Senior Driver Role
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1. Extend public.staff table with blocking, tracking, and role constraints
alter table public.staff
  add column if not exists is_blocked boolean not null default false,
  add column if not exists last_login_at timestamptz;

alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff drop constraint if exists staff_role_check1;
alter table public.staff add constraint staff_role_check
  check (role in ('owner', 'admin', 'senior_driver', 'driver'));

-- 2. Enhanced Role & Access Helper Functions
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

-- Senior drivers, Admins, and Owners can view and respond to messages
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

-- 3. Update Messages Policies: Senior Drivers can read & update status
drop policy if exists "owner read messages" on public.messages;
drop policy if exists "staff read messages" on public.messages;
create policy "staff read messages" on public.messages
  for select to authenticated
  using (public.can_read_messages());

drop policy if exists "owner update messages" on public.messages;
drop policy if exists "staff update messages" on public.messages;
create policy "staff update messages" on public.messages
  for update to authenticated
  using (public.can_read_messages())
  with check (public.can_read_messages());

drop policy if exists "owner delete messages" on public.messages;
create policy "owner delete messages" on public.messages
  for delete to authenticated
  using (public.is_owner());

-- 4. Update Booking RBAC Trigger: Blocked accounts blocked, senior drivers handled
create or replace function public.enforce_booking_rbac()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_blocked boolean;
  v_driver_name text;
begin
  select role, is_blocked into v_role, v_blocked from public.staff where user_id = auth.uid();

  if v_blocked = true then
    raise exception 'Forbidden: uw account is geblokkeerd. Neem contact op met de beheerder.';
  end if;

  -- Owners and Admins have full access
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

  -- Driver & Senior Driver restrictions
  if v_role in ('driver', 'senior_driver') then
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
      raise exception 'Forbidden: chauffeurs mogen klant- en ritgegevens niet bewerken.';
    end if;

    if new.status = 'cancelled' then
      raise exception 'Forbidden: chauffeurs mogen ritten niet annuleren.';
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

    raise exception 'Forbidden: chauffeurs mogen alleen beschikbare ritten accepteren of eigen ritten afronden.';
  end if;

  return new;
end;
$$;

-- 5. Staff Dashboard Overview RPC (Admin/Owner only)
-- Returns all staff members, their roles, login timestamps, and performance stats
create or replace function public.get_staff_dashboard()
returns table (
  user_id uuid,
  name text,
  email text,
  role text,
  is_blocked boolean,
  last_login_at timestamptz,
  created_at timestamptz,
  total_assigned bigint,
  total_completed bigint,
  active_rides bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Forbidden: alleen beheerders hebben toegang tot het personeelsoverzicht.';
  end if;

  return query
  select
    s.user_id,
    s.name,
    coalesce(u.email, 'Geen e-mail') as email,
    s.role,
    s.is_blocked,
    coalesce(s.last_login_at, u.last_sign_in_at) as last_login_at,
    coalesce(u.created_at, s.last_login_at, now()) as created_at,
    count(b.id) filter (where b.id is not null) as total_assigned,
    count(b.id) filter (where b.status = 'completed') as total_completed,
    count(b.id) filter (where b.status in ('accepted', 'assigned')) as active_rides
  from public.staff s
  left join auth.users u on u.id = s.user_id
  left join public.bookings b on b.assigned_driver_id = s.user_id
  group by s.user_id, s.name, u.email, s.role, s.is_blocked, s.last_login_at, u.last_sign_in_at, u.created_at
  order by
    case s.role
      when 'owner' then 1
      when 'admin' then 2
      when 'senior_driver' then 3
      else 4
    end,
    s.name asc;
end;
$$;

-- 6. RPC: Who drove what (ride history for a specific driver)
create or replace function public.get_driver_ride_history(p_driver_id uuid)
returns table (
  id uuid,
  ref text,
  name text,
  phone text,
  pickup text,
  dropoff text,
  pickup_at timestamptz,
  vehicle text,
  passengers int,
  ippa text,
  status text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  -- Caller must be admin/owner, or the driver inspecting their own history
  if not (public.is_owner() or auth.uid() = p_driver_id) then
    raise exception 'Forbidden: geen toegang tot ritgeschiedenis van deze chauffeur.';
  end if;

  return query
  select
    b.id,
    b.ref,
    b.name,
    b.phone,
    b.pickup,
    b.dropoff,
    b.pickup_at,
    b.vehicle,
    b.passengers,
    b.ippa,
    b.status,
    b.created_at
  from public.bookings b
  where b.assigned_driver_id = p_driver_id
  order by b.created_at desc
  limit 150;
end;
$$;

-- 7. RPC: Admin management actions (Block, Demote, Promote)
create or replace function public.update_staff_member(
  p_target_id uuid,
  p_role text,
  p_is_blocked boolean
)
returns public.staff
language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_target_curr_role text;
  v_updated public.staff;
begin
  if not public.is_owner() then
    raise exception 'Forbidden: alleen beheerders mogen personeelsrechten wijzigen.';
  end if;

  select role into v_caller_role from public.staff where user_id = auth.uid();
  select role into v_target_curr_role from public.staff where user_id = p_target_id;

  if v_target_curr_role is null then
    raise exception 'Medewerker niet gevonden.';
  end if;

  -- Protection: Nobody can block or demote the owner, except owner themself
  if v_target_curr_role = 'owner' and v_caller_role != 'owner' then
    raise exception 'Forbidden: beheerders kunnen de eigenaar niet blokkeren of demoten.';
  end if;

  -- Validate role
  if p_role not in ('owner', 'admin', 'senior_driver', 'driver') then
    raise exception 'Ongeldige rol opgegeven.';
  end if;

  -- Only owner can grant 'owner' role
  if p_role = 'owner' and v_caller_role != 'owner' then
    raise exception 'Forbidden: alleen de huidige eigenaar kan de eigenaarsrol overdragen.';
  end if;

  update public.staff
  set role = p_role,
      is_blocked = p_is_blocked
  where user_id = p_target_id
  returning * into v_updated;

  return v_updated;
end;
$$;

-- 8. RPC: Track login timestamp
create or replace function public.record_staff_login()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.staff
  set last_login_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.get_staff_dashboard() from public;
revoke all on function public.get_driver_ride_history(uuid) from public;
revoke all on function public.update_staff_member(uuid, text, boolean) from public;
revoke all on function public.record_staff_login() from public;

grant execute on function public.get_staff_dashboard() to authenticated;
grant execute on function public.get_driver_ride_history(uuid) to authenticated;
grant execute on function public.update_staff_member(uuid, text, boolean) to authenticated;
grant execute on function public.record_staff_login() to authenticated;
