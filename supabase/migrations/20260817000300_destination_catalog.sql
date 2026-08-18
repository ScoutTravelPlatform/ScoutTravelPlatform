-- Adds a Destination level on top of the existing Supplier -> Property ->
-- Room Option catalog (supabase/migrations/20260809100000_supplier_catalog.sql),
-- so trip creation can filter suppliers by destination instead of scrolling
-- an unscoped list. Same shared, non-org-scoped posture as the rest of that
-- catalog: any authenticated advisor across any agency can read and add.

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index destinations_name_unique_idx on public.destinations (lower(trim(name)));

alter table public.suppliers add column destination_id uuid references public.destinations(id);
create index suppliers_destination_idx on public.suppliers (destination_id);

alter table public.destinations enable row level security;
create policy destinations_select on public.destinations for select to authenticated using (true);
create policy destinations_insert on public.destinations for insert to authenticated with check (true);
revoke all on table public.destinations from anon, authenticated;
grant select, insert on table public.destinations to authenticated;

create or replace function public.search_destinations(query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name from public.destinations d
  where auth.uid() is not null and length(trim(query)) > 0 and d.name ilike '%' || trim(query) || '%'
  order by d.name asc
  limit 20;
$$;

create or replace function public.find_or_create_destination(destination_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; new_id uuid; clean_name text := trim(destination_name);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(clean_name) not between 1 and 200 then raise exception 'invalid destination name'; end if;
  select d.id into existing_id from public.destinations d where lower(d.name) = lower(clean_name);
  if existing_id is not null then
    return query select d.id, d.name from public.destinations d where d.id = existing_id;
    return;
  end if;
  insert into public.destinations(name, created_by) values (clean_name, auth.uid()) returning destinations.id into new_id;
  return query select d.id, d.name from public.destinations d where d.id = new_id;
end;
$$;

-- New overloads (not replacements) of the existing supplier RPCs — Quotes
-- has no destination concept and keeps calling search_suppliers(text)/
-- find_or_create_supplier(text) completely unchanged. These destination-
-- scoped variants are additive, distinguished by parameter list.
create or replace function public.search_suppliers(destination_id uuid, query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name from public.suppliers s
  where auth.uid() is not null and s.destination_id = search_suppliers.destination_id
    and length(trim(query)) > 0 and s.name ilike '%' || trim(query) || '%'
  order by s.name asc
  limit 20;
$$;

create or replace function public.find_or_create_supplier(destination_id uuid, supplier_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; new_id uuid; clean_name text := trim(supplier_name);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(clean_name) not between 1 and 200 then raise exception 'invalid supplier name'; end if;
  select s.id into existing_id from public.suppliers s where lower(s.name) = lower(clean_name);
  if existing_id is not null then
    update public.suppliers set destination_id = coalesce(suppliers.destination_id, find_or_create_supplier.destination_id)
      where suppliers.id = existing_id;
    return query select s.id, s.name from public.suppliers s where s.id = existing_id;
    return;
  end if;
  insert into public.suppliers(name, destination_id, created_by)
    values (clean_name, find_or_create_supplier.destination_id, auth.uid()) returning suppliers.id into new_id;
  return query select s.id, s.name from public.suppliers s where s.id = new_id;
end;
$$;

revoke all on function public.search_destinations(text) from public;
revoke all on function public.find_or_create_destination(text) from public;
revoke all on function public.search_suppliers(uuid, text) from public;
revoke all on function public.find_or_create_supplier(uuid, text) from public;
grant execute on function public.search_destinations(text) to authenticated;
grant execute on function public.find_or_create_destination(text) to authenticated;
grant execute on function public.search_suppliers(uuid, text) to authenticated;
grant execute on function public.find_or_create_supplier(uuid, text) to authenticated;

-- Seed: link the destination-specific suppliers already seeded in
-- 20260809100000_supplier_catalog.sql. Cruise lines and Sandals stay
-- unassigned — they don't map to one Orlando-area destination.
do $$
declare wdw_id uuid; universal_dest_id uuid;
begin
  insert into public.destinations(name) values ('Walt Disney World Resort') on conflict do nothing;
  insert into public.destinations(name) values ('Universal Orlando Resort') on conflict do nothing;

  select id into wdw_id from public.destinations where lower(name) = lower('Walt Disney World Resort');
  select id into universal_dest_id from public.destinations where lower(name) = lower('Universal Orlando Resort');

  update public.suppliers set destination_id = wdw_id where lower(name) = lower('Disney Destinations');
  update public.suppliers set destination_id = universal_dest_id where lower(name) = lower('Universal Orlando');
end $$;
