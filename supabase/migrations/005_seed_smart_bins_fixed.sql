-- Fixed seed data for smart bins and initial features
-- First insert smart bins
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

-- Sample alerts (don't depend on other tables)
insert into public.alerts (alert_type, entity_type, entity_id, severity, message) values
('bin_overflow', 'bin', 'BIN008', 'critical', 'Bin BIN008 at Batu Ferringhi Beach is 95% full'),
('bin_overflow', 'bin', 'BIN001', 'high', 'Bin BIN001 at Gurney Plaza Entrance is 75% full'),
('bin_overflow', 'bin', 'BIN003', 'high', 'Bin BIN003 at Penang Times Square is 90% full'),
('maintenance_due', 'bin', 'BIN004', 'medium', 'Routine maintenance scheduled for BIN004 at Komtar Plaza')
on conflict do nothing;