-- Provider-neutral operator-browser checkout sessions.
-- Sessions reference VGS aliases indirectly; no raw card data belongs here.

create table public.secure_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  credential_id uuid not null references public.payment_credentials(id) on delete restrict,
  actor_user_id uuid references auth.users(id),
  supplier text not null check (length(trim(supplier)) between 1 and 150),
  target_url text not null check (target_url ~ '^https://'),
  provider text not null default 'unassigned' check (provider in ('unassigned', 'sandbox', 'hosted_browser')),
  provider_session_reference text,
  status text not null default 'awaiting_provider' check (
    status in ('awaiting_provider', 'ready', 'active', 'completed', 'failed', 'expired', 'cancelled')
  ),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (provider_session_reference is null or provider <> 'unassigned')
);

comment on table public.secure_checkout_sessions is
  'Audited provider-neutral operator-browser sessions. Must never contain PAN, CVC, gift-card numbers, or VGS aliases in metadata.';

create index secure_checkout_sessions_org_idx
  on public.secure_checkout_sessions(organization_id, created_at desc);
create index secure_checkout_sessions_credential_idx
  on public.secure_checkout_sessions(credential_id, created_at desc);

create or replace function public.validate_secure_checkout_session_tenant()
returns trigger language plpgsql set search_path = '' as $$
declare credential_org uuid; credential_client uuid;
begin
  select organization_id, client_id into credential_org, credential_client
    from public.payment_credentials where id = new.credential_id;
  if credential_org is null or credential_org <> new.organization_id
     or credential_client <> new.client_id then
    raise exception 'secure checkout session tenant mismatch';
  end if;
  new.actor_user_id = coalesce(new.actor_user_id, auth.uid());
  return new;
end;
$$;

create trigger secure_checkout_sessions_tenant
  before insert or update on public.secure_checkout_sessions
  for each row execute function public.validate_secure_checkout_session_tenant();
create trigger secure_checkout_sessions_updated_at
  before update on public.secure_checkout_sessions
  for each row execute function public.set_updated_at();

alter table public.secure_checkout_sessions enable row level security;

create policy secure_checkout_sessions_select on public.secure_checkout_sessions
  for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy secure_checkout_sessions_insert on public.secure_checkout_sessions
  for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[])
  );
create policy secure_checkout_sessions_update on public.secure_checkout_sessions
  for update to authenticated
  using (
    actor_user_id = auth.uid()
    and public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[])
  )
  with check (
    actor_user_id = auth.uid()
    and public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[])
  );

revoke delete on public.secure_checkout_sessions from authenticated;
