-- Client intake: a client-scoped shareable link that pre-fills known contact
-- info and progressively collects family/travel-document/preference data,
-- following the same public-tokenized-link architecture as client_portal_links.

alter table public.clients
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column state_province text,
  add column postal_code text,
  add column country text,
  add column travel_style text,
  add column room_preferences text,
  add column favorite_resorts text[],
  add column favorite_cruise_lines text[],
  add column favorite_airlines text[];

create or replace function public.inherit_client_child_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id
  from public.clients
  where id = new.client_id;

  if new.organization_id is null then
    raise exception 'client is unavailable';
  end if;

  return new;
end;
$$;

create or replace function public.inherit_traveler_child_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  select organization_id into new.organization_id
  from public.client_travelers
  where id = new.traveler_id;

  if new.organization_id is null then
    raise exception 'traveler is unavailable';
  end if;

  return new;
end;
$$;

create table public.client_travelers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 200),
  date_of_birth date,
  relationship text check (relationship in ('self', 'spouse', 'partner', 'child', 'parent', 'other')),
  passport_number text,
  passport_country text,
  passport_expiration date,
  tsa_precheck_number text,
  global_entry_number text,
  dietary_restrictions text,
  accessibility_needs text,
  needs_stroller boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_travelers_client_idx on public.client_travelers(client_id);
create index client_travelers_organization_idx on public.client_travelers(organization_id);

create trigger client_travelers_inherit_organization
  before insert or update of client_id on public.client_travelers
  for each row execute function public.inherit_client_child_organization();
create trigger client_travelers_updated_at
  before update on public.client_travelers
  for each row execute function public.set_updated_at();

alter table public.client_travelers enable row level security;
create policy client_travelers_select on public.client_travelers for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy client_travelers_insert on public.client_travelers for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy client_travelers_update on public.client_travelers for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));
create policy client_travelers_delete on public.client_travelers for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create table public.client_celebrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occasion text not null check (length(trim(occasion)) between 1 and 200),
  occasion_date date,
  recurring_annually boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_celebrations_client_idx on public.client_celebrations(client_id);
create index client_celebrations_organization_idx on public.client_celebrations(organization_id);

create trigger client_celebrations_inherit_organization
  before insert or update of client_id on public.client_celebrations
  for each row execute function public.inherit_client_child_organization();
create trigger client_celebrations_updated_at
  before update on public.client_celebrations
  for each row execute function public.set_updated_at();

alter table public.client_celebrations enable row level security;
create policy client_celebrations_select on public.client_celebrations for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_celebrations_insert on public.client_celebrations for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_celebrations_update on public.client_celebrations for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_celebrations_delete on public.client_celebrations for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create table public.client_loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.client_travelers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_type text not null check (program_type in ('hotel', 'airline', 'cruise', 'car', 'other')),
  program_name text not null check (length(trim(program_name)) between 1 and 200),
  member_number text not null check (length(trim(member_number)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_loyalty_programs_traveler_idx on public.client_loyalty_programs(traveler_id);
create index client_loyalty_programs_organization_idx on public.client_loyalty_programs(organization_id);

create trigger client_loyalty_programs_inherit_organization
  before insert or update of traveler_id on public.client_loyalty_programs
  for each row execute function public.inherit_traveler_child_organization();
create trigger client_loyalty_programs_updated_at
  before update on public.client_loyalty_programs
  for each row execute function public.set_updated_at();

alter table public.client_loyalty_programs enable row level security;
create policy client_loyalty_programs_select on public.client_loyalty_programs for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_loyalty_programs_insert on public.client_loyalty_programs for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_loyalty_programs_update on public.client_loyalty_programs for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_loyalty_programs_delete on public.client_loyalty_programs for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

create table public.client_intake_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_intake_links_organization_idx on public.client_intake_links(organization_id);
create index client_intake_links_active_idx on public.client_intake_links(token_hash, expires_at) where revoked_at is null;

create trigger client_intake_links_inherit_organization
  before insert or update of client_id on public.client_intake_links
  for each row execute function public.inherit_client_child_organization();
create trigger client_intake_links_updated_at
  before update on public.client_intake_links
  for each row execute function public.set_updated_at();

alter table public.client_intake_links enable row level security;
create policy client_intake_links_select on public.client_intake_links for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_intake_links_insert on public.client_intake_links for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_intake_links_update on public.client_intake_links for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));
create policy client_intake_links_delete on public.client_intake_links for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.app_role[]));

-- Read: full intake profile for the public form, keyed by token.
create or replace function public.get_client_intake_profile(intake_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'client', jsonb_build_object(
      'id', c.id,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'email', c.email,
      'phone_e164', c.phone_e164,
      'address_line1', c.address_line1,
      'address_line2', c.address_line2,
      'city', c.city,
      'state_province', c.state_province,
      'postal_code', c.postal_code,
      'country', c.country,
      'travel_style', c.travel_style,
      'room_preferences', c.room_preferences,
      'favorite_resorts', coalesce(c.favorite_resorts, array[]::text[]),
      'favorite_cruise_lines', coalesce(c.favorite_cruise_lines, array[]::text[]),
      'favorite_airlines', coalesce(c.favorite_airlines, array[]::text[])
    ),
    'travelers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', trav.id,
        'full_name', trav.full_name,
        'date_of_birth', trav.date_of_birth,
        'relationship', trav.relationship,
        'passport_number', trav.passport_number,
        'passport_country', trav.passport_country,
        'passport_expiration', trav.passport_expiration,
        'tsa_precheck_number', trav.tsa_precheck_number,
        'global_entry_number', trav.global_entry_number,
        'dietary_restrictions', trav.dietary_restrictions,
        'accessibility_needs', trav.accessibility_needs,
        'needs_stroller', trav.needs_stroller,
        'notes', trav.notes,
        'loyalty_programs', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', lp.id,
            'program_type', lp.program_type,
            'program_name', lp.program_name,
            'member_number', lp.member_number
          ) order by lp.created_at)
          from public.client_loyalty_programs lp
          where lp.traveler_id = trav.id
        ), '[]'::jsonb)
      ) order by trav.created_at)
      from public.client_travelers trav
      where trav.client_id = c.id
    ), '[]'::jsonb),
    'celebrations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cel.id,
        'occasion', cel.occasion,
        'occasion_date', cel.occasion_date,
        'recurring_annually', cel.recurring_annually,
        'notes', cel.notes
      ) order by cel.occasion_date nulls last, cel.created_at)
      from public.client_celebrations cel
      where cel.client_id = c.id
    ), '[]'::jsonb)
  )
  from public.client_intake_links l
  join public.clients c on c.id = l.client_id
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_client_intake_profile(text) from public;
grant execute on function public.get_client_intake_profile(text) to anon, authenticated;

create or replace function public.submit_client_intake_contact(
  intake_token text,
  first_name text,
  last_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  update public.clients
  set first_name = coalesce(nullif(trim(first_name), ''), first_name),
      last_name = coalesce(nullif(trim(last_name), ''), last_name),
      phone_e164 = phone,
      address_line1 = address_line1,
      address_line2 = address_line2,
      city = city,
      state_province = state_province,
      postal_code = postal_code,
      country = country
  where id = intake_link.client_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_client_intake_contact(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_client_intake_contact(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.submit_client_intake_preferences(
  intake_token text,
  travel_style text,
  room_preferences text,
  favorite_resorts text[],
  favorite_cruise_lines text[],
  favorite_airlines text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  update public.clients
  set travel_style = travel_style,
      room_preferences = room_preferences,
      favorite_resorts = favorite_resorts,
      favorite_cruise_lines = favorite_cruise_lines,
      favorite_airlines = favorite_airlines
  where id = intake_link.client_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_client_intake_preferences(text, text, text, text[], text[], text[]) from public;
grant execute on function public.submit_client_intake_preferences(text, text, text, text[], text[], text[]) to anon, authenticated;

create or replace function public.upsert_client_intake_traveler(
  intake_token text,
  traveler_id uuid,
  full_name text,
  date_of_birth date,
  relationship text,
  passport_number text,
  passport_country text,
  passport_expiration date,
  tsa_precheck_number text,
  global_entry_number text,
  dietary_restrictions text,
  accessibility_needs text,
  needs_stroller boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
  result_id uuid;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  if relationship is not null and relationship not in ('self', 'spouse', 'partner', 'child', 'parent', 'other') then
    raise exception 'invalid relationship';
  end if;

  if traveler_id is not null then
    perform 1 from public.client_travelers
      where id = traveler_id and client_id = intake_link.client_id;
    if not found then
      raise exception 'traveler unavailable';
    end if;

    update public.client_travelers
    set full_name = full_name,
        date_of_birth = date_of_birth,
        relationship = relationship,
        passport_number = passport_number,
        passport_country = passport_country,
        passport_expiration = passport_expiration,
        tsa_precheck_number = tsa_precheck_number,
        global_entry_number = global_entry_number,
        dietary_restrictions = dietary_restrictions,
        accessibility_needs = accessibility_needs,
        needs_stroller = needs_stroller
    where id = traveler_id
    returning id into result_id;
  else
    insert into public.client_travelers (
      client_id, full_name, date_of_birth, relationship,
      passport_number, passport_country, passport_expiration,
      tsa_precheck_number, global_entry_number,
      dietary_restrictions, accessibility_needs, needs_stroller
    ) values (
      intake_link.client_id, full_name, date_of_birth, relationship,
      passport_number, passport_country, passport_expiration,
      tsa_precheck_number, global_entry_number,
      dietary_restrictions, accessibility_needs, coalesce(needs_stroller, false)
    )
    returning id into result_id;
  end if;

  return jsonb_build_object('id', result_id);
end;
$$;

revoke all on function public.upsert_client_intake_traveler(text, uuid, text, date, text, text, text, date, text, text, text, text, boolean) from public;
grant execute on function public.upsert_client_intake_traveler(text, uuid, text, date, text, text, text, date, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.delete_client_intake_traveler(intake_token text, traveler_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  delete from public.client_travelers
  where id = traveler_id and client_id = intake_link.client_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_client_intake_traveler(text, uuid) from public;
grant execute on function public.delete_client_intake_traveler(text, uuid) to anon, authenticated;

create or replace function public.upsert_client_intake_celebration(
  intake_token text,
  celebration_id uuid,
  occasion text,
  occasion_date date,
  recurring_annually boolean,
  notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
  result_id uuid;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  if celebration_id is not null then
    perform 1 from public.client_celebrations
      where id = celebration_id and client_id = intake_link.client_id;
    if not found then
      raise exception 'celebration unavailable';
    end if;

    update public.client_celebrations
    set occasion = occasion,
        occasion_date = occasion_date,
        recurring_annually = coalesce(recurring_annually, true),
        notes = notes
    where id = celebration_id
    returning id into result_id;
  else
    insert into public.client_celebrations (client_id, occasion, occasion_date, recurring_annually, notes)
    values (intake_link.client_id, occasion, occasion_date, coalesce(recurring_annually, true), notes)
    returning id into result_id;
  end if;

  return jsonb_build_object('id', result_id);
end;
$$;

revoke all on function public.upsert_client_intake_celebration(text, uuid, text, date, boolean, text) from public;
grant execute on function public.upsert_client_intake_celebration(text, uuid, text, date, boolean, text) to anon, authenticated;

create or replace function public.delete_client_intake_celebration(intake_token text, celebration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  delete from public.client_celebrations
  where id = celebration_id and client_id = intake_link.client_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_client_intake_celebration(text, uuid) from public;
grant execute on function public.delete_client_intake_celebration(text, uuid) to anon, authenticated;

create or replace function public.upsert_client_intake_loyalty_program(
  intake_token text,
  program_id uuid,
  traveler_id uuid,
  program_type text,
  program_name text,
  member_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
  result_id uuid;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  if program_type not in ('hotel', 'airline', 'cruise', 'car', 'other') then
    raise exception 'invalid program type';
  end if;

  perform 1 from public.client_travelers
    where id = traveler_id and client_id = intake_link.client_id;
  if not found then
    raise exception 'traveler unavailable';
  end if;

  if program_id is not null then
    perform 1 from public.client_loyalty_programs lp
      join public.client_travelers t on t.id = lp.traveler_id
      where lp.id = program_id and t.client_id = intake_link.client_id;
    if not found then
      raise exception 'loyalty program unavailable';
    end if;

    update public.client_loyalty_programs
    set traveler_id = traveler_id,
        program_type = program_type,
        program_name = program_name,
        member_number = member_number
    where id = program_id
    returning id into result_id;
  else
    insert into public.client_loyalty_programs (traveler_id, program_type, program_name, member_number)
    values (traveler_id, program_type, program_name, member_number)
    returning id into result_id;
  end if;

  return jsonb_build_object('id', result_id);
end;
$$;

revoke all on function public.upsert_client_intake_loyalty_program(text, uuid, uuid, text, text, text) from public;
grant execute on function public.upsert_client_intake_loyalty_program(text, uuid, uuid, text, text, text) to anon, authenticated;

create or replace function public.delete_client_intake_loyalty_program(intake_token text, program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  intake_link record;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

  delete from public.client_loyalty_programs lp
  using public.client_travelers t
  where lp.id = program_id
    and lp.traveler_id = t.id
    and t.client_id = intake_link.client_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_client_intake_loyalty_program(text, uuid) from public;
grant execute on function public.delete_client_intake_loyalty_program(text, uuid) to anon, authenticated;
