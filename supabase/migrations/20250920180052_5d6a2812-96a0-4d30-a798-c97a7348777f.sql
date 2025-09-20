-- Enhanced Discovery System: Add Protocol Capabilities Support (Fixed)
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

-- Add indexes for cache lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_discovery_cache_ip ON discovery_cache(ip_address);
CREATE INDEX IF NOT EXISTS idx_discovery_cache_expires ON discovery_cache(expires_at);

-- Enable RLS on discovery_cache
ALTER TABLE discovery_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for discovery_cache
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'discovery_cache' 
        AND policyname = 'Allow authenticated access to discovery cache'
    ) THEN
        CREATE POLICY "Allow authenticated access to discovery cache"
        ON discovery_cache
        FOR ALL
        USING (true);
    END IF;
END$$;

-- Create cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_discovery_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM discovery_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

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