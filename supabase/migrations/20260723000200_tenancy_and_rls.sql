-- Staged multi-tenant security migration.
-- Existing business rows remain nullable until they are assigned to an
-- organization. Once RLS is enabled, unassigned legacy rows are intentionally
-- inaccessible through public clients.

-- Remove the prototype policies. These policies grant unrestricted access to
-- anon/public and would override the tenant policies below if left in place.
drop policy if exists "Temporary client insert testing" on public.clients;
drop policy if exists "Temporary client read testing" on public.clients;
drop policy if exists "Temporary trip insert testing" on public.trips;
drop policy if exists "Temporary trip read testing" on public.trips;
drop policy if exists "Allow trip updates" on public.trips;
drop policy if exists "Allow booking task reads" on public.booking_tasks;
drop policy if exists "Allow booking task inserts" on public.booking_tasks;
drop policy if exists "Allow booking task updates" on public.booking_tasks;
drop policy if exists "Allow booking task deletes" on public.booking_tasks;
drop policy if exists "Allow booking payment reads" on public.booking_payments;
drop policy if exists "Allow booking payment inserts" on public.booking_payments;
drop policy if exists "Allow booking payment updates" on public.booking_payments;
drop policy if exists "Allow booking payment deletes" on public.booking_payments;
drop policy if exists "Allow commission reads" on public.booking_commissions;
drop policy if exists "Allow commission inserts" on public.booking_commissions;
drop policy if exists "Allow commission updates" on public.booking_commissions;
drop policy if exists "Allow commission deletes" on public.booking_commissions;
drop policy if exists "Allow timeline reads" on public.booking_timeline_events;
drop policy if exists "Allow timeline inserts" on public.booking_timeline_events;
drop policy if exists "Allow timeline updates" on public.booking_timeline_events;
drop policy if exists "Allow timeline deletes" on public.booking_timeline_events;

create type public.app_role as enum ('owner', 'admin', 'advisor', 'assistant', 'finance', 'read_only');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 150),
  slug text unique,
  timezone text not null default 'America/New_York',
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'advisor',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.clients add column organization_id uuid references public.organizations(id);
alter table public.clients add column primary_advisor_id uuid references auth.users(id);
alter table public.clients add column created_by uuid references auth.users(id);
alter table public.clients add column updated_at timestamptz not null default now();

alter table public.trips add column organization_id uuid references public.organizations(id);
alter table public.trips add column assigned_advisor_id uuid references auth.users(id);
alter table public.trips add column created_by uuid references auth.users(id);
alter table public.trips add column updated_at timestamptz not null default now();

alter table public.booking_tasks add column organization_id uuid references public.organizations(id);
alter table public.booking_tasks add column assignee_id uuid references auth.users(id);
alter table public.booking_tasks add column created_by uuid references auth.users(id);
alter table public.booking_tasks add column updated_at timestamptz not null default now();

alter table public.booking_payments add column organization_id uuid references public.organizations(id);
alter table public.booking_payments add column created_by uuid references auth.users(id);
alter table public.booking_payments add column updated_at timestamptz not null default now();

alter table public.booking_commissions add column organization_id uuid references public.organizations(id);
alter table public.booking_commissions add column created_by uuid references auth.users(id);
alter table public.booking_commissions add column updated_at timestamptz not null default now();

alter table public.booking_timeline_events add column organization_id uuid references public.organizations(id);
alter table public.booking_timeline_events add column created_by uuid references auth.users(id);
alter table public.booking_timeline_events add column updated_at timestamptz not null default now();

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_memberships_user_idx on public.organization_memberships(user_id, organization_id);
create index clients_organization_idx on public.clients(organization_id);
create index trips_organization_idx on public.trips(organization_id);
create index booking_tasks_organization_idx on public.booking_tasks(organization_id);
create index booking_payments_organization_idx on public.booking_payments(organization_id);
create index booking_commissions_organization_idx on public.booking_commissions(organization_id);
create index booking_timeline_organization_idx on public.booking_timeline_events(organization_id);
create index audit_events_organization_created_idx on public.audit_events(organization_id, created_at desc);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.app_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated;

create or replace function public.create_organization(organization_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_organization_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(organization_name)) not between 1 and 150 then raise exception 'invalid organization name'; end if;

  insert into public.organizations(name) values (trim(organization_name)) returning id into new_organization_id;
  insert into public.organization_memberships(organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'owner');
  return new_organization_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''));
  return new;
end;
$$;

insert into public.profiles(id, full_name)
select id, nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', '')), '')
from auth.users
on conflict (id) do nothing;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.inherit_trip_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id from public.clients where id = new.client_id;
  new.created_by = coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

create trigger trips_inherit_organization before insert or update of client_id on public.trips
for each row execute function public.inherit_trip_organization();

create or replace function public.inherit_child_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id from public.trips where id = new.trip_id;
  new.created_by = coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

create trigger tasks_inherit_organization before insert or update of trip_id on public.booking_tasks for each row execute function public.inherit_child_organization();
create trigger payments_inherit_organization before insert or update of trip_id on public.booking_payments for each row execute function public.inherit_child_organization();
create trigger commissions_inherit_organization before insert or update of trip_id on public.booking_commissions for each row execute function public.inherit_child_organization();
create trigger timeline_inherit_organization before insert or update of trip_id on public.booking_timeline_events for each row execute function public.inherit_child_organization();

create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.booking_tasks for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.booking_payments for each row execute function public.set_updated_at();
create trigger commissions_updated_at before update on public.booking_commissions for each row execute function public.set_updated_at();
create trigger timeline_updated_at before update on public.booking_timeline_events for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.clients enable row level security;
alter table public.trips enable row level security;
alter table public.booking_tasks enable row level security;
alter table public.booking_payments enable row level security;
alter table public.booking_commissions enable row level security;
alter table public.booking_timeline_events enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated using (public.has_org_role(id, array['owner','admin']::public.app_role[])) with check (public.has_org_role(id, array['owner','admin']::public.app_role[]));
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy memberships_select on public.organization_memberships for select to authenticated using (public.is_org_member(organization_id));
create policy memberships_insert on public.organization_memberships for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));
create policy memberships_update on public.organization_memberships for update to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));
create policy memberships_delete on public.organization_memberships for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy clients_select on public.clients for select to authenticated using (public.is_org_member(organization_id));
create policy clients_insert on public.clients for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy clients_update on public.clients for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy clients_delete on public.clients for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy trips_select on public.trips for select to authenticated using (public.is_org_member(organization_id));
create policy trips_insert on public.trips for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy trips_update on public.trips for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy trips_delete on public.trips for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy tasks_select on public.booking_tasks for select to authenticated using (public.is_org_member(organization_id));
create policy tasks_insert on public.booking_tasks for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy tasks_update on public.booking_tasks for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy tasks_delete on public.booking_tasks for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));

create policy payments_select on public.booking_payments for select to authenticated using (public.is_org_member(organization_id));
create policy payments_insert on public.booking_payments for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant','finance']::public.app_role[]));
create policy payments_update on public.booking_payments for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant','finance']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant','finance']::public.app_role[]));
create policy payments_delete on public.booking_payments for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

create policy commissions_select on public.booking_commissions for select to authenticated using (public.is_org_member(organization_id));
create policy commissions_insert on public.booking_commissions for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant','finance']::public.app_role[]));
create policy commissions_update on public.booking_commissions for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant','finance']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant','finance']::public.app_role[]));
create policy commissions_delete on public.booking_commissions for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

create policy timeline_select on public.booking_timeline_events for select to authenticated using (public.is_org_member(organization_id));
create policy timeline_insert on public.booking_timeline_events for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy timeline_update on public.booking_timeline_events for update to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])) with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy timeline_delete on public.booking_timeline_events for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy audit_select on public.audit_events for select to authenticated using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

-- Before enabling SCOUT_AUTH_ENABLED, assign every legacy client to an
-- organization, then backfill descendants and make organization_id NOT NULL.
