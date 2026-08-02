-- Advisor-reviewed client communications and scheduled delivery.
-- Message content may contain ordinary trip details, but must never contain
-- payment card numbers, security codes, VGS aliases, or other vault secrets.

alter table public.clients
  add column phone_e164 text,
  add column notes text,
  add column sms_consent_status text not null default 'not_asked'
    check (sms_consent_status in ('not_asked', 'opted_in', 'opted_out')),
  add column sms_consent_at timestamptz,
  add column sms_consent_source text;

alter table public.clients
  add constraint clients_phone_e164_format
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

drop policy if exists email_deliveries_insert on public.email_deliveries;
create policy email_deliveries_insert
on public.email_deliveries for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])
  and created_by = auth.uid()
);

create table public.communication_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  message_type text not null check (message_type in ('general', 'payment_reminder', 'trip_reminder', 'document_reminder', 'welcome_home')),
  recipient_address text not null check (length(trim(recipient_address)) between 3 and 320),
  subject text,
  body text not null check (length(trim(body)) between 1 and 10000),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider text,
  provider_reference text,
  error_code text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_email_subject check (
    channel <> 'email' or (subject is not null and length(trim(subject)) between 1 and 200)
  ),
  constraint communication_schedule_time check (
    status <> 'scheduled' or scheduled_for is not null
  )
);

comment on table public.communication_drafts is
  'Advisor-reviewed client messages and delivery state. Payment credentials are prohibited.';

create index communication_drafts_org_created_idx
  on public.communication_drafts(organization_id, created_at desc);
create index communication_drafts_due_idx
  on public.communication_drafts(status, scheduled_for)
  where status = 'scheduled';
create index communication_drafts_trip_idx
  on public.communication_drafts(trip_id, created_at desc);

create table public.sms_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  communication_id uuid references public.communication_drafts(id) on delete set null,
  recipient_phone text not null check (recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  provider text not null,
  provider_reference text,
  status text not null check (status in ('sent', 'failed')),
  error_code text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index sms_deliveries_org_created_idx
  on public.sms_deliveries(organization_id, created_at desc);

create or replace function public.inherit_communication_organization()
returns trigger language plpgsql set search_path = '' as $$
declare
  source_organization_id uuid;
  source_client_id uuid;
begin
  select organization_id, client_id
    into source_organization_id, source_client_id
    from public.trips
    where id = new.trip_id;

  if source_organization_id is null then
    raise exception 'trip not found';
  end if;

  new.organization_id = source_organization_id;
  new.client_id = source_client_id;
  new.created_by = coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

create trigger communication_drafts_inherit_organization
before insert or update of trip_id on public.communication_drafts
for each row execute function public.inherit_communication_organization();

create trigger communication_drafts_updated_at
before update on public.communication_drafts
for each row execute function public.set_updated_at();

alter table public.communication_drafts enable row level security;
alter table public.sms_deliveries enable row level security;

create policy communication_drafts_select
on public.communication_drafts for select to authenticated
using (public.is_org_member(organization_id));

create policy communication_drafts_insert
on public.communication_drafts for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])
  and created_by = auth.uid()
);

create policy communication_drafts_update
on public.communication_drafts for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]))
with check (
  public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])
  and (
    created_by = auth.uid()
    or public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
  )
);

create policy communication_drafts_delete
on public.communication_drafts for delete to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
  or created_by = auth.uid()
);

create policy sms_deliveries_select
on public.sms_deliveries for select to authenticated
using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create policy sms_deliveries_insert
on public.sms_deliveries for insert to authenticated
with check (
  public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[])
  and created_by = auth.uid()
);
