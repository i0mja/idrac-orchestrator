-- Add comprehensive system configuration entries for enterprise firmware management

-- Insert default iDRAC credentials configuration
INSERT INTO public.system_config (key, value, description) 
VALUES 
  ('idrac_default_credentials', '{"username": "root", "password": "", "port": 443, "ssl_verify": false}', 'Default iDRAC connection credentials'),
  ('storage_settings', '{"local_path": "/opt/firmware", "max_size_gb": 500, "retention_days": 90, "auto_cleanup": true}', 'Local file storage configuration'),
  ('smtp_settings', '{"host": "", "port": 587, "username": "", "password": "", "use_tls": true, "from_address": "firmware@company.com"}', 'Email server configuration'),
  ('auth_settings', '{"method": "local", "password_policy": {"min_length": 8, "require_uppercase": true, "require_numbers": true}, "session_timeout_hours": 8}', 'Authentication and security settings'),
  ('network_settings', '{"discovery_ranges": ["192.168.1.0/24"], "proxy_url": "", "dns_servers": [], "connection_timeout": 30}', 'Network configuration'),
  ('security_policies', '{"enforce_https": true, "api_rate_limit": 100, "failed_login_attempts": 5, "account_lockout_minutes": 30}', 'Security policies and limits'),
  ('backup_settings', '{"enabled": false, "schedule": "0 2 * * *", "retention_days": 30, "include_firmware_files": false}', 'Database backup configuration'),
  ('monitoring_settings', '{"log_level": "INFO", "health_check_interval": 300, "disk_usage_alert": 85, "memory_usage_alert": 90}', 'Logging and monitoring configuration'),
  ('ssl_settings', '{"require_valid_certs": false, "custom_ca_path": "", "cipher_suites": "default"}', 'SSL/TLS configuration'),
  ('integration_settings', '{"external_monitoring": false, "webhook_urls": [], "api_keys": {}}', 'External system integrations');

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create LDAP configuration table for enterprise auth
CREATE TABLE IF NOT EXISTS public.ldap_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  bind_dn TEXT,
  bind_password TEXT,
  user_search_base TEXT NOT NULL,
  user_search_filter TEXT DEFAULT '(uid={username})',
  group_search_base TEXT,
  group_search_filter TEXT DEFAULT '(member={dn})',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on LDAP config
ALTER TABLE public.ldap_config ENABLE ROW LEVEL SECURITY;

-- Create policy for LDAP config (admin only)
CREATE POLICY "Only admins can manage LDAP config" 
ON public.ldap_config 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);