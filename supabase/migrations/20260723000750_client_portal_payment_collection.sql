alter table public.payment_credentials
  add column expiration_reference text;

comment on column public.payment_credentials.expiration_reference is
  'Non-sensitive VGS alias for expiration data. Never store the raw expiration value here.';

create or replace function public.add_client_portal_payment_credential(
  portal_token text,
  pan_reference text,
  expiration_alias text,
  card_brand text,
  card_last_four text,
  label text,
  supplier_name text,
  authorization_purpose text,
  authorized_maximum numeric,
  consent_terms_version text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_row record;
  credential_id uuid;
begin
  select t.id as trip_id, t.client_id, t.organization_id
    into portal_row
  from public.client_portal_links l
  join public.trips t on t.id = l.trip_id
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;

  if portal_row is null then raise exception 'invalid portal link'; end if;
  if pan_reference !~ '^(tok_sandbox_[A-Za-z0-9]+|[0-9]{13,19})$' then raise exception 'invalid card alias'; end if;
  if expiration_alias !~ '^tok_sandbox_[A-Za-z0-9]+$' then raise exception 'invalid expiration alias'; end if;
  if card_last_four !~ '^[0-9]{4}$' then raise exception 'invalid last four'; end if;
  if length(trim(label)) not between 1 and 100 then raise exception 'invalid label'; end if;
  if length(trim(supplier_name)) not between 1 and 150 then raise exception 'invalid supplier'; end if;
  if length(trim(authorization_purpose)) not between 1 and 500 then raise exception 'invalid purpose'; end if;
  if authorized_maximum is not null and authorized_maximum <= 0 then raise exception 'invalid amount'; end if;

  insert into public.payment_credentials (
    organization_id, client_id, provider_reference, expiration_reference,
    credential_type, display_label, brand, last_four, consent_version,
    consent_recorded_at
  ) values (
    portal_row.organization_id, portal_row.client_id, pan_reference, expiration_alias,
    'card', trim(label), nullif(trim(card_brand), ''), card_last_four,
    consent_terms_version, now()
  )
  on conflict (organization_id, provider, provider_reference) do update set
    expiration_reference = excluded.expiration_reference,
    display_label = excluded.display_label,
    brand = excluded.brand,
    last_four = excluded.last_four,
    status = 'active',
    consent_version = excluded.consent_version,
    consent_recorded_at = excluded.consent_recorded_at,
    updated_at = now()
  returning id into credential_id;

  insert into public.payment_credential_authorizations (
    organization_id, credential_id, trip_id, supplier, purpose,
    maximum_amount, authorized_at
  ) values (
    portal_row.organization_id, credential_id, portal_row.trip_id,
    trim(supplier_name), trim(authorization_purpose), authorized_maximum, now()
  );

  insert into public.payment_credential_events (
    organization_id, credential_id, actor_user_id, action, supplier,
    outcome, metadata
  ) values (
    portal_row.organization_id, credential_id, null, 'created', trim(supplier_name),
    'client_portal_sandbox', jsonb_build_object('terms_version', consent_terms_version)
  );

  return credential_id;
end;
$$;

revoke all on function public.add_client_portal_payment_credential(
  text, text, text, text, text, text, text, text, numeric, text
) from public;
grant execute on function public.add_client_portal_payment_credential(
  text, text, text, text, text, text, text, text, numeric, text
) to anon, authenticated;

