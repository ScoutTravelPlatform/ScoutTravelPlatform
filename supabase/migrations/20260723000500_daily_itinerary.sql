create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  item_date date not null,
  start_time time,
  category text not null check (category in ('Park', 'Dining', 'Activity', 'Travel', 'Resort', 'Other')),
  title text not null check (length(trim(title)) between 1 and 200),
  location text,
  confirmation_number text,
  notes text,
  sort_order integer not null default 0,
  client_visible boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itinerary_items_trip_date_idx
  on public.itinerary_items(trip_id, item_date, start_time, sort_order);

create trigger itinerary_items_inherit_organization
  before insert or update of trip_id on public.itinerary_items
  for each row execute function public.inherit_child_organization();

create trigger itinerary_items_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

alter table public.itinerary_items enable row level security;

create policy itinerary_items_select on public.itinerary_items for select to authenticated
  using (public.is_org_member(organization_id));
create policy itinerary_items_insert on public.itinerary_items for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy itinerary_items_update on public.itinerary_items for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy itinerary_items_delete on public.itinerary_items for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
