-- Organization team directory and guarded role management.

create or replace function public.get_organization_team(target_organization_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role public.app_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.user_id, u.email::text, p.full_name, m.role, m.created_at
  from public.organization_memberships m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = target_organization_id
    and public.is_org_member(target_organization_id)
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 else 2 end,
    coalesce(nullif(trim(p.full_name), ''), u.email);
$$;

revoke all on function public.get_organization_team(uuid) from public;
grant execute on function public.get_organization_team(uuid) to authenticated;

create or replace function public.update_team_member_role(
  target_membership_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_org_id uuid;
  current_role public.app_role;
  actor_role public.app_role;
  owner_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select organization_id, role into target_org_id, current_role
  from public.organization_memberships
  where id = target_membership_id;

  if target_org_id is null then raise exception 'membership not found'; end if;

  select role into actor_role
  from public.organization_memberships
  where organization_id = target_org_id and user_id = auth.uid();

  if actor_role = 'owner' then
    null;
  elsif actor_role = 'admin' and current_role <> 'owner' and new_role in ('advisor', 'assistant', 'finance', 'read_only') then
    null;
  else
    raise exception 'insufficient team permissions';
  end if;

  if current_role = 'owner' and new_role <> 'owner' then
    select count(*) into owner_count
    from public.organization_memberships
    where organization_id = target_org_id and role = 'owner';
    if owner_count <= 1 then raise exception 'organization must retain an owner'; end if;
  end if;

  update public.organization_memberships
  set role = new_role
  where id = target_membership_id;

  insert into public.audit_events(organization_id, actor_user_id, entity_type, entity_id, action, metadata)
  values (target_org_id, auth.uid(), 'organization_membership', target_membership_id, 'role_updated', jsonb_build_object('previous_role', current_role, 'new_role', new_role));
end;
$$;

revoke all on function public.update_team_member_role(uuid, public.app_role) from public;
grant execute on function public.update_team_member_role(uuid, public.app_role) to authenticated;
