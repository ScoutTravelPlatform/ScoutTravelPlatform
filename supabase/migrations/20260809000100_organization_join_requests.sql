-- Public self-serve signup: lets a brand-new, unaffiliated user request to
-- join an existing agency instead of starting their own. This is the
-- reverse direction of team_invitations (there, an existing member invites
-- a specific email; here, an outsider requests and an owner/admin decides),
-- so it follows the same "no RLS policies, everything through security
-- definer RPCs" pattern as that table.

create table public.organization_join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, requester_user_id)
);

create index organization_join_requests_org_pending_idx on public.organization_join_requests(organization_id, created_at desc)
where status = 'pending';
alter table public.organization_join_requests enable row level security;

create or replace function public.search_organizations(query text)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name from public.organizations o
  where auth.uid() is not null and length(trim(query)) > 0 and o.name ilike '%' || trim(query) || '%'
  order by o.name asc
  limit 10;
$$;

create or replace function public.request_join_organization(target_organization_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare requester_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists (select 1 from public.organization_memberships where user_id = auth.uid()) then
    raise exception 'already a member of an organization';
  end if;
  if not exists (select 1 from public.organizations where id = target_organization_id) then
    raise exception 'organization not found';
  end if;
  select lower(email) into requester_email from auth.users where id = auth.uid();
  insert into public.organization_join_requests(organization_id, requester_user_id, requester_email)
  values (target_organization_id, auth.uid(), requester_email)
  on conflict (organization_id, requester_user_id) do nothing;
end;
$$;

create or replace function public.get_my_pending_join_request()
returns table (request_id uuid, organization_name text, status text)
language sql stable security definer set search_path = '' as $$
  select r.id, o.name, r.status from public.organization_join_requests r
  join public.organizations o on o.id = r.organization_id
  where r.requester_user_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc
  limit 1;
$$;

create or replace function public.list_organization_join_requests(target_organization_id uuid)
returns table (request_id uuid, requester_email text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.requester_email, r.created_at from public.organization_join_requests r
  where r.organization_id = target_organization_id and r.status = 'pending'
    and public.has_org_role(target_organization_id, array['owner','admin']::public.app_role[])
  order by r.created_at desc;
$$;

create or replace function public.approve_organization_join_request(request_id uuid, assign_role public.app_role)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request public.organization_join_requests%rowtype;
begin
  select * into request from public.organization_join_requests where id = request_id and status = 'pending' for update;
  if request.id is null or not public.has_org_role(request.organization_id, array['owner','admin']::public.app_role[]) then
    raise exception 'join request unavailable';
  end if;
  insert into public.organization_memberships(organization_id, user_id, role)
  values (request.organization_id, request.requester_user_id, assign_role)
  on conflict (organization_id, user_id) do nothing;
  update public.organization_join_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = request.id;
  insert into public.audit_events(organization_id, actor_user_id, entity_type, entity_id, action, metadata)
  values (request.organization_id, auth.uid(), 'organization_join_request', request.id, 'approved', jsonb_build_object('role', assign_role));
  return request.organization_id;
end;
$$;

create or replace function public.deny_organization_join_request(request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_org uuid;
begin
  select organization_id into target_org from public.organization_join_requests where id = request_id and status = 'pending';
  if target_org is null or not public.has_org_role(target_org, array['owner','admin']::public.app_role[]) then
    raise exception 'join request unavailable';
  end if;
  update public.organization_join_requests set status = 'denied', decided_by = auth.uid(), decided_at = now() where id = request_id;
  insert into public.audit_events(organization_id, actor_user_id, entity_type, entity_id, action)
  values (target_org, auth.uid(), 'organization_join_request', request_id, 'denied');
end;
$$;

revoke all on table public.organization_join_requests from anon, authenticated;
revoke all on function public.search_organizations(text) from public;
revoke all on function public.request_join_organization(uuid) from public;
revoke all on function public.get_my_pending_join_request() from public;
revoke all on function public.list_organization_join_requests(uuid) from public;
revoke all on function public.approve_organization_join_request(uuid, public.app_role) from public;
revoke all on function public.deny_organization_join_request(uuid) from public;
grant execute on function public.search_organizations(text) to authenticated;
grant execute on function public.request_join_organization(uuid) to authenticated;
grant execute on function public.get_my_pending_join_request() to authenticated;
grant execute on function public.list_organization_join_requests(uuid) to authenticated;
grant execute on function public.approve_organization_join_request(uuid, public.app_role) to authenticated;
grant execute on function public.deny_organization_join_request(uuid) to authenticated;
