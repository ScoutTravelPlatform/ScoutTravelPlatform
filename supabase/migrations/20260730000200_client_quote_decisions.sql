create or replace function public.get_client_portal(portal_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'trip', jsonb_build_object(
      'id', t.id,
      'trip_name', t.trip_name,
      'destination', t.destination,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'supplier', t.supplier,
      'resort_hotel', t.resort_hotel,
      'booking_number', t.booking_number,
      'client_name', trim(c.first_name || ' ' || c.last_name),
      'organization_name', o.name
    ),
    'itinerary_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_date', i.item_date,
        'start_time', i.start_time,
        'category', i.category,
        'title', i.title,
        'location', i.location,
        'confirmation_number', i.confirmation_number,
        'notes', i.notes
      ) order by i.item_date, i.start_time nulls last, i.sort_order, i.created_at)
      from public.itinerary_items i
      where i.trip_id = t.id and i.client_visible = true
    ), '[]'::jsonb),
    'important_dates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_date', e.event_date,
        'event_type', e.event_type,
        'title', e.title,
        'description', e.description
      ) order by e.event_date nulls last, e.created_at)
      from public.booking_timeline_events e
      where e.trip_id = t.id and e.client_visible = true and e.status <> 'Canceled'
    ), '[]'::jsonb),
    'quotes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'title', q.title,
        'supplier', q.supplier,
        'total_amount', q.total_amount,
        'deposit_amount', q.deposit_amount,
        'expires_on', q.expires_on,
        'status', q.status,
        'notes', q.notes
      ) order by q.total_amount, q.created_at)
      from public.trip_quotes q
      where q.trip_id = t.id
        and q.client_visible = true
        and q.status not in ('Expired')
    ), '[]'::jsonb)
  )
  from public.client_portal_links l
  join public.trips t on t.id = l.trip_id
  join public.clients c on c.id = t.client_id
  join public.organizations o on o.id = t.organization_id
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_client_portal(text) from public;
grant execute on function public.get_client_portal(text) to anon, authenticated;

create or replace function public.respond_to_trip_quote(
  portal_token text,
  target_quote_id uuid,
  client_response text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_link record;
  target_quote record;
  next_status text;
begin
  if client_response not in ('Accepted', 'Declined') then
    raise exception 'invalid quote response';
  end if;

  select l.trip_id, l.organization_id
  into portal_link
  from public.client_portal_links l
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if portal_link.trip_id is null then
    raise exception 'portal unavailable';
  end if;

  select q.id, q.status
  into target_quote
  from public.trip_quotes q
  where q.id = target_quote_id
    and q.trip_id = portal_link.trip_id
    and q.organization_id = portal_link.organization_id
    and q.client_visible = true
    and q.status in ('Draft', 'Sent', 'Accepted', 'Declined');

  if target_quote.id is null then
    raise exception 'quote unavailable';
  end if;

  next_status := client_response;
  update public.trip_quotes
  set status = next_status
  where id = target_quote.id;

  if next_status = 'Accepted' then
    update public.trip_quotes
    set status = 'Declined'
    where trip_id = portal_link.trip_id
      and id <> target_quote.id
      and client_visible = true
      and status in ('Draft', 'Sent');
  end if;

  insert into public.audit_events(organization_id, entity_type, entity_id, action, metadata)
  values (
    portal_link.organization_id,
    'trip_quote',
    target_quote.id,
    case when next_status = 'Accepted' then 'client_quote_accepted' else 'client_quote_declined' end,
    jsonb_build_object('trip_id', portal_link.trip_id)
  );

  return jsonb_build_object('quote_id', target_quote.id, 'status', next_status);
end;
$$;

revoke all on function public.respond_to_trip_quote(text, uuid, text) from public;
grant execute on function public.respond_to_trip_quote(text, uuid, text) to anon, authenticated;

create or replace function public.record_trip_quote_option_interaction(
  portal_token text,
  target_quote_id uuid,
  target_option_id uuid,
  interaction_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_link record;
  target_quote record;
  target_option record;
begin
  if interaction_type not in ('favorite', 'details', 'compare') then
    raise exception 'invalid interaction type';
  end if;

  select l.trip_id, l.organization_id
  into portal_link
  from public.client_portal_links l
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now();

  if portal_link.trip_id is null then
    raise exception 'portal unavailable';
  end if;

  select q.id
  into target_quote
  from public.trip_quotes q
  where q.id = target_quote_id
    and q.trip_id = portal_link.trip_id
    and q.organization_id = portal_link.organization_id
    and q.client_visible = true
    and q.status in ('Draft', 'Sent', 'Accepted', 'Declined');

  if target_quote.id is null then
    raise exception 'quote unavailable';
  end if;

  select o.id
  into target_option
  from public.trip_quote_options o
  where o.id = target_option_id
    and o.quote_id = target_quote.id;

  if target_option.id is null then
    raise exception 'option unavailable';
  end if;

  insert into public.trip_quote_option_interactions (
    quote_id,
    option_id,
    organization_id,
    interaction_type
  ) values (
    target_quote.id,
    target_option.id,
    portal_link.organization_id,
    interaction_type
  );

  insert into public.trip_quote_views (
    quote_id,
    organization_id,
    time_on_page_seconds
  ) values (
    target_quote.id,
    portal_link.organization_id,
    0
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_trip_quote_option_interaction(text, uuid, uuid, text) from public;
grant execute on function public.record_trip_quote_option_interaction(text, uuid, uuid, text) to anon, authenticated;
