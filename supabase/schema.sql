create extension if not exists "pgcrypto";

create table if not exists appointments (
  id uuid primary key,
  name text not null,
  vehicle text not null,
  time text not null,
  scheduled_at timestamptz,
  advisor text not null,
  created_at timestamptz not null default now(),
  mileage text,
  notes text,
  phone text,
  email text,
  confirmed boolean not null default false,
  opened_count integer not null default 0,
  last_opened_at timestamptz,
  first_opened_at timestamptz,
  confirmed_at timestamptz,
  engagement_score integer not null default 0,
  calendar_event_id text
);

create table if not exists appointment_events (
  id uuid primary key,
  appointment_id uuid not null references appointments(id) on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists appointment_events_appointment_id_idx on appointment_events (appointment_id);
create index if not exists appointments_scheduled_at_idx on appointments (scheduled_at);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at
before update on app_settings
for each row
execute function set_updated_at();
