-- Add VMware integration tables and Dell enterprise features

-- VMware cluster and host management
CREATE TABLE vcenter_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vcenter_id UUID REFERENCES vcenters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  drs_enabled BOOLEAN DEFAULT false,
  ha_enabled BOOLEAN DEFAULT false,
  maintenance_mode_policy TEXT DEFAULT 'ensure_accessibility',
  total_hosts INTEGER DEFAULT 0,
  active_hosts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- VMware virtual machines for migration planning
CREATE TABLE virtual_machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  vm_name TEXT NOT NULL,
  vm_id TEXT NOT NULL,
  power_state TEXT DEFAULT 'unknown',
  cpu_count INTEGER,
  memory_mb INTEGER,
  storage_gb DECIMAL,
  vm_tools_status TEXT,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dell Update Packages (DUPs) management
CREATE TABLE dell_update_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  component_type TEXT NOT NULL, -- 'bios', 'idrac', 'nic', 'storage', 'drives'
  service_tag_compatibility TEXT[], -- Array of compatible service tags
  esxi_version_compatibility TEXT[], -- Compatible ESXi versions
  file_path TEXT,
  file_size BIGINT,
  checksum_md5 TEXT,
  checksum_sha256 TEXT,
  dell_part_number TEXT,
  release_date DATE,
  criticality TEXT DEFAULT 'recommended', -- 'critical', 'recommended', 'optional'
  requires_reboot BOOLEAN DEFAULT true,
  update_sequence_order INTEGER DEFAULT 100, -- Lower = earlier in sequence
  dependencies TEXT[], -- Array of required component updates
  known_issues TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Server configuration backups
CREATE TABLE server_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL, -- 'idrac_config', 'bios_profile', 'esxi_config'
  backup_data JSONB NOT NULL,
  file_path TEXT,
  backup_size BIGINT,
  created_by TEXT DEFAULT auth.uid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update orchestration plans with VMware integration
CREATE TABLE update_orchestration_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cluster_id UUID REFERENCES vcenter_clusters(id),
  server_ids UUID[] NOT NULL,
  update_sequence JSONB NOT NULL, -- Ordered array of update steps
  vmware_settings JSONB, -- VM migration settings, maintenance mode config
  safety_checks JSONB NOT NULL, -- Pre-update validation rules
  rollback_plan JSONB,
  status TEXT DEFAULT 'planned', -- 'planned', 'running', 'paused', 'completed', 'failed'
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT DEFAULT auth.uid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compatibility matrix for Dell + VMware
CREATE TABLE compatibility_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_model TEXT NOT NULL,
  esxi_version TEXT NOT NULL,
  bios_version TEXT,
  idrac_version TEXT,
  nic_firmware TEXT,
  storage_firmware TEXT,
  validation_status TEXT DEFAULT 'unknown', -- 'compatible', 'incompatible', 'warning', 'unknown'
  validation_notes TEXT,
  vmware_hcl_verified BOOLEAN DEFAULT false,
  last_validated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_vcenter_clusters_updated_at
  BEFORE UPDATE ON vcenter_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_virtual_machines_updated_at
  BEFORE UPDATE ON virtual_machines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dell_update_packages_updated_at
  BEFORE UPDATE ON dell_update_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_update_orchestration_plans_updated_at
  BEFORE UPDATE ON update_orchestration_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compatibility_matrix_updated_at
  BEFORE UPDATE ON compatibility_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE vcenter_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE dell_update_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_orchestration_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_matrix ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated access
CREATE POLICY "Allow authenticated access" ON vcenter_clusters FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON virtual_machines FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON dell_update_packages FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON server_backups FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON update_orchestration_plans FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON compatibility_matrix FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX idx_vcenter_clusters_vcenter_id ON vcenter_clusters(vcenter_id);
CREATE INDEX idx_virtual_machines_server_id ON virtual_machines(server_id);
CREATE INDEX idx_dell_update_packages_component_type ON dell_update_packages(component_type);
CREATE INDEX idx_dell_update_packages_sequence_order ON dell_update_packages(update_sequence_order);
CREATE INDEX idx_server_backups_server_id ON server_backups(server_id);
CREATE INDEX idx_update_orchestration_plans_status ON update_orchestration_plans(status);
CREATE INDEX idx_compatibility_matrix_server_model ON compatibility_matrix(server_model);
CREATE INDEX idx_compatibility_matrix_esxi_version ON compatibility_matrix(esxi_version);