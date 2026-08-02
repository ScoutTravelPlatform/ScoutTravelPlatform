-- Scout baseline schema reconstructed from the application on 2026-07-23.
-- Apply to a fresh Supabase project. Existing projects should be diffed first.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  last_name text not null check (length(trim(last_name)) between 1 and 100),
  email text not null check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  trip_name text not null,
  destination text not null,
  supplier text,
  resort_hotel text,
  booking_number text,
  start_date date not null,
  end_date date not null,
  final_payment_date date,
  package_price numeric(12,2) check (package_price is null or package_price >= 0),
  commission_amount numeric(12,2) check (commission_amount is null or commission_amount >= 0),
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  status text not null default 'Planning',
  created_at timestamptz not null default now(),
  constraint trips_date_range check (end_date >= start_date)
);

create table if not exists public.booking_tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  payment_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date,
  paid boolean not null default false,
  paid_date date,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  constraint paid_date_consistency check (paid or paid_date is null)
);

create table if not exists public.booking_commissions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  supplier text,
  commission_percent numeric(7,4) check (
    commission_percent is null or commission_percent between 0 and 100
  ),
  expected_commission numeric(12,2) check (expected_commission is null or expected_commission >= 0),
  commission_received numeric(12,2) check (commission_received is null or commission_received >= 0),
  expected_pay_date date,
  received_date date,
  status text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_timeline_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  event_date date,
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Completed', 'Canceled')),
  created_at timestamptz not null default now()
);

create index if not exists clients_created_at_idx on public.clients(created_at desc);
create index if not exists trips_client_id_idx on public.trips(client_id);
create index if not exists trips_start_date_idx on public.trips(start_date);
create index if not exists booking_tasks_trip_due_idx on public.booking_tasks(trip_id, completed, due_date);
create index if not exists booking_payments_trip_due_idx on public.booking_payments(trip_id, due_date);
create index if not exists booking_commissions_trip_idx on public.booking_commissions(trip_id);
create index if not exists booking_timeline_trip_date_idx on public.booking_timeline_events(trip_id, event_date);
