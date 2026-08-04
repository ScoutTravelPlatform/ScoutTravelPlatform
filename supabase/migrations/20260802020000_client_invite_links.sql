-- Lets an advisor send an intake link to a prospective client who doesn't
-- have a `clients` row yet — the client is created when they submit the
-- Contact section of the form, "claiming" the link. Existing client-scoped
-- intake links (client_id already set) are unaffected.

alter table public.client_intake_links alter column client_id drop not null;

alter table public.client_intake_links
  add column invited_email text check (invited_email is null or invited_email = lower(invited_email)),
  add column invited_phone_e164 text check (invited_phone_e164 is null or invited_phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

alter table public.client_intake_links
  add constraint client_intake_links_target_present
  check (client_id is not null or invited_email is not null or invited_phone_e164 is not null);

create or replace function public.inherit_client_child_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.client_id is not null then
    select organization_id into new.organization_id
    from public.clients
    where id = new.client_id;

    if new.organization_id is null then
      raise exception 'client is unavailable';
    end if;
  elsif new.organization_id is null then
    raise exception 'organization is required when no client is specified';
  end if;

  return new;
end;
$$;

create or replace function public.get_client_intake_profile(intake_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when l.client_id is null then jsonb_build_object(
      'client', jsonb_build_object(
        'id', null,
        'first_name', '',
        'last_name', '',
        'email', coalesce(l.invited_email, ''),
        'phone_e164', l.invited_phone_e164,
        'address_line1', null,
        'address_line2', null,
        'city', null,
        'state_province', null,
        'postal_code', null,
        'country', null,
        'travel_style', null,
        'room_preferences', null,
        'favorite_resorts', array[]::text[],
        'favorite_cruise_lines', array[]::text[],
        'favorite_airlines', array[]::text[]
      ),
      'travelers', '[]'::jsonb,
      'celebrations', '[]'::jsonb
    )
    else (
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
      from public.clients c
      where c.id = l.client_id
    )
  end
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;
$$;

-- Signature is changing (new `email` param), so the old overload must be
-- dropped explicitly — `create or replace` only replaces an exact match.
drop function if exists public.submit_client_intake_contact(text, text, text, text, text, text, text, text, text, text);

create or replace function public.submit_client_intake_contact(
  intake_token text,
  first_name text,
  last_name text,
  email text,
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
#variable_conflict use_variable
declare
  intake_link record;
  new_client_id uuid;
begin
  select l.id, l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.organization_id is null then
    raise exception 'intake link unavailable';
  end if;

  if intake_link.client_id is null then
    insert into public.clients (
      organization_id, first_name, last_name, email, phone_e164,
      address_line1, address_line2, city, state_province, postal_code, country
    ) values (
      intake_link.organization_id, trim(first_name), trim(last_name), lower(trim(email)), phone,
      address_line1, address_line2, city, state_province, postal_code, country
    )
    returning id into new_client_id;

    update public.client_intake_links set client_id = new_client_id where id = intake_link.id;
  else
    update public.clients
    set first_name = coalesce(nullif(trim(first_name), ''), public.clients.first_name),
        last_name = coalesce(nullif(trim(last_name), ''), public.clients.last_name),
        phone_e164 = phone,
        address_line1 = address_line1,
        address_line2 = address_line2,
        city = city,
        state_province = state_province,
        postal_code = postal_code,
        country = country
    where id = intake_link.client_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_client_intake_contact(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_client_intake_contact(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

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
#variable_conflict use_variable
declare
  intake_link record;
begin
  select l.client_id, l.organization_id
  into intake_link
  from public.client_intake_links l
  where l.token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if intake_link.organization_id is null then
    raise exception 'intake link unavailable';
  end if;

  if intake_link.client_id is null then
    raise exception 'complete your contact information first';
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
#variable_conflict use_variable
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

  if intake_link.organization_id is null then
    raise exception 'intake link unavailable';
  end if;

  if intake_link.client_id is null then
    raise exception 'complete your contact information first';
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
#variable_conflict use_variable
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

  if intake_link.organization_id is null then
    raise exception 'intake link unavailable';
  end if;

  if intake_link.client_id is null then
    raise exception 'complete your contact information first';
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
#variable_conflict use_variable
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

  if intake_link.organization_id is null then
    raise exception 'intake link unavailable';
  end if;

  if intake_link.client_id is null then
    raise exception 'complete your contact information first';
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
