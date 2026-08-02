-- 20260802000100_client_intake.sql gave several plpgsql RPC parameters the
-- same names as the table columns they write. Postgres's default
-- variable_conflict=error setting then refuses to resolve bare references
-- to those names inside UPDATE ... SET, since it can't tell whether the
-- caller means the parameter or the column. `#variable_conflict
-- use_variable` makes the parameter win everywhere, and the two spots that
-- genuinely need the pre-update column value (the blank-name guards) are
-- qualified explicitly.

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

  if intake_link.client_id is null then
    raise exception 'intake link unavailable';
  end if;

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

  return jsonb_build_object('ok', true);
end;
$$;

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
