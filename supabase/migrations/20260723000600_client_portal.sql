create table public.client_portal_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_portal_links_organization_idx on public.client_portal_links(organization_id);
create index client_portal_links_active_idx on public.client_portal_links(token_hash, expires_at) where revoked_at is null;

create trigger client_portal_links_inherit_organization
  before insert or update of trip_id on public.client_portal_links
  for each row execute function public.inherit_child_organization();
create trigger client_portal_links_updated_at
  before update on public.client_portal_links
  for each row execute function public.set_updated_at();

alter table public.client_portal_links enable row level security;
create policy client_portal_links_select on public.client_portal_links for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_portal_links_insert on public.client_portal_links for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_portal_links_update on public.client_portal_links for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_portal_links_delete on public.client_portal_links for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create or replace function public.get_client_portal(portal_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'trip', jsonb_build_object(
      'id', t.id,
      'trip_name', t.trip_name,
      'destination', t.destination,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'supplier', t.supplier,
      'resort_hotel', t.resort_hotel,
      'booking_number', t.booking_number,
      'client_name', trim(c.first_name || ' ' || c.last_name),
      'organization_name', o.name
    ),
    'itinerary_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_date', i.item_date,
        'start_time', i.start_time,
        'category', i.category,
        'title', i.title,
        'location', i.location,
        'confirmation_number', i.confirmation_number,
        'notes', i.notes
      ) order by i.item_date, i.start_time nulls last, i.sort_order, i.created_at)
      from public.itinerary_items i
      where i.trip_id = t.id and i.client_visible = true
    ), '[]'::jsonb),
    'important_dates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_date', e.event_date,
        'event_type', e.event_type,
        'title', e.title,
        'description', e.description
      ) order by e.event_date nulls last, e.created_at)
      from public.booking_timeline_events e
      where e.trip_id = t.id and e.client_visible = true and e.status <> 'Canceled'
    ), '[]'::jsonb)
  )
  from public.client_portal_links l
  join public.trips t on t.id = l.trip_id
  join public.clients c on c.id = t.client_id
  join public.organizations o on o.id = t.organization_id
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_client_portal(text) from public;
grant execute on function public.get_client_portal(text) to anon, authenticated;
