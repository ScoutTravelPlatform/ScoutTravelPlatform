-- Rate limiting for the client-portal card endpoints (submitting a new card,
-- authorizing an existing one). Vercel's serverless functions are stateless
-- and multi-instance, so an in-memory counter would not work — this uses a
-- small Postgres-backed fixed-window counter instead, matching the existing
-- pattern of doing sensitive per-request logic in security-definer RPCs
-- (add_encrypted_payment_credential, add_payment_credential_authorization)
-- rather than in application code, so it stays atomic under concurrent hits.

create table if not exists public.rate_limit_counters (
  key text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0
);

-- No policies granted — only the security-definer function below (owned by
-- the same role that runs migrations) can read/write this table, the same
-- posture as the other catalog/authorization tables in this schema.
alter table public.rate_limit_counters enable row level security;

create or replace function public.check_rate_limit(limit_key text, max_requests integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into rate_limit_counters (key, window_start, request_count)
  values (limit_key, now(), 1)
  on conflict (key) do update set
    request_count = case
      when rate_limit_counters.window_start < now() - make_interval(secs => window_seconds) then 1
      else rate_limit_counters.request_count + 1
    end,
    window_start = case
      when rate_limit_counters.window_start < now() - make_interval(secs => window_seconds) then now()
      else rate_limit_counters.window_start
    end
  returning request_count into current_count;

  return current_count <= max_requests;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
