-- Enhanced: Add multi-datacenter and OS support to servers table
ALTER TABLE servers ADD COLUMN IF NOT EXISTS operating_system TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS os_eol_date DATE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE servers ADD COLUMN IF NOT EXISTS ism_installed BOOLEAN DEFAULT false;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS security_risk_level TEXT DEFAULT 'medium';

-- Enhanced: Create datacenters/sites table for multi-site management
CREATE TABLE IF NOT EXISTS public.datacenters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  timezone TEXT DEFAULT 'UTC',
  contact_email TEXT,
  maintenance_window_start TIME DEFAULT '02:00:00',
  maintenance_window_end TIME DEFAULT '06:00:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced: Enable RLS on datacenters table
ALTER TABLE public.datacenters ENABLE ROW LEVEL SECURITY;

-- Enhanced: Create policy for datacenter access
CREATE POLICY "Allow authenticated access to datacenters" 
ON public.datacenters 
FOR ALL 
USING (true);

-- Enhanced: Create OS compatibility matrix table
CREATE TABLE IF NOT EXISTS public.os_compatibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operating_system TEXT NOT NULL,
  os_version TEXT NOT NULL,
  server_model TEXT,
  eol_date DATE,
  support_status TEXT DEFAULT 'supported',
  risk_level TEXT DEFAULT 'low',
  recommendations TEXT,
  ism_compatible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced: Enable RLS on OS compatibility table
ALTER TABLE public.os_compatibility ENABLE ROW LEVEL SECURITY;

-- Enhanced: Create policy for OS compatibility access
CREATE POLICY "Allow authenticated access to OS compatibility" 
ON public.os_compatibility 
FOR ALL 
USING (true);

-- Enhanced: Create EOL alerts table
CREATE TABLE IF NOT EXISTS public.eol_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  message TEXT NOT NULL,
  recommendation TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced: Enable RLS on EOL alerts table
ALTER TABLE public.eol_alerts ENABLE ROW LEVEL SECURITY;

-- Enhanced: Create policy for EOL alerts access
CREATE POLICY "Allow authenticated access to EOL alerts" 
ON public.eol_alerts 
FOR ALL 
USING (true);

-- Enhanced: Insert sample datacenter data
INSERT INTO public.datacenters (name, location, timezone, contact_email) VALUES
('DC1-East', 'New York, NY', 'America/New_York', 'dc1-ops@company.com'),
('DC2-West', 'San Francisco, CA', 'America/Los_Angeles', 'dc2-ops@company.com'),
('DC3-Central', 'Chicago, IL', 'America/Chicago', 'dc3-ops@company.com')
ON CONFLICT DO NOTHING;

-- Enhanced: Insert sample OS compatibility data with EOL information
INSERT INTO public.os_compatibility (operating_system, os_version, eol_date, support_status, risk_level, recommendations, ism_compatible) VALUES
('CentOS', '7', '2024-06-30', 'eol', 'high', 'Migrate to RHEL 8/9 or Rocky Linux 8/9 immediately', true),
('CentOS', '8', '2021-12-31', 'eol', 'high', 'Migrate to RHEL 8/9 or Rocky Linux 8/9 immediately', true),
('RHEL', '8', '2029-05-31', 'supported', 'low', 'Continue regular patching', true),
('RHEL', '9', '2032-05-31', 'supported', 'low', 'Latest supported version', true),
('VMware ESXi', '6.7', '2025-10-15', 'extended_support', 'medium', 'Plan upgrade to ESXi 7.0 or 8.0', true),
('VMware ESXi', '7.0', '2027-04-02', 'supported', 'low', 'Continue regular patching', true),
('VMware ESXi', '8.0', '2031-04-02', 'supported', 'low', 'Latest supported version', true),
('Windows Server', '2016', '2027-01-12', 'supported', 'low', 'Plan upgrade to Windows Server 2019/2022', false),
('Windows Server', '2019', '2029-01-09', 'supported', 'low', 'Continue regular patching', false),
('Windows Server', '2022', '2031-10-14', 'supported', 'low', 'Latest supported version', false)
ON CONFLICT DO NOTHING;

-- Enhanced: Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced: Create triggers for automatic timestamp updates
CREATE TRIGGER update_datacenters_updated_at
    BEFORE UPDATE ON public.datacenters
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_os_compatibility_updated_at
    BEFORE UPDATE ON public.os_compatibility
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();