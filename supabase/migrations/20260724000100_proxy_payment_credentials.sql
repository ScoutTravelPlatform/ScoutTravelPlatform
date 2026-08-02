-- Sandbox browser-proxy payment workflow.
-- Scout stores only VGS aliases. Raw PAN and CVC values must never enter this database.

alter table public.payment_credentials
  add column if not exists cvc_reference text,
  add column if not exists cvc_expires_at timestamptz;

alter table public.payment_credentials
  add constraint payment_credentials_volatile_cvc_check check (
    (cvc_reference is null and cvc_expires_at is null)
    or (cvc_reference ~ '^[0-9]{3,4}$' and cvc_expires_at is not null)
  );

comment on column public.payment_credentials.cvc_reference is
  'VGS volatile, format-preserving CVC alias only. Never a raw CVC. Must not be used after cvc_expires_at.';

create or replace function public.add_client_portal_payment_credential(
  portal_token text,
  pan_reference text,
  card_expiration_month smallint,
  card_expiration_year smallint,
  volatile_cvc_reference text,
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
    and l.revoked_at is null and l.expires_at > now()
  limit 1;

  if portal_row is null then raise exception 'invalid portal link'; end if;
  if pan_reference !~ '^[0-9]{13,19}$' then raise exception 'proxy card alias must preserve card format'; end if;
  if volatile_cvc_reference !~ '^[0-9]{3,4}$' then raise exception 'invalid volatile cvc alias'; end if;
  if card_expiration_month not between 1 and 12 then raise exception 'invalid expiration month'; end if;
  if card_expiration_year not between extract(year from now())::int and 2200 then raise exception 'invalid expiration year'; end if;
  if card_last_four !~ '^[0-9]{4}$' then raise exception 'invalid last four'; end if;
  if length(trim(label)) not between 1 and 100 then raise exception 'invalid label'; end if;
  if length(trim(supplier_name)) not between 1 and 150 then raise exception 'invalid supplier'; end if;
  if length(trim(authorization_purpose)) not between 1 and 500 then raise exception 'invalid purpose'; end if;
  if authorized_maximum is not null and authorized_maximum <= 0 then raise exception 'invalid amount'; end if;

  insert into public.payment_credentials (
    organization_id, client_id, provider_reference, expiration_reference,
    expiration_month, expiration_year, cvc_reference, cvc_expires_at,
    credential_type, display_label, brand, last_four, consent_version, consent_recorded_at
  ) values (
    portal_row.organization_id, portal_row.client_id, pan_reference, null,
    card_expiration_month, card_expiration_year, volatile_cvc_reference, now() + interval '55 minutes',
    'card', trim(label), nullif(trim(card_brand), ''), card_last_four,
    consent_terms_version, now()
  )
  on conflict (organization_id, provider, provider_reference) do update set
    expiration_reference = null,
    expiration_month = excluded.expiration_month,
    expiration_year = excluded.expiration_year,
    cvc_reference = excluded.cvc_reference,
    cvc_expires_at = excluded.cvc_expires_at,
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
    organization_id, credential_id, actor_user_id, action, supplier, outcome, metadata
  ) values (
    portal_row.organization_id, credential_id, null, 'created', trim(supplier_name),
    'client_portal_proxy_sandbox', jsonb_build_object(
      'terms_version', consent_terms_version,
      'cvc_expires_at', now() + interval '55 minutes'
    )
  );

  return credential_id;
end;
$$;

revoke all on function public.add_client_portal_payment_credential(
  text, text, smallint, smallint, text, text, text, text, text, text, numeric, text
) from public;
grant execute on function public.add_client_portal_payment_credential(
  text, text, smallint, smallint, text, text, text, text, text, text, numeric, text
) to anon, authenticated;

drop function if exists public.add_client_portal_payment_credential(
  text, text, text, text, text, text, text, text, numeric, text
);

create or replace function public.get_proxy_payment_credential(target_credential_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'id', c.id,
    'organization_id', c.organization_id,
    'client_id', c.client_id,
    'provider_reference', c.provider_reference,
    'display_label', c.display_label,
    'brand', c.brand,
    'last_four', c.last_four,
    'expiration_month', c.expiration_month,
    'expiration_year', c.expiration_year,
    'cvc_reference', case when c.cvc_expires_at > now() then c.cvc_reference else null end,
    'status', c.status
  )
  from public.payment_credentials c
  where c.id = target_credential_id
    and public.has_org_role(c.organization_id, array['owner','admin','advisor']::public.app_role[]);
$$;

revoke all on function public.get_proxy_payment_credential(uuid) from public;
grant execute on function public.get_proxy_payment_credential(uuid) to authenticated;
