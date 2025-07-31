-- Create enum types for better data integrity
CREATE TYPE public.server_status AS ENUM ('online', 'offline', 'updating', 'error', 'unknown');
CREATE TYPE public.update_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.firmware_type AS ENUM ('idrac', 'bios', 'storage', 'network', 'other');
CREATE TYPE public.connection_method AS ENUM ('redfish', 'racadm', 'vcenter');

-- Create servers table
CREATE TABLE public.servers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    hostname TEXT NOT NULL,
    ip_address INET NOT NULL,
    model TEXT,
    service_tag TEXT,
    idrac_version TEXT,
    bios_version TEXT,
    status server_status DEFAULT 'unknown',
    vcenter_id UUID,
    rack_location TEXT,
    datacenter TEXT,
    environment TEXT DEFAULT 'production',
    last_discovered TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(ip_address)
);

-- Create vcenters table for vCenter configurations
CREATE TABLE public.vcenters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    hostname TEXT NOT NULL,
    username TEXT NOT NULL,
    ignore_ssl BOOLEAN DEFAULT true,
    port INTEGER DEFAULT 443,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(hostname)
);

-- Create server_credentials table for secure credential storage
CREATE TABLE public.server_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
    connection_method connection_method NOT NULL,
    username TEXT NOT NULL,
    port INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(server_id, connection_method)
);

-- Create firmware_packages table
CREATE TABLE public.firmware_packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    firmware_type firmware_type NOT NULL,
    component_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    checksum TEXT,
    release_date DATE,
    applicable_models TEXT[],
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name, version)
);

-- Create update_jobs table
CREATE TABLE public.update_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
    firmware_package_id UUID REFERENCES public.firmware_packages(id) ON DELETE CASCADE NOT NULL,
    status update_job_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    logs TEXT,
    created_by TEXT DEFAULT auth.uid()::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_config table for application settings
CREATE TABLE public.system_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vcenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firmware_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing authenticated users to access all data for now)
-- In production, you'd want more granular permissions based on user roles
CREATE POLICY "Allow authenticated access" ON public.servers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.vcenters FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.server_credentials FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.firmware_packages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.update_jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.system_config FOR ALL TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX idx_servers_status ON public.servers(status);
CREATE INDEX idx_servers_ip_address ON public.servers(ip_address);
CREATE INDEX idx_servers_vcenter ON public.servers(vcenter_id);
CREATE INDEX idx_update_jobs_status ON public.update_jobs(status);
CREATE INDEX idx_update_jobs_server ON public.update_jobs(server_id);
CREATE INDEX idx_update_jobs_scheduled ON public.update_jobs(scheduled_at);
CREATE INDEX idx_firmware_packages_type ON public.firmware_packages(firmware_type);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON public.servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vcenters_updated_at BEFORE UPDATE ON public.vcenters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_server_credentials_updated_at BEFORE UPDATE ON public.server_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_firmware_packages_updated_at BEFORE UPDATE ON public.firmware_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_update_jobs_updated_at BEFORE UPDATE ON public.update_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system configuration
INSERT INTO public.system_config (key, value, description) VALUES
('discovery_enabled', 'true', 'Enable automatic server discovery'),
('max_concurrent_updates', '5', 'Maximum number of concurrent firmware updates'),
('update_timeout_minutes', '60', 'Timeout for firmware updates in minutes'),
('retry_attempts', '3', 'Number of retry attempts for failed operations'),
('redfish_timeout_seconds', '30', 'Timeout for Redfish API calls'),
('racadm_timeout_seconds', '120', 'Timeout for racadm commands'),
('vcenter_ssl_verify', 'false', 'Verify SSL certificates for vCenter connections');