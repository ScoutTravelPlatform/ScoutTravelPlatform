-- Local mirror of Stripe invoices and payment events for agency subscription tracking.
-- Never store payment method details or card data here.

create type public.billing_invoice_status as enum (
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void'
);

create table public.organization_billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_invoice_id text not null unique,
  provider_subscription_id text,
  status public.billing_invoice_status not null default 'open',
  currency text not null default 'usd',
  amount_due numeric(12,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  amount_remaining numeric(12,2) not null default 0 check (amount_remaining >= 0),
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_billing_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.organization_billing_invoices(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_payment_id text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'usd',
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index organization_billing_invoices_org_idx on public.organization_billing_invoices(organization_id, created_at desc);
create index organization_billing_payments_org_idx on public.organization_billing_payments(organization_id, paid_at desc);
create index organization_billing_payments_invoice_idx on public.organization_billing_payments(invoice_id);

create trigger organization_billing_invoices_updated_at
before update on public.organization_billing_invoices
for each row execute function public.set_updated_at();

alter table public.organization_billing_invoices enable row level security;
alter table public.organization_billing_payments enable row level security;

create policy organization_billing_invoices_select
on public.organization_billing_invoices for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

create policy organization_billing_invoices_insert
on public.organization_billing_invoices for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

create policy organization_billing_invoices_update
on public.organization_billing_invoices for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

create policy organization_billing_payments_select
on public.organization_billing_payments for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

create policy organization_billing_payments_insert
on public.organization_billing_payments for insert to authenticated
with check (public.has_org_role(organization_id, array['owner','admin','finance']::public.app_role[]));

revoke delete on public.organization_billing_invoices from authenticated;
revoke delete on public.organization_billing_payments from authenticated;
