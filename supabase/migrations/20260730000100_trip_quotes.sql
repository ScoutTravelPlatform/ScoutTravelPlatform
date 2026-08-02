create table public.trip_quotes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  supplier text not null check (length(trim(supplier)) between 1 and 200),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  deposit_amount numeric(12,2) check (deposit_amount is null or deposit_amount >= 0),
  expires_on date,
  status text not null default 'Draft'
    check (status in ('Draft', 'Sent', 'Accepted', 'Declined', 'Expired')),
  notes text,
  client_visible boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_quotes_organization_status_idx
  on public.trip_quotes(organization_id, status, expires_on);
create index trip_quotes_trip_idx on public.trip_quotes(trip_id, created_at desc);

create or replace function public.inherit_quote_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id
  from public.trips
  where id = new.trip_id;

  if new.organization_id is null then
    raise exception 'quote trip is unavailable';
  end if;

  new.created_by = coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

create trigger quotes_inherit_organization
before insert or update of trip_id on public.trip_quotes
for each row execute function public.inherit_quote_organization();

create trigger quotes_updated_at
before update on public.trip_quotes
for each row execute function public.set_updated_at();

alter table public.trip_quotes enable row level security;

create policy quotes_select on public.trip_quotes
for select to authenticated
using (public.is_org_member(organization_id));

create policy quotes_insert on public.trip_quotes
for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
);

create policy quotes_update on public.trip_quotes
for update to authenticated
using (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
)
with check (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
);

create policy quotes_delete on public.trip_quotes
for delete to authenticated
using (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor']::public.app_role[]
  )
);
