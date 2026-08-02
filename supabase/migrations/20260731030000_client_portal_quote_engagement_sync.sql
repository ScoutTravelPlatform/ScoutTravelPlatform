-- Re-applies function bodies that were edited in already-applied migration files
-- (20260723000600_client_portal.sql, 20260730000200_client_quote_decisions.sql)
-- without a follow-up migration, so the live database never picked up the changes:
--   * get_client_portal was missing the trip_quote_options array per quote.
--   * record_trip_quote_option_interaction did not exist live at all.
-- Also adds the missing view-tracking RPC needed for per-quote engagement metrics,
-- and stops record_trip_quote_option_interaction from inserting a synthetic
-- zero-second trip_quote_views row now that real view tracking exists.

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
        'notes', q.notes,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', opt.id,
            'title', opt.title,
            'supplier', opt.supplier,
            'resort_name', opt.resort_name,
            'image_url', opt.image_url,
            'total_amount', opt.total_amount,
            'deposit_amount', opt.deposit_amount,
            'is_recommended', opt.is_recommended,
            'notes', opt.notes
          ) order by opt.sort_order, opt.created_at)
          from public.trip_quote_options opt
          where opt.quote_id = q.id
        ), '[]'::jsonb)
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

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_trip_quote_option_interaction(text, uuid, uuid, text) from public;
grant execute on function public.record_trip_quote_option_interaction(text, uuid, uuid, text) to anon, authenticated;

create or replace function public.record_trip_quote_view(
  portal_token text,
  target_quote_id uuid,
  time_on_page_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_link record;
  target_quote record;
  clamped_seconds integer;
begin
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

  clamped_seconds := greatest(0, least(coalesce(time_on_page_seconds, 0), 3600));

  insert into public.trip_quote_views (
    quote_id,
    organization_id,
    time_on_page_seconds
  ) values (
    target_quote.id,
    portal_link.organization_id,
    clamped_seconds
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_trip_quote_view(text, uuid, integer) from public;
grant execute on function public.record_trip_quote_view(text, uuid, integer) to anon, authenticated;
