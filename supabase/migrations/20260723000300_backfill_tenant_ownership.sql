-- Assign the prototype data to the first organization created during rollout,
-- then make tenant ownership mandatory for every business record.

do $$
declare
  target_organization_id uuid;
  target_owner_id uuid;
begin
  if (select count(*) from public.organizations) <> 1 then
    raise exception 'Expected exactly one organization during initial backfill';
  end if;

  select id into target_organization_id from public.organizations;

  select user_id into target_owner_id
  from public.organization_memberships
  where organization_id = target_organization_id and role = 'owner'
  order by created_at
  limit 1;

  if target_owner_id is null then
    raise exception 'The initial organization must have an owner';
  end if;

  update public.clients
  set organization_id = target_organization_id,
      primary_advisor_id = coalesce(primary_advisor_id, target_owner_id),
      created_by = coalesce(created_by, target_owner_id)
  where organization_id is null;

  update public.trips t
  set organization_id = c.organization_id,
      assigned_advisor_id = coalesce(t.assigned_advisor_id, target_owner_id),
      created_by = coalesce(t.created_by, target_owner_id)
  from public.clients c
  where t.client_id = c.id and t.organization_id is null;

  update public.booking_tasks x
  set organization_id = t.organization_id,
      assignee_id = coalesce(x.assignee_id, target_owner_id),
      created_by = coalesce(x.created_by, target_owner_id)
  from public.trips t
  where x.trip_id = t.id and x.organization_id is null;

  update public.booking_payments x
  set organization_id = t.organization_id,
      created_by = coalesce(x.created_by, target_owner_id)
  from public.trips t
  where x.trip_id = t.id and x.organization_id is null;

  update public.booking_commissions x
  set organization_id = t.organization_id,
      created_by = coalesce(x.created_by, target_owner_id)
  from public.trips t
  where x.trip_id = t.id and x.organization_id is null;

  update public.booking_timeline_events x
  set organization_id = t.organization_id,
      created_by = coalesce(x.created_by, target_owner_id)
  from public.trips t
  where x.trip_id = t.id and x.organization_id is null;

  if exists (
    select 1 from public.clients where organization_id is null
    union all select 1 from public.trips where organization_id is null
    union all select 1 from public.booking_tasks where organization_id is null
    union all select 1 from public.booking_payments where organization_id is null
    union all select 1 from public.booking_commissions where organization_id is null
    union all select 1 from public.booking_timeline_events where organization_id is null
  ) then
    raise exception 'Tenant backfill left unassigned records';
  end if;
end;
$$;

alter table public.clients alter column organization_id set not null;
alter table public.trips alter column organization_id set not null;
alter table public.booking_tasks alter column organization_id set not null;
alter table public.booking_payments alter column organization_id set not null;
alter table public.booking_commissions alter column organization_id set not null;
alter table public.booking_timeline_events alter column organization_id set not null;
