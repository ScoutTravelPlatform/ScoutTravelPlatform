create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.app_role not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index team_invitations_org_pending_idx on public.team_invitations(organization_id, created_at desc)
where accepted_at is null and revoked_at is null;
alter table public.team_invitations enable row level security;

create or replace function public.create_team_invitation(target_organization_id uuid, invite_email text, invite_role public.app_role)
returns table (invitation_id uuid, invitation_token text, invitation_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_role public.app_role; raw_token text; new_id uuid; expiration timestamptz;
begin
  select role into actor_role from public.organization_memberships
  where organization_id = target_organization_id and user_id = auth.uid();
  if actor_role = 'owner' then null;
  elsif actor_role = 'admin' and invite_role in ('advisor','assistant','finance','read_only') then null;
  else raise exception 'insufficient team permissions'; end if;
  if invite_email is null or lower(trim(invite_email)) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid email'; end if;
  if exists (select 1 from public.organization_memberships m join auth.users u on u.id = m.user_id where m.organization_id = target_organization_id and lower(u.email) = lower(trim(invite_email))) then raise exception 'already a member'; end if;
  update public.team_invitations set revoked_at = now() where organization_id = target_organization_id and email = lower(trim(invite_email)) and accepted_at is null and revoked_at is null;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex'); expiration := now() + interval '7 days';
  insert into public.team_invitations(organization_id,email,role,token_hash,invited_by,expires_at)
  values(target_organization_id,lower(trim(invite_email)),invite_role,encode(extensions.digest(raw_token,'sha256'),'hex'),auth.uid(),expiration)
  returning id into new_id;
  insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,metadata)
  values(target_organization_id,auth.uid(),'team_invitation',new_id,'created',jsonb_build_object('email',lower(trim(invite_email)),'role',invite_role));
  return query select new_id, raw_token, expiration;
end; $$;

create or replace function public.list_team_invitations(target_organization_id uuid)
returns table (invitation_id uuid, email text, role public.app_role, expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id,i.email,i.role,i.expires_at,i.created_at from public.team_invitations i
  where i.organization_id=target_organization_id and i.accepted_at is null and i.revoked_at is null
    and public.has_org_role(target_organization_id,array['owner','admin']::public.app_role[])
  order by i.created_at desc;
$$;

create or replace function public.get_team_invitation(invitation_token text)
returns table (organization_name text, email text, role public.app_role, expires_at timestamptz, is_valid boolean)
language sql stable security definer set search_path = '' as $$
  select o.name,i.email,i.role,i.expires_at,(i.accepted_at is null and i.revoked_at is null and i.expires_at>now())
  from public.team_invitations i join public.organizations o on o.id=i.organization_id
  where i.token_hash=encode(extensions.digest(invitation_token,'sha256'),'hex');
$$;

create or replace function public.accept_team_invitation(invitation_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare invitation public.team_invitations%rowtype; user_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into invitation from public.team_invitations where token_hash=encode(extensions.digest(invitation_token,'sha256'),'hex') for update;
  if invitation.id is null or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now() then raise exception 'invitation unavailable'; end if;
  select lower(email) into user_email from auth.users where id=auth.uid();
  if user_email<>invitation.email then raise exception 'invitation email mismatch'; end if;
  insert into public.organization_memberships(organization_id,user_id,role) values(invitation.organization_id,auth.uid(),invitation.role)
  on conflict(organization_id,user_id) do nothing;
  update public.team_invitations set accepted_at=now() where id=invitation.id;
  insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,metadata)
  values(invitation.organization_id,auth.uid(),'team_invitation',invitation.id,'accepted',jsonb_build_object('role',invitation.role));
end; $$;

create or replace function public.revoke_team_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_org uuid;
begin
  select organization_id into target_org from public.team_invitations where id=target_invitation_id and accepted_at is null and revoked_at is null;
  if target_org is null or not public.has_org_role(target_org,array['owner','admin']::public.app_role[]) then raise exception 'invitation unavailable'; end if;
  update public.team_invitations set revoked_at=now() where id=target_invitation_id;
  insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action) values(target_org,auth.uid(),'team_invitation',target_invitation_id,'revoked');
end; $$;

revoke all on table public.team_invitations from anon, authenticated;
revoke all on function public.create_team_invitation(uuid,text,public.app_role) from public;
revoke all on function public.list_team_invitations(uuid) from public;
revoke all on function public.get_team_invitation(text) from public;
revoke all on function public.accept_team_invitation(text) from public;
revoke all on function public.revoke_team_invitation(uuid) from public;
grant execute on function public.create_team_invitation(uuid,text,public.app_role) to authenticated;
grant execute on function public.list_team_invitations(uuid) to authenticated;
grant execute on function public.get_team_invitation(text) to anon, authenticated;
grant execute on function public.accept_team_invitation(text) to authenticated;
grant execute on function public.revoke_team_invitation(uuid) to authenticated;
