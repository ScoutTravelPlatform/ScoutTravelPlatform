-- add_encrypted_payment_credential currently returns a bare credential uuid.
-- The new advisor-notification flow (lib/payment-authorization-notifications.ts)
-- needs trip_id/organization_id too, matching what
-- add_payment_credential_authorization already returns for the same purpose.
-- Postgres does not allow CREATE OR REPLACE to change a function's return
-- type, so the old signature must be dropped first.

drop function if exists public.add_encrypted_payment_credential(
  text, text, text, smallint, smallint, text, text, text, text, text, numeric, text
);

create function public.add_encrypted_payment_credential(
  portal_token text,
  pan_ciphertext_base64 text,
  cvc_ciphertext_base64 text,
  card_expiration_month smallint,
  card_expiration_year smallint,
  card_brand text,
  card_last_four text,
  label text,
  supplier_name text,
  authorization_purpose text,
  authorized_maximum numeric,
  consent_terms_version text
)
returns table (credential_id uuid, trip_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_row record;
  new_credential_id uuid;
begin
  select t.id as trip_id, t.client_id, t.organization_id
    into portal_row
  from public.client_portal_links l
  join public.trips t on t.id = l.trip_id
  where l.token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')
    and l.revoked_at is null and l.expires_at > now()
  limit 1;

  if portal_row is null then raise exception 'invalid portal link'; end if;
  if pan_ciphertext_base64 is null or length(pan_ciphertext_base64) = 0 then raise exception 'missing card data'; end if;
  if cvc_ciphertext_base64 is null or length(cvc_ciphertext_base64) = 0 then raise exception 'missing security code'; end if;
  if card_expiration_month not between 1 and 12 then raise exception 'invalid expiration month'; end if;
  if card_expiration_year not between extract(year from now())::int and 2200 then raise exception 'invalid expiration year'; end if;
  if card_last_four !~ '^[0-9]{4}$' then raise exception 'invalid last four'; end if;
  if length(trim(label)) not between 1 and 100 then raise exception 'invalid label'; end if;
  if length(trim(supplier_name)) not between 1 and 150 then raise exception 'invalid supplier'; end if;
  if length(trim(authorization_purpose)) not between 1 and 500 then raise exception 'invalid purpose'; end if;
  if authorized_maximum is not null and authorized_maximum <= 0 then raise exception 'invalid amount'; end if;

  insert into public.payment_credentials (
    organization_id, client_id, provider, provider_reference,
    encrypted_pan, encrypted_cvc,
    expiration_month, expiration_year, cvc_expires_at,
    credential_type, display_label, brand, last_four, consent_version, consent_recorded_at
  ) values (
    portal_row.organization_id, portal_row.client_id, 'scout_encrypted',
    'scout_' || encode(extensions.gen_random_bytes(16), 'hex'),
    decode(pan_ciphertext_base64, 'base64'), decode(cvc_ciphertext_base64, 'base64'),
    card_expiration_month, card_expiration_year, now() + interval '55 minutes',
    'card', trim(label), nullif(trim(card_brand), ''), card_last_four,
    consent_terms_version, now()
  )
  returning id into new_credential_id;

  insert into public.payment_credential_authorizations (
    organization_id, credential_id, trip_id, supplier, purpose,
    maximum_amount, authorized_at
  ) values (
    portal_row.organization_id, new_credential_id, portal_row.trip_id,
    trim(supplier_name), trim(authorization_purpose), authorized_maximum, now()
  );

  insert into public.payment_credential_events (
    organization_id, credential_id, actor_user_id, action, supplier, outcome, metadata
  ) values (
    portal_row.organization_id, new_credential_id, null, 'created', trim(supplier_name),
    'client_portal_encrypted', jsonb_build_object(
      'terms_version', consent_terms_version,
      'cvc_expires_at', now() + interval '55 minutes'
    )
  );

  return query select new_credential_id, portal_row.trip_id, portal_row.organization_id;
end;
$$;

revoke all on function public.add_encrypted_payment_credential(
  text, text, text, smallint, smallint, text, text, text, text, text, numeric, text
) from public;
grant execute on function public.add_encrypted_payment_credential(
  text, text, text, smallint, smallint, text, text, text, text, text, numeric, text
) to anon, authenticated;
