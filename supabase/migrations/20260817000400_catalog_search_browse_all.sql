-- CatalogCombobox now searches as soon as a field is focused (browse-all),
-- not only after the advisor starts typing. Every catalog search RPC
-- previously required a non-empty query (length(trim(query)) > 0) and
-- returned nothing otherwise, which is exactly what made the picker feel
-- like it required typing first. Relaxes each to treat an empty query as
-- "show me everything" (still capped at 20, alphabetical) instead of
-- "show me nothing" — the ilike filter still applies once something is
-- actually typed.

create or replace function public.search_destinations(query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name from public.destinations d
  where auth.uid() is not null and (trim(query) = '' or d.name ilike '%' || trim(query) || '%')
  order by d.name asc
  limit 20;
$$;

create or replace function public.search_suppliers(query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name from public.suppliers s
  where auth.uid() is not null and (trim(query) = '' or s.name ilike '%' || trim(query) || '%')
  order by s.name asc
  limit 20;
$$;

create or replace function public.search_suppliers(destination_id uuid, query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name from public.suppliers s
  where auth.uid() is not null and s.destination_id = search_suppliers.destination_id
    and (trim(query) = '' or s.name ilike '%' || trim(query) || '%')
  order by s.name asc
  limit 20;
$$;

create or replace function public.search_supplier_properties(supplier_id uuid, query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name from public.supplier_properties p
  where auth.uid() is not null and p.supplier_id = search_supplier_properties.supplier_id
    and (trim(query) = '' or p.name ilike '%' || trim(query) || '%')
  order by p.name asc
  limit 20;
$$;

create or replace function public.search_supplier_room_options(property_id uuid, query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.name from public.supplier_room_options r
  where auth.uid() is not null and r.property_id = search_supplier_room_options.property_id
    and (trim(query) = '' or r.name ilike '%' || trim(query) || '%')
  order by r.name asc
  limit 20;
$$;
