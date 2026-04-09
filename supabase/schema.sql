create extension if not exists "pgcrypto";

create table if not exists appointments (
  id uuid primary key,
  customer_name text not null,
  vehicle text not null,
  appointment_at timestamptz not null,
  advisor_name text not null,
  advisor_phone text,
  advisor_photo_url text,
  appointment_page_url text not null,
  status text not null default 'scheduled',
  google_calendar_event_id text,
  calendar_sync_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'extension',
  mileage text,
  notes text,
  phone text,
  email text,
  customer_phone text,
  payoff_lender_name text,
  payoff_photo_urls text[] not null default '{}',
  confirmed boolean not null default false,
  opened_count integer not null default 0,
  last_opened_at timestamptz,
  first_opened_at timestamptz,
  confirmed_at timestamptz,
  engagement_score integer not null default 0,
  reminder_2hr_sent boolean not null default false,
  reminder_30min_sent boolean not null default false,
  location_name text,
  location_address text,
  google_maps_url text,
  entrance_photo_urls text[] not null default '{}',
  google_reviews_url text,
  yelp_reviews_url text,
  featured_reviews jsonb not null default '[]'::jsonb,
  review_photo_urls text[] not null default '{}',
  customer_delivery_photo_urls text[] not null default '{}',
  check_handoff_photo_urls text[] not null default '{}'
);

alter table appointments add column if not exists customer_name text;
alter table appointments add column if not exists appointment_at timestamptz;
alter table appointments add column if not exists advisor_name text;
alter table appointments add column if not exists advisor_phone text;
alter table appointments add column if not exists advisor_photo_url text;
alter table appointments add column if not exists appointment_page_url text;
alter table appointments add column if not exists status text default 'scheduled';
alter table appointments add column if not exists google_calendar_event_id text;
alter table appointments add column if not exists calendar_sync_status text default 'pending';
alter table appointments add column if not exists updated_at timestamptz default now();
alter table appointments add column if not exists source text default 'extension';
alter table appointments add column if not exists location_name text;
alter table appointments add column if not exists location_address text;
alter table appointments add column if not exists google_maps_url text;
alter table appointments add column if not exists entrance_photo_urls text[] default '{}';
alter table appointments add column if not exists google_reviews_url text;
alter table appointments add column if not exists yelp_reviews_url text;
alter table appointments add column if not exists featured_reviews jsonb default '[]'::jsonb;
alter table appointments add column if not exists review_photo_urls text[] default '{}';
alter table appointments add column if not exists customer_delivery_photo_urls text[] default '{}';
alter table appointments add column if not exists check_handoff_photo_urls text[] default '{}';
alter table appointments add column if not exists reminder_2hr_sent boolean not null default false;
alter table appointments add column if not exists reminder_30min_sent boolean not null default false;
alter table appointments add column if not exists payoff_lender_name text;
alter table appointments add column if not exists payoff_photo_urls text[] not null default '{}';

do $$
declare
  has_name boolean;
  has_scheduled_at boolean;
  has_advisor boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'name'
  ) into has_name;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'scheduled_at'
  ) into has_scheduled_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'advisor'
  ) into has_advisor;

  if has_name or has_scheduled_at or has_advisor then
    execute format(
      'update appointments
       set
         customer_name = coalesce(customer_name, %s),
         appointment_at = coalesce(appointment_at, %s, created_at),
         advisor_name = coalesce(advisor_name, %s),
         appointment_page_url = coalesce(appointment_page_url, ''''),
         status = coalesce(status, ''scheduled''),
         calendar_sync_status = coalesce(calendar_sync_status, ''pending''),
         source = coalesce(source, ''extension'')
       where customer_name is null
          or appointment_at is null
          or advisor_name is null
          or appointment_page_url is null
          or status is null
          or calendar_sync_status is null
          or source is null',
      case when has_name then 'name' else 'customer_name' end,
      case when has_scheduled_at then 'scheduled_at' else 'appointment_at' end,
      case when has_advisor then 'advisor' else 'advisor_name' end
    );
  end if;
end $$;

create table if not exists appointment_events (
  id uuid primary key,
  appointment_id uuid not null references appointments(id) on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists appointment_events_appointment_id_idx on appointment_events (appointment_id);
create index if not exists appointments_appointment_at_idx on appointments (appointment_at);

insert into storage.buckets (id, name, public)
values ('appointment-assets', 'appointment-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "appointment assets public read" on storage.objects;
create policy "appointment assets public read"
on storage.objects
for select
to public
using (bucket_id = 'appointment-assets');

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists user_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  advisor_name text,
  advisor_phone text,
  advisor_email text,
  advisor_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_accounts_email_idx on user_accounts (email);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists appointments_set_updated_at on appointments;
create trigger appointments_set_updated_at
before update on appointments
for each row
execute function set_updated_at();

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at
before update on app_settings
for each row
execute function set_updated_at();

drop trigger if exists user_accounts_set_updated_at on user_accounts;
create trigger user_accounts_set_updated_at
before update on user_accounts
for each row
execute function set_updated_at();
