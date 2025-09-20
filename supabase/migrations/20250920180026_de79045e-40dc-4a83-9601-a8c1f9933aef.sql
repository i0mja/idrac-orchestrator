-- Enhanced Discovery System: Add Protocol Capabilities Support
-- Add protocol capabilities tracking to servers table

ALTER TABLE servers ADD COLUMN IF NOT EXISTS protocol_capabilities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS healthiest_protocol TEXT;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_protocol_check TIMESTAMPTZ;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS firmware_compliance JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_servers_protocol_capabilities ON servers USING gin(protocol_capabilities);
CREATE INDEX IF NOT EXISTS idx_servers_healthiest_protocol ON servers(healthiest_protocol);
CREATE INDEX IF NOT EXISTS idx_servers_last_protocol_check ON servers(last_protocol_check);

-- Create discovery_cache table for performance optimization
CREATE TABLE IF NOT EXISTS discovery_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    protocol_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    firmware_data JSONB DEFAULT '{}'::jsonb,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for cache lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_discovery_cache_ip ON discovery_cache(ip_address);
CREATE INDEX IF NOT EXISTS idx_discovery_cache_expires ON discovery_cache(expires_at);

-- Enable RLS on discovery_cache
ALTER TABLE discovery_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for discovery_cache
CREATE POLICY "Allow authenticated access to discovery cache"
ON discovery_cache
FOR ALL
USING (true);

-- Create cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_discovery_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM discovery_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create credential_profiles table for enhanced credential management
CREATE TABLE IF NOT EXISTS credential_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    description TEXT,
    protocol_priority JSONB DEFAULT '["REDFISH", "WSMAN", "RACADM", "IPMI", "SSH"]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on credential_profiles
ALTER TABLE credential_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for credential_profiles (admin only)
CREATE POLICY "Only admins can manage credential profiles"
ON credential_profiles
FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

-- Add some default credential profiles
INSERT INTO credential_profiles (name, username, password_encrypted, description, is_default)
VALUES 
    ('Dell Default', 'root', 'calvin', 'Default Dell iDRAC credentials', true),
    ('Custom Admin', 'admin', 'admin', 'Common admin credentials', false)
ON CONFLICT DO NOTHING;

-- Create function to update server protocol capabilities
CREATE OR REPLACE FUNCTION update_server_protocol_capabilities(
    p_server_id UUID,
    p_protocol_capabilities JSONB,
    p_healthiest_protocol TEXT,
    p_firmware_compliance JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE servers 
    SET 
        protocol_capabilities = p_protocol_capabilities,
        healthiest_protocol = p_healthiest_protocol,
        last_protocol_check = now(),
        firmware_compliance = COALESCE(p_firmware_compliance, firmware_compliance),
        updated_at = now()
    WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to credential_profiles
DROP TRIGGER IF EXISTS update_credential_profiles_updated_at ON credential_profiles;
CREATE TRIGGER update_credential_profiles_updated_at
    BEFORE UPDATE ON credential_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();