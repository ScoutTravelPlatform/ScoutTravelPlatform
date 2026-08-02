-- Cost-control audit for AI draft requests. Prompts and generated message
-- content are intentionally excluded from this table.

create table public.ai_generation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  model text not null check (length(trim(model)) between 1 and 100),
  created_at timestamptz not null default now()
);

comment on table public.ai_generation_events is
  'Metadata-only AI request audit for rate limiting and cost review. Never stores prompts, messages, or payment data.';

create index ai_generation_events_user_created_idx
  on public.ai_generation_events(user_id, created_at desc);
create index ai_generation_events_org_created_idx
  on public.ai_generation_events(organization_id, created_at desc);

alter table public.ai_generation_events enable row level security;

create policy ai_generation_events_select
on public.ai_generation_events for select to authenticated
using (
  user_id = auth.uid()
  or public.has_org_role(organization_id, array['owner','admin']::public.app_role[])
);

create policy ai_generation_events_insert
on public.ai_generation_events for insert to authenticated
with check (
  user_id = auth.uid()
  and public.has_org_role(
    organization_id,
    array['owner','admin','advisor','assistant']::public.app_role[]
  )
);

revoke update, delete on public.ai_generation_events from authenticated;
