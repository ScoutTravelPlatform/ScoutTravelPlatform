-- Hardens the encrypted card-storage RPC in two ways:
-- 1. Enforces status = 'active' inside the function itself, instead of
--    relying solely on the Next.js reveal page's own check — a revoked
--    card must never be revealable through this RPC, regardless of caller.
-- 2. Opportunistically purges the CVC ciphertext (and any legacy VGS CVC
--    alias) once its stated retention window has passed, rather than only
--    masking it out of the response. Card-network rules prohibit retaining
--    CVV/CVC after authorization, even encrypted, so the raw value must
--    actually be erased, not just hidden. This purge is "opportunistic" —
--    it only fires for a credential someone actually looks up. The Vercel
--    cron job added alongside this migration performs the unconditional
--    sweep for credentials nobody ever views again.

create or replace function public.get_proxy_payment_credential(target_credential_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_credentials
  set encrypted_cvc = null, cvc_reference = null
  where id = target_credential_id
    and cvc_expires_at <= now()
    and (encrypted_cvc is not null or cvc_reference is not null);

  return (
    select jsonb_build_object(
      'id', c.id,
      'organization_id', c.organization_id,
      'client_id', c.client_id,
      'provider', c.provider,
      'provider_reference', c.provider_reference,
      'display_label', c.display_label,
      'brand', c.brand,
      'last_four', c.last_four,
      'expiration_month', c.expiration_month,
      'expiration_year', c.expiration_year,
      'cvc_reference', case when c.cvc_expires_at > now() then c.cvc_reference else null end,
      'encrypted_pan', case when c.encrypted_pan is not null then encode(c.encrypted_pan, 'base64') else null end,
      'encrypted_cvc', case when c.encrypted_cvc is not null and c.cvc_expires_at > now() then encode(c.encrypted_cvc, 'base64') else null end,
      'status', c.status
    )
    from public.payment_credentials c
    where c.id = target_credential_id
      and c.status = 'active'
      and public.has_org_role(c.organization_id, array['owner','admin','advisor']::public.app_role[])
  );
end;
$$;

revoke all on function public.get_proxy_payment_credential(uuid) from public;
grant execute on function public.get_proxy_payment_credential(uuid) to authenticated;
