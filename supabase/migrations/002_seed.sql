-- Seed sample contractors and vehicles
insert into public.contractors (id, name, kpi_on_time_rate, kpi_collection_efficiency) values
  (10, 'Contractor A', 0.95, 0.88),
  (11, 'Contractor B', 0.91, 0.81)
on conflict (id) do update set name=excluded.name;

insert into public.vehicles (id, plate, type, capacity_kg, contractor_id) values
  (1, 'PMG 1234', 'Compactor', 8000, 10),
  (2, 'PMG 5678', 'Tipper', 5000, 11)
on conflict (id) do update set plate=excluded.plate;

