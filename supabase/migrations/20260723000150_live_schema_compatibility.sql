-- Compatibility fixes derived from the linked Scout database catalog.
-- Aggregate integrity checks found no orphaned rows or invalid values.

alter table public.booking_tasks alter column trip_id drop default;
alter table public.booking_payments alter column trip_id drop default;
alter table public.booking_commissions alter column trip_id drop default;
alter table public.booking_timeline_events alter column status set default 'Upcoming';
alter table public.booking_commissions alter column status set default 'Waiting';

alter table public.booking_timeline_events
  add constraint booking_timeline_events_trip_id_fkey
  foreign key (trip_id) references public.trips(id) on delete cascade
  not valid;

alter table public.booking_timeline_events
  validate constraint booking_timeline_events_trip_id_fkey;
