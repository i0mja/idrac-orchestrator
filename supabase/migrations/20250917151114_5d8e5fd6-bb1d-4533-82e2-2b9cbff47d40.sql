-- Create comprehensive health configuration and scoring system

-- Health scoring configuration
CREATE TABLE public.health_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'security', 'connectivity', 'compliance', 'performance'
  metric_name TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10, -- Weight in health score calculation
  enabled BOOLEAN DEFAULT true,
  thresholds JSONB DEFAULT '{}', -- Configurable thresholds
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, metric_name)
);

-- Enable RLS
ALTER TABLE public.health_scoring_config ENABLE ROW LEVEL SECURITY;

-- Create policy for health scoring config
CREATE POLICY "Allow authenticated access to health scoring config"
ON public.health_scoring_config
FOR ALL
USING (true);

-- Backup configuration
CREATE TABLE public.backup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  backup_type TEXT NOT NULL, -- 'system_config', 'database', 'firmware_catalog'
  enabled BOOLEAN DEFAULT true,
  schedule_cron TEXT NOT NULL, -- Cron expression for scheduling
  retention_days INTEGER DEFAULT 30,
  storage_location TEXT DEFAULT 'local', -- 'local', 's3', 'azure'
  storage_config JSONB DEFAULT '{}', -- Storage-specific settings
  compression_enabled BOOLEAN DEFAULT true,
  encryption_enabled BOOLEAN DEFAULT false,
  last_backup_at TIMESTAMPTZ,
  last_backup_status TEXT, -- 'success', 'failed', 'running'
  last_backup_size BIGINT, -- Size in bytes
  next_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;

-- Create policy for backup config
CREATE POLICY "Only admins can manage backup config"
ON public.backup_config
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

-- Health check results table
CREATE TABLE public.health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL, -- 'connectivity', 'credentials', 'firmware_readiness', 'storage'
  target_id UUID, -- Server ID or other target identifier
  status TEXT NOT NULL, -- 'pass', 'fail', 'warning'
  details JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  error_message TEXT,
  recommendations JSONB DEFAULT '[]',
  checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

-- Create policy for health check results
CREATE POLICY "Allow authenticated access to health check results"
ON public.health_check_results
FOR ALL
USING (true);

-- Server readiness checks table
CREATE TABLE public.server_readiness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  check_timestamp TIMESTAMPTZ DEFAULT now(),
  connectivity_status TEXT NOT NULL, -- 'pass', 'fail', 'timeout'
  credential_status TEXT NOT NULL, -- 'pass', 'fail', 'unauthorized'
  firmware_capability_status TEXT NOT NULL, -- 'pass', 'fail', 'unsupported'
  maintenance_mode_capable BOOLEAN DEFAULT false,
  vcenter_integration_status TEXT, -- 'pass', 'fail', 'not_applicable'
  overall_readiness TEXT NOT NULL, -- 'ready', 'not_ready', 'degraded'
  readiness_score INTEGER DEFAULT 0, -- 0-100 score
  blocking_issues JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  last_successful_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.server_readiness_checks ENABLE ROW LEVEL SECURITY;

-- Create policy for server readiness checks
CREATE POLICY "Allow authenticated access to server readiness checks"
ON public.server_readiness_checks
FOR ALL
USING (true);

-- Insert default health scoring configuration
INSERT INTO public.health_scoring_config (category, metric_name, weight, thresholds, description) VALUES
('security', 'critical_vulnerabilities', 25, '{"critical": 0, "warning": 3}', 'Critical security vulnerabilities detected'),
('security', 'warranty_expiration', 15, '{"critical": 30, "warning": 90}', 'Server warranties expiring (days)'),
('security', 'os_eol_status', 20, '{"critical": 30, "warning": 180}', 'Operating system end-of-life (days)'),
('security', 'credential_strength', 10, '{"min_score": 60}', 'Credential complexity and rotation status'),
('connectivity', 'server_reachability', 20, '{"success_rate": 95}', 'Server connectivity success rate'),
('connectivity', 'vcenter_integration', 15, '{"success_rate": 98}', 'VMware vCenter integration health'),
('connectivity', 'response_time', 10, '{"critical_ms": 5000, "warning_ms": 2000}', 'Average server response time'),
('compliance', 'firmware_compliance', 20, '{"compliance_rate": 90}', 'Firmware version compliance rate'),
('compliance', 'backup_freshness', 15, '{"critical_hours": 168, "warning_hours": 48}', 'System backup freshness'),
('compliance', 'maintenance_windows', 10, '{"adherence_rate": 95}', 'Maintenance window adherence'),
('performance', 'update_success_rate', 15, '{"success_rate": 95}', 'Firmware update success rate'),
('performance', 'discovery_accuracy', 10, '{"accuracy_rate": 98}', 'Server discovery accuracy rate'),
('performance', 'storage_utilization', 10, '{"critical_percent": 90, "warning_percent": 75}', 'Storage utilization percentage');

-- Insert default backup configurations
INSERT INTO public.backup_config (name, backup_type, schedule_cron, retention_days, description) VALUES
('Daily System Config', 'system_config', '0 2 * * *', 30, 'Daily backup of system configuration and settings'),
('Weekly Database Backup', 'database', '0 3 * * 0', 90, 'Weekly full database backup'),
('Monthly Firmware Catalog', 'firmware_catalog', '0 4 1 * *', 365, 'Monthly backup of firmware packages and metadata');

-- Function to calculate overall health score
CREATE OR REPLACE FUNCTION public.calculate_health_score()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_score INTEGER := 100;
    config_record RECORD;
    metric_value NUMERIC;
    deduction INTEGER := 0;
BEGIN
    -- Loop through all enabled health scoring configurations
    FOR config_record IN 
        SELECT * FROM health_scoring_config WHERE enabled = true
    LOOP
        -- Calculate metric-specific scores based on category
        CASE config_record.category
            WHEN 'security' THEN
                CASE config_record.metric_name
                    WHEN 'critical_vulnerabilities' THEN
                        SELECT COUNT(*) INTO metric_value 
                        FROM eol_alerts 
                        WHERE severity = 'critical' AND acknowledged = false;
                        
                        IF metric_value > (config_record.thresholds->>'critical')::INTEGER THEN
                            deduction := deduction + config_record.weight;
                        ELSIF metric_value > (config_record.thresholds->>'warning')::INTEGER THEN
                            deduction := deduction + (config_record.weight / 2);
                        END IF;
                        
                    WHEN 'warranty_expiration' THEN
                        SELECT COUNT(*) INTO metric_value
                        FROM servers 
                        WHERE warranty_end_date IS NOT NULL 
                        AND warranty_end_date <= CURRENT_DATE + INTERVAL '90 days';
                        
                        IF metric_value > 0 THEN
                            deduction := deduction + (config_record.weight * LEAST(metric_value::INTEGER, 5) / 5);
                        END IF;
                        
                    WHEN 'os_eol_status' THEN
                        SELECT COUNT(*) INTO metric_value
                        FROM servers 
                        WHERE os_eol_date IS NOT NULL 
                        AND os_eol_date <= CURRENT_DATE + INTERVAL '180 days';
                        
                        IF metric_value > 0 THEN
                            deduction := deduction + (config_record.weight * LEAST(metric_value::INTEGER, 10) / 10);
                        END IF;
                END CASE;
                
            WHEN 'connectivity' THEN
                CASE config_record.metric_name
                    WHEN 'server_reachability' THEN
                        SELECT 
                            CASE 
                                WHEN COUNT(*) = 0 THEN 100 
                                ELSE (COUNT(*) FILTER (WHERE status = 'online')::NUMERIC / COUNT(*) * 100)
                            END INTO metric_value
                        FROM servers;
                        
                        IF metric_value < (config_record.thresholds->>'success_rate')::NUMERIC THEN
                            deduction := deduction + config_record.weight;
                        END IF;
                END CASE;
                
            WHEN 'compliance' THEN
                CASE config_record.metric_name
                    WHEN 'backup_freshness' THEN
                        SELECT 
                            EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 INTO metric_value
                        FROM server_backups;
                        
                        IF metric_value > (config_record.thresholds->>'critical_hours')::NUMERIC THEN
                            deduction := deduction + config_record.weight;
                        ELSIF metric_value > (config_record.thresholds->>'warning_hours')::NUMERIC THEN
                            deduction := deduction + (config_record.weight / 2);
                        END IF;
                END CASE;
        END CASE;
    END LOOP;
    
    RETURN GREATEST(0, total_score - deduction);
END;
$$;

-- Function to perform comprehensive server readiness check
CREATE OR REPLACE FUNCTION public.check_server_readiness(target_server_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    server_record RECORD;
    readiness_result JSONB := '{"servers": [], "summary": {}}';
    server_results JSONB := '[]';
    total_servers INTEGER := 0;
    ready_servers INTEGER := 0;
BEGIN
    -- Check specific server or all servers
    FOR server_record IN 
        SELECT * FROM servers 
        WHERE (target_server_id IS NULL OR id = target_server_id)
    LOOP
        total_servers := total_servers + 1;
        
        DECLARE
            connectivity_status TEXT := 'fail';
            credential_status TEXT := 'fail';
            firmware_capability TEXT := 'fail';
            vcenter_status TEXT := 'not_applicable';
            overall_readiness TEXT := 'not_ready';
            readiness_score INTEGER := 0;
            blocking_issues JSONB := '[]';
            warnings JSONB := '[]';
        BEGIN
            -- Check connectivity (simulate - would normally use edge function)
            IF server_record.status = 'online' THEN
                connectivity_status := 'pass';
                readiness_score := readiness_score + 25;
            ELSE
                blocking_issues := blocking_issues || jsonb_build_object(
                    'type', 'connectivity',
                    'message', 'Server is not reachable',
                    'resolution', 'Check network connectivity and server power state'
                );
            END IF;
            
            -- Check credentials (simulate - would check credential profiles)
            IF EXISTS (
                SELECT 1 FROM credential_profiles cp 
                WHERE cp.is_default = true OR EXISTS (
                    SELECT 1 FROM credential_assignments ca 
                    WHERE ca.credential_profile_id = cp.id 
                    AND (server_record.ip_address << ca.ip_range_cidr OR 
                         (server_record.ip_address >= ca.ip_range_start AND server_record.ip_address <= ca.ip_range_end))
                )
            ) THEN
                credential_status := 'pass';
                readiness_score := readiness_score + 25;
            ELSE
                blocking_issues := blocking_issues || jsonb_build_object(
                    'type', 'credentials',
                    'message', 'No valid credentials configured for this server',
                    'resolution', 'Configure credential profiles and assignments'
                );
            END IF;
            
            -- Check firmware update capability
            IF server_record.idrac_version IS NOT NULL AND server_record.model IS NOT NULL THEN
                firmware_capability := 'pass';
                readiness_score := readiness_score + 25;
            ELSE
                blocking_issues := blocking_issues || jsonb_build_object(
                    'type', 'firmware',
                    'message', 'Server model or iDRAC version not detected',
                    'resolution', 'Run server discovery to gather hardware information'
                );
            END IF;
            
            -- Check vCenter integration if applicable
            IF server_record.vcenter_id IS NOT NULL THEN
                IF EXISTS (SELECT 1 FROM vcenters WHERE id = server_record.vcenter_id) THEN
                    vcenter_status := 'pass';
                    readiness_score := readiness_score + 25;
                ELSE
                    vcenter_status := 'fail';
                    warnings := warnings || jsonb_build_object(
                        'type', 'vcenter',
                        'message', 'vCenter connection not available',
                        'resolution', 'Check vCenter connectivity and credentials'
                    );
                END IF;
            ELSE
                readiness_score := readiness_score + 25; -- Not applicable, give full points
            END IF;
            
            -- Determine overall readiness
            IF jsonb_array_length(blocking_issues) = 0 THEN
                IF readiness_score >= 90 THEN
                    overall_readiness := 'ready';
                    ready_servers := ready_servers + 1;
                ELSE
                    overall_readiness := 'degraded';
                END IF;
            END IF;
            
            -- Insert readiness check result
            INSERT INTO server_readiness_checks (
                server_id, connectivity_status, credential_status, 
                firmware_capability_status, vcenter_integration_status,
                overall_readiness, readiness_score, blocking_issues, warnings
            ) VALUES (
                server_record.id, connectivity_status, credential_status,
                firmware_capability, vcenter_status,
                overall_readiness, readiness_score, blocking_issues, warnings
            );
            
            -- Add to results
            server_results := server_results || jsonb_build_object(
                'server_id', server_record.id,
                'hostname', server_record.hostname,
                'ip_address', server_record.ip_address,
                'readiness', overall_readiness,
                'score', readiness_score,
                'blocking_issues', jsonb_array_length(blocking_issues),
                'warnings', jsonb_array_length(warnings)
            );
        END;
    END LOOP;
    
    -- Build summary
    readiness_result := jsonb_build_object(
        'servers', server_results,
        'summary', jsonb_build_object(
            'total_servers', total_servers,
            'ready_servers', ready_servers,
            'readiness_percentage', CASE WHEN total_servers > 0 THEN (ready_servers::NUMERIC / total_servers * 100) ELSE 0 END,
            'checked_at', NOW()
        )
    );
    
    RETURN readiness_result;
END;
$$;

-- Create updated_at trigger for new tables
CREATE TRIGGER update_health_scoring_config_updated_at
    BEFORE UPDATE ON public.health_scoring_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_backup_config_updated_at
    BEFORE UPDATE ON public.backup_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();