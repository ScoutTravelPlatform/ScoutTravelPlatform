-- Token-only foundation for supplier payment credentials.
-- Raw PANs, gift-card numbers, CVCs and PINs must never enter this database.

create type public.payment_credential_type as enum ('card', 'gift_card');
create type public.payment_credential_status as enum ('active', 'revoked', 'expired');

create table public.payment_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null default 'vgs' check (provider = 'vgs'),
  provider_reference text not null,
  credential_type public.payment_credential_type not null,
  display_label text not null check (length(trim(display_label)) between 1 and 100),
  brand text,
  last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
  expiration_month smallint check (expiration_month between 1 and 12),
  expiration_year smallint check (expiration_year between 2020 and 2200),
  status public.payment_credential_status not null default 'active',
  consent_version text not null,
  consent_recorded_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_reference)
);

comment on column public.payment_credentials.provider_reference is
  'Non-sensitive VGS alias or card-object identifier only. Never store raw payment data or CVC/PIN values.';

create table public.payment_credential_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  credential_id uuid not null references public.payment_credentials(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  supplier text not null check (length(trim(supplier)) between 1 and 150),
  purpose text not null check (length(trim(purpose)) between 1 and 500),
  maximum_amount numeric(12,2) check (maximum_amount is null or maximum_amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  authorized_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > authorized_at)
);

create table public.payment_credential_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  credential_id uuid not null references public.payment_credentials(id) on delete restrict,
  authorization_id uuid references public.payment_credential_authorizations(id) on delete set null,
  actor_user_id uuid references auth.users(id),
  action text not null check (action in ('created', 'viewed_masked', 'use_requested', 'used', 'failed', 'revoked')),
  supplier text,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index payment_credentials_client_idx on public.payment_credentials(client_id, status);
create index payment_credentials_org_idx on public.payment_credentials(organization_id, created_at desc);
create index payment_authorizations_trip_idx on public.payment_credential_authorizations(trip_id, created_at desc);
create index payment_events_credential_idx on public.payment_credential_events(credential_id, created_at desc);

create or replace function public.validate_payment_credential_tenant()
returns trigger language plpgsql set search_path = '' as $$
declare client_org uuid;
begin
  select organization_id into client_org from public.clients where id = new.client_id;
  if client_org is null or client_org <> new.organization_id then
    raise exception 'payment credential tenant mismatch';
  end if;
  new.created_by = coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

create or replace function public.validate_payment_authorization_tenant()
returns trigger language plpgsql set search_path = '' as $$
declare credential_org uuid; trip_org uuid; credential_client uuid; trip_client uuid;
begin
  select organization_id, client_id into credential_org, credential_client
    from public.payment_credentials where id = new.credential_id;
  select organization_id, client_id into trip_org, trip_client
    from public.trips where id = new.trip_id;
  if credential_org is null or credential_org <> new.organization_id
     or trip_org <> new.organization_id or credential_client <> trip_client then
    raise exception 'payment authorization tenant or client mismatch';
  end if;
  return new;
end;
$$;

create trigger payment_credentials_tenant before insert or update on public.payment_credentials
  for each row execute function public.validate_payment_credential_tenant();
create trigger payment_credentials_updated_at before update on public.payment_credentials
  for each row execute function public.set_updated_at();
create trigger payment_authorizations_tenant before insert or update on public.payment_credential_authorizations
  for each row execute function public.validate_payment_authorization_tenant();

alter table public.payment_credentials enable row level security;
alter table public.payment_credential_authorizations enable row level security;
alter table public.payment_credential_events enable row level security;

create policy payment_credentials_select on public.payment_credentials for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy payment_credentials_insert on public.payment_credentials for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy payment_credentials_update on public.payment_credentials for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy payment_credentials_delete on public.payment_credentials for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy payment_authorizations_select on public.payment_credential_authorizations for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy payment_authorizations_insert on public.payment_credential_authorizations for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy payment_authorizations_update on public.payment_credential_authorizations for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));

create policy payment_events_select on public.payment_credential_events for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy payment_events_insert on public.payment_credential_events for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[])
  );

revoke update, delete on public.payment_credential_events from authenticated;

