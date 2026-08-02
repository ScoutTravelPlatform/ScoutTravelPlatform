drop index if exists public.booking_timeline_trip_rule_idx;

-- PostgreSQL permits multiple nulls in a unique index, so manual events with a
-- null rule_key remain unrestricted while generated rules can be upserted.
create unique index booking_timeline_trip_rule_idx
  on public.booking_timeline_events(trip_id, rule_key);
