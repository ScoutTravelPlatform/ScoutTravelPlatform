-- Stripe subscription state for one agency base subscription plus advisor seats.
-- Client portal users are never represented as billable seats.

create type public.billing_subscription_status as enum (
  'not_started',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
  'incomplete_expired',
  'canceled'
);

create table public.organization_billing (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  base_price_id text,
  advisor_price_id text,
  advisor_seat_quantity integer not null default 0 check (advisor_seat_quantity >= 0),
  status public.billing_subscription_status not null default 'not_started',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_billing is
  'Non-sensitive subscription state mirrored from Stripe. Never store payment method or card data here.';
comment on column public.organization_billing.advisor_seat_quantity is
  'Number of active organization memberships with the advisor role included on the Stripe subscription.';

create trigger organization_billing_updated_at
before update on public.organization_billing
for each row execute function public.set_updated_at();

alter table public.organization_billing enable row level security;

create policy organization_billing_select
on public.organization_billing for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy organization_billing_insert
on public.organization_billing for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy organization_billing_update
on public.organization_billing for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

revoke delete on public.organization_billing from authenticated;
