alter table public.booking_timeline_events
  add column if not exists rule_key text,
  add column if not exists rule_version integer,
  add column if not exists generation_source text,
  add column if not exists anchor_type text,
  add column if not exists offset_days integer,
  add column if not exists is_advisor_override boolean not null default false,
  add column if not exists client_visible boolean not null default false,
  add column if not exists generated_at timestamptz,
  add column if not exists source_url text;

alter table public.booking_timeline_events
  add constraint booking_timeline_events_generation_source_check
  check (generation_source is null or generation_source in ('scout', 'manual')),
  add constraint booking_timeline_events_anchor_type_check
  check (anchor_type is null or anchor_type in ('start_date', 'end_date', 'final_payment_date'));

create unique index if not exists booking_timeline_trip_rule_idx
  on public.booking_timeline_events(trip_id, rule_key)
  where rule_key is not null;

create index if not exists booking_timeline_generated_idx
  on public.booking_timeline_events(trip_id, generation_source, is_advisor_override);

