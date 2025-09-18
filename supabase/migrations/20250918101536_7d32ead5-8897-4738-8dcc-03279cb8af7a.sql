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
  description TEXT,
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

-- Create updated_at trigger for new tables
CREATE TRIGGER update_health_scoring_config_updated_at
    BEFORE UPDATE ON public.health_scoring_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_backup_config_updated_at
    BEFORE UPDATE ON public.backup_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();