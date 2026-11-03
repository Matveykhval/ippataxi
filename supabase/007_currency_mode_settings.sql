-- ============================================================================
-- IPPATAXI Migration 007: Global Currency Mode Toggle (Ippa vs Real Money)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1. Create global site_settings table to store 'currency_mode' ('ippa' | 'real_money')
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Seed default currency mode ('ippa')
insert into public.site_settings (key, value)
values ('currency_mode', 'ippa')
on conflict (key) do nothing;

-- 2. Enable Row Level Security (RLS)
alter table public.site_settings enable row level security;

-- Everyone (including public website visitors) can read site_settings
drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings
  for select to anon, authenticated
  using (true);

-- Only Owners and Admins can insert/update site_settings
drop policy if exists "admin write site_settings" on public.site_settings;
create policy "admin write site_settings" on public.site_settings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- 3. Helper RPCs for reading and toggling currency mode
create or replace function public.get_currency_mode()
returns text
language plpgsql security definer set search_path = public stable as $$
declare
  v_mode text;
begin
  select value into v_mode from public.site_settings where key = 'currency_mode';
  return coalesce(v_mode, 'ippa');
end;
$$;

create or replace function public.set_currency_mode(p_mode text)
returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Forbidden: alleen beheerders mogen de valuta-modus wijzigen.';
  end if;

  if p_mode not in ('ippa', 'real_money') then
    raise exception 'Ongeldige valuta-modus. Kies ippa of real_money.';
  end if;

  insert into public.site_settings (key, value, updated_at, updated_by)
  values ('currency_mode', p_mode, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  return p_mode;
end;
$$;

-- 4. Grants
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
grant execute on function public.get_currency_mode() to anon, authenticated;
grant execute on function public.set_currency_mode(text) to authenticated;
