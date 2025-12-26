-- Smart Bins table for waste level monitoring
create table if not exists public.smart_bins (
  id bigserial primary key,
  bin_id text unique not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  area text not null,
  capacity_kg integer default 100,
  current_fill_level numeric default 0, -- percentage 0-100
  last_emptied timestamptz,
  battery_level numeric default 100, -- percentage
  status text default 'active', -- active, maintenance, offline
  bin_type text default 'general', -- general, recycling, organic
  created_at timestamptz default now()
);

-- Collection tasks table
create table if not exists public.collection_tasks (
  id bigserial primary key,
  bin_id text references public.smart_bins(bin_id) on delete cascade,
  vehicle_id bigint references public.vehicles(id) on delete set null,
  assigned_contractor_id bigint references public.contractors(id) on delete set null,
  task_type text default 'collection', -- collection, maintenance, emergency
  priority text default 'normal', -- low, normal, high, urgent
  status text default 'pending', -- pending, in_progress, completed, cancelled
  scheduled_time timestamptz,
  started_time timestamptz,
  completed_time timestamptz,
  actual_weight_kg numeric,
  notes text,
  created_at timestamptz default now()
);

-- Waste collection routes table
create table if not exists public.collection_routes (
  id bigserial primary key,
  route_name text not null,
  contractor_id bigint references public.contractors(id) on delete cascade,
  vehicle_id bigint references public.vehicles(id) on delete set null,
  route_order jsonb default '[]'::jsonb, -- array of bin_ids in order
  estimated_duration_minutes integer default 0,
  actual_duration_minutes integer default 0,
  total_distance_km numeric default 0,
  status text default 'planned', -- planned, in_progress, completed
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Alerts table for notifications
create table if not exists public.alerts (
  id bigserial primary key,
  alert_type text not null, -- bin_overflow, vehicle_offline, maintenance_due, route_delay
  entity_type text not null, -- bin, vehicle, route
  entity_id text not null,
  severity text default 'medium', -- low, medium, high, critical
  message text not null,
  is_read boolean default false,
  acknowledged_by bigint references public.contractors(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);

-- Analytics and metrics table
create table if not exists public.analytics (
  id bigserial primary key,
  metric_date date not null,
  contractor_id bigint references public.contractors(id) on delete cascade,
  total_collections integer default 0,
  total_waste_kg numeric default 0,
  average_time_per_collection_minutes numeric default 0,
  route_completion_rate numeric default 0,
  vehicle_utilization_rate numeric default 0,
  bins_serviced integer default 0,
  overflow_incidents integer default 0,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists smart_bins_location_idx on public.smart_bins (latitude, longitude);
create index if not exists smart_bins_fill_level_idx on public.smart_bins (current_fill_level);
create index if not exists collection_tasks_status_idx on public.collection_tasks (status);
create index if not exists collection_tasks_bin_idx on public.collection_tasks (bin_id);
create index if not exists collection_routes_contractor_idx on public.collection_routes (contractor_id);
create index if not exists alerts_unread_idx on public.alerts (is_read, created_at);
create index if not exists analytics_date_idx on public.analytics (metric_date desc);

-- Row Level Security
alter table public.smart_bins enable row level security;
alter table public.collection_tasks enable row level security;
alter table public.collection_routes enable row level security;
alter table public.alerts enable row level security;
alter table public.analytics enable row level security;

-- RLS Policies
-- Anonymous users can read smart bins (for public map viewing)
create policy "Public read access for smart bins" on public.smart_bins
  for select using (true);

-- Authenticated users can insert/update smart bins
create policy "Authenticated write access for smart bins" on public.smart_bins
  for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update access for smart bins" on public.smart_bins
  for update using (auth.role() = 'authenticated');

-- Collection tasks policies
create policy "Authenticated full access to collection tasks" on public.collection_tasks
  for all using (auth.role() = 'authenticated');

-- Routes policies
create policy "Authenticated full access to collection routes" on public.collection_routes
  for all using (auth.role() = 'authenticated');

-- Alerts policies
create policy "Authenticated full access to alerts" on public.alerts
  for all using (auth.role() = 'authenticated');

-- Analytics policies
create policy "Authenticated read access to analytics" on public.analytics
  for select using (auth.role() = 'authenticated');
create policy "Authenticated insert access to analytics" on public.analytics
  for insert with check (auth.role() = 'authenticated');

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.smart_bins to authenticated;
grant all on public.collection_tasks to authenticated;
grant all on public.collection_routes to authenticated;
grant all on public.alerts to authenticated;
grant all on public.analytics to authenticated;
grant select on all tables in schema public to anon;