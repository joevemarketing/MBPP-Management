-- Seed data for smart bins and initial features
-- Smart Bins locations around George Town, Penang
insert into public.smart_bins (bin_id, name, latitude, longitude, area, capacity_kg, current_fill_level, bin_type) values
('BIN001', 'Gurney Plaza Entrance', 5.4284, 100.3071, 'Gurney Drive', 150, 75, 'general'),
('BIN002', 'Gurney Paragon Mall', 5.4295, 100.3068, 'Gurney Drive', 200, 45, 'general'),
('BIN003', 'Penang Times Square', 5.4218, 100.3269, 'George Town', 120, 90, 'general'),
('BIN004', 'Komtar Plaza', 5.4164, 100.3327, 'George Town', 180, 60, 'recycling'),
('BIN005', 'Prangin Mall', 5.4152, 100.3341, 'George Town', 150, 30, 'general'),
('BIN006', 'Queensbay Mall Entrance', 5.3314, 100.3066, 'Bayan Lepas', 200, 85, 'general'),
('BIN007', 'Penang International Airport', 5.2932, 100.2727, 'Bayan Lepas', 250, 40, 'general'),
('BIN008', 'Batu Ferringhi Beach', 5.4724, 100.2763, 'Batu Ferringhi', 100, 95, 'general'),
('BIN009', 'Tanjung Bungah Market', 5.4602, 100.2845, 'Tanjung Bungah', 120, 55, 'general'),
('BIN010', 'Weld Quay Food Court', 5.4167, 100.3423, 'George Town', 160, 80, 'organic')
on conflict (bin_id) do nothing;

-- Sample collection tasks
insert into public.collection_tasks (bin_id, vehicle_id, assigned_contractor_id, task_type, priority, status, scheduled_time) values
('BIN001', 1, 1, 'collection', 'high', 'pending', now() + interval '2 hours'),
('BIN002', 1, 1, 'collection', 'normal', 'pending', now() + interval '4 hours'),
('BIN008', 2, 2, 'collection', 'urgent', 'pending', now() + interval '1 hour'),
('BIN010', 3, 3, 'collection', 'normal', 'in_progress', now() - interval '30 minutes')
on conflict do nothing;

-- Sample collection routes
insert into public.collection_routes (route_name, contractor_id, vehicle_id, route_order, estimated_duration_minutes, status) values
('Gurney Drive Route', 1, 1, '["BIN001", "BIN002"]', 120, 'planned'),
('Northern Coastal Route', 2, 2, '["BIN008", "BIN009"]', 180, 'in_progress'),
('George Town Central', 3, 3, '["BIN003", "BIN004", "BIN005", "BIN010"]', 240, 'planned')
on conflict do nothing;

-- Sample alerts
insert into public.alerts (alert_type, entity_type, entity_id, severity, message) values
('bin_overflow', 'bin', 'BIN008', 'critical', 'Bin BIN008 at Batu Ferringhi Beach is 95% full'),
('bin_overflow', 'bin', 'BIN001', 'high', 'Bin BIN001 at Gurney Plaza Entrance is 75% full'),
('vehicle_offline', 'vehicle', '2', 'medium', 'Vehicle 2 has been offline for more than 30 minutes'),
('route_delay', 'route', '2', 'medium', 'Northern Coastal Route is behind schedule')
on conflict do nothing;

-- Sample analytics data
insert into public.analytics (metric_date, contractor_id, total_collections, total_waste_kg, average_time_per_collection_minutes, route_completion_rate, bins_serviced, overflow_incidents) values
(current_date - interval '1 day', 1, 8, 1200, 25, 85, 8, 1),
(current_date - interval '1 day', 2, 6, 900, 30, 75, 6, 0),
(current_date - interval '1 day', 3, 10, 1500, 20, 90, 10, 2),
(current_date, 1, 5, 750, 22, 80, 5, 0),
(current_date, 2, 3, 450, 28, 70, 3, 1),
(current_date, 3, 7, 1050, 25, 85, 7, 1)
on conflict do nothing;