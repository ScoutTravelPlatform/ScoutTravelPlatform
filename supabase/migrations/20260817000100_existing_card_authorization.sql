-- Lets a client authorize a NEW supplier/purpose/amount against a card they
-- already have on file, without re-entering the card number. Mirrors
-- add_encrypted_payment_credential's portal-token validation pattern exactly
-- (supabase/migrations/20260804000100_encrypted_payment_cards.sql), but
-- inserts only an authorization row against an existing, active credential
-- instead of a new payment_credentials row.

create or replace function public.add_payment_credential_authorization(
  portal_token text,
  target_credential_id uuid,
  supplier_name text,
  authorization_purpose text,
  authorized_maximum numeric,
  consent_terms_version text
)
returns table (authorization_id uuid, trip_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_row record;
  credential_client uuid;
  new_authorization_id uuid;
begin
  select t.id as trip_id, t.client_id, t.organization_id
    into portal_row
  from public.client_portal_links l
  join public.trips t on t.id = l.trip_id
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null and l.expires_at > now()
  limit 1;

  if portal_row is null then raise exception 'invalid portal link'; end if;

  select c.client_id into credential_client
  from public.payment_credentials c
  where c.id = target_credential_id and c.status = 'active';

  if credential_client is null or credential_client <> portal_row.client_id then
    raise exception 'card not available for this client';
  end if;

  if length(trim(supplier_name)) not between 1 and 150 then raise exception 'invalid supplier'; end if;
  if length(trim(authorization_purpose)) not between 1 and 500 then raise exception 'invalid purpose'; end if;
  if authorized_maximum is not null and authorized_maximum <= 0 then raise exception 'invalid amount'; end if;

  insert into public.payment_credential_authorizations (
    organization_id, credential_id, trip_id, supplier, purpose, maximum_amount, authorized_at
  ) values (
    portal_row.organization_id, target_credential_id, portal_row.trip_id,
    trim(supplier_name), trim(authorization_purpose), authorized_maximum, now()
  )
  returning id into new_authorization_id;

  insert into public.payment_credential_events (
    organization_id, credential_id, authorization_id, actor_user_id, action, supplier, outcome, metadata
  ) values (
    portal_row.organization_id, target_credential_id, new_authorization_id, null, 'created',
    trim(supplier_name), 'client_portal_existing_card', jsonb_build_object('terms_version', consent_terms_version)
  );

  return query select new_authorization_id, portal_row.trip_id, portal_row.organization_id;
end;
$$;

revoke all on function public.add_payment_credential_authorization(text, uuid, text, text, numeric, text) from public;
grant execute on function public.add_payment_credential_authorization(text, uuid, text, text, numeric, text) to anon, authenticated;

-- Re-applies get_client_portal (live version last edited in
-- 20260731030000_client_portal_quote_engagement_sync.sql) to also return the
-- client's existing active cards — display fields only, never encrypted_pan/
-- encrypted_cvc/cvc_reference, same field set ClientCardManager.tsx already
-- shows advisors.
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
    ), '[]'::jsonb),
    'payment_credentials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'display_label', p.display_label,
        'brand', p.brand,
        'last_four', p.last_four,
        'expiration_month', p.expiration_month,
        'expiration_year', p.expiration_year
      ) order by p.created_at desc)
      from public.payment_credentials p
      where p.client_id = c.id and p.status = 'active'
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
