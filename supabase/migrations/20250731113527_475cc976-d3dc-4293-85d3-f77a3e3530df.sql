-- Insert sample Dell firmware packages
INSERT INTO firmware_packages (name, version, firmware_type, component_name, description, applicable_models, file_size, checksum, release_date) VALUES
('Dell iDRAC9 Firmware', '6.10.30.00', 'idrac', 'iDRAC', 'Latest iDRAC9 firmware with security updates and performance improvements', ARRAY['PowerEdge R740', 'PowerEdge R750', 'PowerEdge R640', 'PowerEdge R650'], 45231616, 'sha256:a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234', '2024-01-10'),

('Dell PowerEdge R750 BIOS', '2.18.0', 'bios', 'System BIOS', 'BIOS update for PowerEdge R750 with CPU microcode updates', ARRAY['PowerEdge R750'], 18874368, 'sha256:b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234a', '2024-01-05'),

('Dell PERC H755 Firmware', '51.15.0-4296', 'storage', 'RAID Controller', 'Storage controller firmware for PERC H755 with improved performance', ARRAY['PowerEdge R750', 'PowerEdge R650'], 8388608, 'sha256:c3d4e5f6789012345678901234567890abcdef123456789012345678901234ab', '2024-01-08'),

('Dell PowerEdge R640 BIOS', '2.20.1', 'bios', 'System BIOS', 'Critical BIOS update for PowerEdge R640 servers', ARRAY['PowerEdge R640'], 16777216, 'sha256:d4e5f6789012345678901234567890abcdef123456789012345678901234abc', '2023-12-15'),

('Dell Broadcom NetXtreme Firmware', '23.0.4.0', 'network', 'Network Adapter', 'Network adapter firmware for Broadcom NetXtreme cards', ARRAY['PowerEdge R740', 'PowerEdge R750', 'PowerEdge R640', 'PowerEdge R650'], 2097152, 'sha256:e5f6789012345678901234567890abcdef123456789012345678901234abcd', '2024-01-03'),

('Dell iDRAC8 Firmware', '2.85.85.85', 'idrac', 'iDRAC', 'Legacy iDRAC8 firmware update with security patches', ARRAY['PowerEdge R730', 'PowerEdge R630'], 41943040, 'sha256:f6789012345678901234567890abcdef123456789012345678901234abcde', '2023-11-20'),

('Dell PowerEdge R650 BIOS', '2.15.2', 'bios', 'System BIOS', 'BIOS firmware for PowerEdge R650 with TPM 2.0 support', ARRAY['PowerEdge R650'], 19922944, 'sha256:6789012345678901234567890abcdef123456789012345678901234abcdef', '2024-01-12'),

('Dell PERC H740P Firmware', '51.13.0-4296', 'storage', 'RAID Controller', 'Storage controller firmware for PERC H740P', ARRAY['PowerEdge R740'], 7340032, 'sha256:789012345678901234567890abcdef123456789012345678901234abcdef1', '2023-12-28');

-- Insert sample server data
INSERT INTO servers (hostname, ip_address, model, service_tag, idrac_version, bios_version, status, environment, datacenter, rack_location) VALUES
('ESXi-PROD-01', '192.168.1.10', 'PowerEdge R750', 'ABC1234', '6.10.30.00', '2.18.0', 'online', 'production', 'DC-East', 'Rack-A-U10'),
('ESXi-PROD-02', '192.168.1.11', 'PowerEdge R640', 'DEF5678', '6.08.00.00', '2.20.0', 'online', 'production', 'DC-East', 'Rack-A-U12'),
('ESXi-DEV-01', '192.168.1.20', 'PowerEdge R650', 'GHI9012', '6.10.30.00', '2.15.1', 'online', 'development', 'DC-West', 'Rack-B-U05'),
('ESXi-TEST-01', '192.168.1.30', 'PowerEdge R740', 'JKL3456', '6.08.00.00', '2.17.5', 'offline', 'testing', 'DC-West', 'Rack-B-U08'),
('ESXi-PROD-03', '192.168.1.12', 'PowerEdge R750', 'MNO7890', '6.10.29.00', '2.17.8', 'updating', 'production', 'DC-East', 'Rack-A-U14');

-- Insert sample system configuration
INSERT INTO system_config (key, value, description) VALUES
('setup_completed', 'true', 'Initial system setup completion status'),
('organization_name', '"Acme Corporation"', 'Organization name for the system'),
('admin_email', '"admin@acme.com"', 'Primary administrator email address'),
('timezone', '"UTC"', 'System timezone setting');

-- Insert sample update jobs
INSERT INTO update_jobs (server_id, firmware_package_id, status, progress, started_at, logs) 
SELECT 
    s.id,
    fp.id,
    'completed',
    100,
    NOW() - INTERVAL '2 hours',
    'Firmware update completed successfully'
FROM servers s, firmware_packages fp 
WHERE s.hostname = 'ESXi-PROD-01' AND fp.name = 'Dell iDRAC9 Firmware'
LIMIT 1;

INSERT INTO update_jobs (server_id, firmware_package_id, status, progress, started_at, logs)
SELECT 
    s.id,
    fp.id,
    'running',
    65,
    NOW() - INTERVAL '30 minutes',
    'Updating BIOS firmware... Current step: Validating firmware image'
FROM servers s, firmware_packages fp 
WHERE s.hostname = 'ESXi-PROD-02' AND fp.name = 'Dell PowerEdge R640 BIOS'
LIMIT 1;

INSERT INTO update_jobs (server_id, firmware_package_id, status, progress, scheduled_at)
SELECT 
    s.id,
    fp.id,
    'pending',
    0,
    NOW() + INTERVAL '1 hour'
FROM servers s, firmware_packages fp 
WHERE s.hostname = 'ESXi-DEV-01' AND fp.name = 'Dell PowerEdge R650 BIOS'
LIMIT 1;