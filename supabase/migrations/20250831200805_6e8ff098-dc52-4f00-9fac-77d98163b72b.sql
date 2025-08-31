-- Create credential profiles table for managing multiple credential sets
CREATE TABLE public.credential_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL, -- Will store encrypted password
  port INTEGER DEFAULT 443,
  protocol TEXT DEFAULT 'https' CHECK (protocol IN ('https', 'http')),
  is_default BOOLEAN DEFAULT false,
  priority_order INTEGER DEFAULT 100, -- Lower number = higher priority
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create IP range credential assignments
CREATE TABLE public.credential_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credential_profile_id UUID NOT NULL REFERENCES public.credential_profiles(id) ON DELETE CASCADE,
  datacenter_id UUID REFERENCES public.datacenters(id) ON DELETE CASCADE,
  ip_range_cidr CIDR, -- e.g., 192.168.1.0/24
  ip_range_start INET, -- Alternative: specific range start
  ip_range_end INET, -- Alternative: specific range end
  priority_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_ip_range CHECK (
    (ip_range_cidr IS NOT NULL) OR 
    (ip_range_start IS NOT NULL AND ip_range_end IS NOT NULL)
  )
);

-- Create host-specific credential overrides
CREATE TABLE public.host_credential_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  credential_profile_id UUID NOT NULL REFERENCES public.credential_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(server_id),
  UNIQUE(ip_address)
);

-- Enable RLS on all tables
ALTER TABLE public.credential_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_credential_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies for credential_profiles
CREATE POLICY "Allow authenticated access to credential profiles" 
ON public.credential_profiles 
FOR ALL 
USING (true);

-- Create policies for credential_assignments
CREATE POLICY "Allow authenticated access to credential assignments" 
ON public.credential_assignments 
FOR ALL 
USING (true);

-- Create policies for host_credential_overrides
CREATE POLICY "Allow authenticated access to host credential overrides" 
ON public.host_credential_overrides 
FOR ALL 
USING (true);

-- Create function to get credentials for an IP address
CREATE OR REPLACE FUNCTION public.get_credentials_for_ip(target_ip INET)
RETURNS TABLE(
  credential_profile_id UUID,
  name TEXT,
  username TEXT,
  password_encrypted TEXT,
  port INTEGER,
  protocol TEXT,
  priority_order INTEGER,
  assignment_type TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- First check for host-specific overrides
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.username,
    cp.password_encrypted,
    cp.port,
    cp.protocol,
    1 as priority_order, -- Highest priority
    'host_override'::TEXT as assignment_type
  FROM public.host_credential_overrides hco
  JOIN public.credential_profiles cp ON cp.id = hco.credential_profile_id
  WHERE hco.ip_address = target_ip;
  
  -- If no host override found, check IP range assignments
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      cp.id,
      cp.name,
      cp.username,
      cp.password_encrypted,
      cp.port,
      cp.protocol,
      ca.priority_order,
      'ip_range'::TEXT as assignment_type
    FROM public.credential_assignments ca
    JOIN public.credential_profiles cp ON cp.id = ca.credential_profile_id
    WHERE ca.is_active = true
    AND (
      (ca.ip_range_cidr IS NOT NULL AND target_ip << ca.ip_range_cidr) OR
      (ca.ip_range_start IS NOT NULL AND ca.ip_range_end IS NOT NULL 
       AND target_ip >= ca.ip_range_start AND target_ip <= ca.ip_range_end)
    )
    ORDER BY ca.priority_order ASC, ca.created_at ASC;
  END IF;
  
  -- If still nothing found, return default credentials
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      cp.id,
      cp.name,
      cp.username,
      cp.password_encrypted,
      cp.port,
      cp.protocol,
      cp.priority_order,
      'default'::TEXT as assignment_type
    FROM public.credential_profiles cp
    WHERE cp.is_default = true
    ORDER BY cp.priority_order ASC
    LIMIT 1;
  END IF;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_credential_profiles_updated_at
  BEFORE UPDATE ON public.credential_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credential_assignments_updated_at
  BEFORE UPDATE ON public.credential_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default credential profile
INSERT INTO public.credential_profiles (name, description, username, password_encrypted, is_default, priority_order)
VALUES ('Dell Default', 'Default Dell iDRAC credentials', 'root', 'calvin', true, 1);