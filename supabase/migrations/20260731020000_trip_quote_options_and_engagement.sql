create table public.trip_quote_options (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.trip_quotes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  supplier text not null check (length(trim(supplier)) between 1 and 200),
  resort_name text,
  image_url text,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  deposit_amount numeric(12,2) check (deposit_amount is null or deposit_amount >= 0),
  is_recommended boolean not null default false,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_quote_options_quote_idx
  on public.trip_quote_options(quote_id, sort_order, created_at desc);
create index trip_quote_options_organization_idx
  on public.trip_quote_options(organization_id, is_recommended, sort_order);

create table public.trip_quote_views (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.trip_quotes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  time_on_page_seconds integer not null default 0 check (time_on_page_seconds >= 0),
  created_at timestamptz not null default now()
);

create index trip_quote_views_quote_idx
  on public.trip_quote_views(quote_id, viewed_at desc);

create table public.trip_quote_option_interactions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.trip_quotes(id) on delete cascade,
  option_id uuid not null references public.trip_quote_options(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('favorite', 'details', 'compare')),
  created_at timestamptz not null default now()
);

create index trip_quote_option_interactions_quote_idx
  on public.trip_quote_option_interactions(quote_id, interaction_type, created_at desc);

create or replace function public.inherit_trip_quote_option_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id
  from public.trip_quotes
  where id = new.quote_id;

  if new.organization_id is null then
    raise exception 'quote option trip is unavailable';
  end if;

  return new;
end;
$$;

create or replace function public.inherit_trip_quote_engagement_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id
  from public.trip_quotes
  where id = new.quote_id;

  if new.organization_id is null then
    raise exception 'quote engagement trip is unavailable';
  end if;

  return new;
end;
$$;

create trigger trip_quote_options_inherit_organization
before insert or update of quote_id on public.trip_quote_options
for each row execute function public.inherit_trip_quote_option_organization();

create trigger trip_quote_options_updated_at
before update on public.trip_quote_options
for each row execute function public.set_updated_at();

create trigger trip_quote_views_inherit_organization
before insert or update of quote_id on public.trip_quote_views
for each row execute function public.inherit_trip_quote_engagement_organization();

create trigger trip_quote_option_interactions_inherit_organization
before insert or update of quote_id on public.trip_quote_option_interactions
for each row execute function public.inherit_trip_quote_engagement_organization();

alter table public.trip_quote_options enable row level security;
alter table public.trip_quote_views enable row level security;
alter table public.trip_quote_option_interactions enable row level security;

create policy trip_quote_options_select on public.trip_quote_options
for select to authenticated
using (public.is_org_member(organization_id));

create policy trip_quote_options_insert on public.trip_quote_options
for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
);

create policy trip_quote_options_update on public.trip_quote_options
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

create policy trip_quote_options_delete on public.trip_quote_options
for delete to authenticated
using (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor']::public.app_role[]
  )
);

create policy trip_quote_views_select on public.trip_quote_views
for select to authenticated
using (public.is_org_member(organization_id));

create policy trip_quote_views_insert on public.trip_quote_views
for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
);

create policy trip_quote_option_interactions_select on public.trip_quote_option_interactions
for select to authenticated
using (public.is_org_member(organization_id));

create policy trip_quote_option_interactions_insert on public.trip_quote_option_interactions
for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
);
