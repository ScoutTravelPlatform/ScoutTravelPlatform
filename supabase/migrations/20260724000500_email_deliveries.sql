create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('team_invitation','client_portal','transactional','automation')),
  recipient_email text not null check (recipient_email = lower(recipient_email)),
  subject text not null,
  provider text not null,
  provider_reference text,
  status text not null check (status in ('sent','failed')),
  error_code text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index email_deliveries_org_created_idx on public.email_deliveries(organization_id,created_at desc);
alter table public.email_deliveries enable row level security;
create policy email_deliveries_select on public.email_deliveries for select to authenticated
using (public.has_org_role(organization_id,array['owner','admin']::public.app_role[]));
create policy email_deliveries_insert on public.email_deliveries for insert to authenticated
with check (public.has_org_role(organization_id,array['owner','admin']::public.app_role[]) and created_by=auth.uid());
