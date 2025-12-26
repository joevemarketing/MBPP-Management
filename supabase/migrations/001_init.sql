-- Schema initialization for MBPP Smart Waste Management
create table if not exists public.contractors (
  id bigint primary key,
  name text not null,
  kpi_on_time_rate numeric default 0,
  kpi_collection_efficiency numeric default 0
);

create table if not exists public.vehicles (
  id bigint primary key,
  plate text not null,
  type text not null,
  capacity_kg integer default 0,
  contractor_id bigint references public.contractors(id) on delete set null
);

create table if not exists public.positions (
  id bigserial primary key,
  device_id bigint not null,
  latitude double precision not null,
  longitude double precision not null,
  speed double precision default 0,
  course double precision default 0,
  attributes jsonb default '{}'::jsonb,
  server_time timestamptz not null default now()
);

create index if not exists positions_device_time_idx on public.positions (device_id, server_time desc);

