-- Shared supplier/property/room-option catalog powering cascading dropdowns
-- on trip and quote forms. Unlike every other table in this schema, this one
-- is NOT organization_id-scoped: real-world suppliers (Disney, Universal,
-- cruise lines, etc.) aren't agency-specific, so every agency on Scout reads
-- and contributes to the same shared catalog. Trip/quote rows still store
-- plain text (supplier/resort_hotel/resort_name/room_option) — this catalog
-- only powers the picker and dedupes what gets typed in, it is not a foreign
-- key relationship.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index suppliers_name_unique_idx on public.suppliers (lower(trim(name)));

create table public.supplier_properties (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index supplier_properties_name_unique_idx on public.supplier_properties (supplier_id, lower(trim(name)));
create index supplier_properties_supplier_idx on public.supplier_properties (supplier_id);

create table public.supplier_room_options (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.supplier_properties(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index supplier_room_options_name_unique_idx on public.supplier_room_options (property_id, lower(trim(name)));
create index supplier_room_options_property_idx on public.supplier_room_options (property_id);

alter table public.suppliers enable row level security;
alter table public.supplier_properties enable row level security;
alter table public.supplier_room_options enable row level security;

create policy suppliers_select on public.suppliers for select to authenticated using (true);
create policy suppliers_insert on public.suppliers for insert to authenticated with check (true);
create policy supplier_properties_select on public.supplier_properties for select to authenticated using (true);
create policy supplier_properties_insert on public.supplier_properties for insert to authenticated with check (true);
create policy supplier_room_options_select on public.supplier_room_options for select to authenticated using (true);
create policy supplier_room_options_insert on public.supplier_room_options for insert to authenticated with check (true);

revoke all on table public.suppliers from anon, authenticated;
revoke all on table public.supplier_properties from anon, authenticated;
revoke all on table public.supplier_room_options from anon, authenticated;
grant select, insert on table public.suppliers to authenticated;
grant select, insert on table public.supplier_properties to authenticated;
grant select, insert on table public.supplier_room_options to authenticated;

create or replace function public.search_suppliers(query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name from public.suppliers s
  where auth.uid() is not null and length(trim(query)) > 0 and s.name ilike '%' || trim(query) || '%'
  order by s.name asc
  limit 20;
$$;

create or replace function public.find_or_create_supplier(supplier_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; new_id uuid; clean_name text := trim(supplier_name);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(clean_name) not between 1 and 200 then raise exception 'invalid supplier name'; end if;
  select s.id into existing_id from public.suppliers s where lower(s.name) = lower(clean_name);
  if existing_id is not null then
    return query select s.id, s.name from public.suppliers s where s.id = existing_id;
    return;
  end if;
  insert into public.suppliers(name, created_by) values (clean_name, auth.uid()) returning suppliers.id into new_id;
  return query select s.id, s.name from public.suppliers s where s.id = new_id;
end;
$$;

create or replace function public.search_supplier_properties(supplier_id uuid, query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name from public.supplier_properties p
  where auth.uid() is not null and p.supplier_id = search_supplier_properties.supplier_id
    and length(trim(query)) > 0 and p.name ilike '%' || trim(query) || '%'
  order by p.name asc
  limit 20;
$$;

create or replace function public.find_or_create_supplier_property(supplier_id uuid, property_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; new_id uuid; clean_name text := trim(property_name);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(clean_name) not between 1 and 200 then raise exception 'invalid property name'; end if;
  if not exists (select 1 from public.suppliers s where s.id = find_or_create_supplier_property.supplier_id) then
    raise exception 'supplier not found';
  end if;
  select p.id into existing_id from public.supplier_properties p
    where p.supplier_id = find_or_create_supplier_property.supplier_id and lower(p.name) = lower(clean_name);
  if existing_id is not null then
    return query select p.id, p.name from public.supplier_properties p where p.id = existing_id;
    return;
  end if;
  insert into public.supplier_properties(supplier_id, name, created_by)
    values (find_or_create_supplier_property.supplier_id, clean_name, auth.uid()) returning supplier_properties.id into new_id;
  return query select p.id, p.name from public.supplier_properties p where p.id = new_id;
end;
$$;

create or replace function public.search_supplier_room_options(property_id uuid, query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.name from public.supplier_room_options r
  where auth.uid() is not null and r.property_id = search_supplier_room_options.property_id
    and length(trim(query)) > 0 and r.name ilike '%' || trim(query) || '%'
  order by r.name asc
  limit 20;
$$;

create or replace function public.find_or_create_supplier_room_option(property_id uuid, room_option_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; new_id uuid; clean_name text := trim(room_option_name);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(clean_name) not between 1 and 200 then raise exception 'invalid room option name'; end if;
  if not exists (select 1 from public.supplier_properties p where p.id = find_or_create_supplier_room_option.property_id) then
    raise exception 'property not found';
  end if;
  select r.id into existing_id from public.supplier_room_options r
    where r.property_id = find_or_create_supplier_room_option.property_id and lower(r.name) = lower(clean_name);
  if existing_id is not null then
    return query select r.id, r.name from public.supplier_room_options r where r.id = existing_id;
    return;
  end if;
  insert into public.supplier_room_options(property_id, name, created_by)
    values (find_or_create_supplier_room_option.property_id, clean_name, auth.uid()) returning supplier_room_options.id into new_id;
  return query select r.id, r.name from public.supplier_room_options r where r.id = new_id;
end;
$$;

revoke all on function public.search_suppliers(text) from public;
revoke all on function public.find_or_create_supplier(text) from public;
revoke all on function public.search_supplier_properties(uuid, text) from public;
revoke all on function public.find_or_create_supplier_property(uuid, text) from public;
revoke all on function public.search_supplier_room_options(uuid, text) from public;
revoke all on function public.find_or_create_supplier_room_option(uuid, text) from public;
grant execute on function public.search_suppliers(text) to authenticated;
grant execute on function public.find_or_create_supplier(text) to authenticated;
grant execute on function public.search_supplier_properties(uuid, text) to authenticated;
grant execute on function public.find_or_create_supplier_property(uuid, text) to authenticated;
grant execute on function public.search_supplier_room_options(uuid, text) to authenticated;
grant execute on function public.find_or_create_supplier_room_option(uuid, text) to authenticated;

alter table public.trips add column room_option text;
alter table public.trip_quote_options add column room_option text;

-- Starter catalog of well-known real suppliers so the dropdowns aren't empty on day one.
do $$
declare disney_id uuid; disney_cruise_id uuid; universal_id uuid; royal_caribbean_id uuid; norwegian_id uuid; sandals_id uuid;
declare grand_floridian_id uuid; polynesian_id uuid;
begin
  insert into public.suppliers(name) values ('Disney Destinations') on conflict do nothing;
  insert into public.suppliers(name) values ('Disney Cruise Line') on conflict do nothing;
  insert into public.suppliers(name) values ('Universal Orlando') on conflict do nothing;
  insert into public.suppliers(name) values ('Royal Caribbean International') on conflict do nothing;
  insert into public.suppliers(name) values ('Norwegian Cruise Line') on conflict do nothing;
  insert into public.suppliers(name) values ('Sandals Resorts') on conflict do nothing;

  select id into disney_id from public.suppliers where lower(name) = lower('Disney Destinations');
  select id into disney_cruise_id from public.suppliers where lower(name) = lower('Disney Cruise Line');
  select id into universal_id from public.suppliers where lower(name) = lower('Universal Orlando');
  select id into royal_caribbean_id from public.suppliers where lower(name) = lower('Royal Caribbean International');
  select id into norwegian_id from public.suppliers where lower(name) = lower('Norwegian Cruise Line');
  select id into sandals_id from public.suppliers where lower(name) = lower('Sandals Resorts');

  insert into public.supplier_properties(supplier_id, name) values
    (disney_id, 'Disney''s Grand Floridian Resort & Spa'),
    (disney_id, 'Disney''s Polynesian Village Resort'),
    (disney_id, 'Disney''s Contemporary Resort'),
    (disney_id, 'Disney''s Animal Kingdom Lodge'),
    (disney_id, 'Disney''s Beach Club Resort'),
    (disney_id, 'Aulani, A Disney Resort & Spa'),
    (disney_id, 'Magic Kingdom'),
    (disney_id, 'EPCOT'),
    (disney_id, 'Disney''s Hollywood Studios'),
    (disney_id, 'Disney''s Animal Kingdom Theme Park'),
    (disney_cruise_id, 'Disney Wish'),
    (disney_cruise_id, 'Disney Fantasy'),
    (universal_id, 'Universal''s Cabana Bay Beach Resort'),
    (universal_id, 'Loews Portofino Bay Hotel'),
    (universal_id, 'Universal Studios Florida'),
    (universal_id, 'Islands of Adventure'),
    (royal_caribbean_id, 'Icon of the Seas'),
    (royal_caribbean_id, 'Wonder of the Seas'),
    (royal_caribbean_id, 'Symphony of the Seas'),
    (norwegian_id, 'Norwegian Encore'),
    (norwegian_id, 'Norwegian Bliss'),
    (sandals_id, 'Sandals Royal Bahamian'),
    (sandals_id, 'Sandals Grande St. Lucian')
  on conflict do nothing;

  select id into grand_floridian_id from public.supplier_properties where supplier_id = disney_id and lower(name) = lower('Disney''s Grand Floridian Resort & Spa');
  select id into polynesian_id from public.supplier_properties where supplier_id = disney_id and lower(name) = lower('Disney''s Polynesian Village Resort');

  insert into public.supplier_room_options(property_id, name) values
    (grand_floridian_id, 'Theme Park View Room'),
    (grand_floridian_id, 'Standard View Room'),
    (grand_floridian_id, 'Club Level Room'),
    (polynesian_id, 'Deluxe Studio'),
    (polynesian_id, 'Lake View Room'),
    (polynesian_id, 'Standard Room')
  on conflict do nothing;
end $$;
