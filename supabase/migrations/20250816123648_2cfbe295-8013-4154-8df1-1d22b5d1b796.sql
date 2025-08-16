-- Enhanced: Fix function search path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = '';

-- Enhanced: Create function to check OS EOL status and generate alerts
CREATE OR REPLACE FUNCTION public.check_os_eol_status()
RETURNS void AS $$
DECLARE
    server_record RECORD;
    compatibility_record RECORD;
BEGIN
    -- Loop through all servers with OS information
    FOR server_record IN 
        SELECT id, hostname, operating_system, os_version, os_eol_date 
        FROM servers 
        WHERE operating_system IS NOT NULL 
    LOOP
        -- Check if OS is past EOL or will expire soon
        IF server_record.os_eol_date IS NOT NULL AND server_record.os_eol_date <= CURRENT_DATE + INTERVAL '90 days' THEN
            -- Get compatibility info for recommendations
            SELECT * INTO compatibility_record 
            FROM os_compatibility 
            WHERE operating_system = server_record.operating_system 
            AND os_version = server_record.os_version
            LIMIT 1;
            
            -- Insert EOL alert if not already exists
            INSERT INTO eol_alerts (server_id, alert_type, severity, message, recommendation)
            SELECT 
                server_record.id,
                'os_eol',
                CASE 
                    WHEN server_record.os_eol_date <= CURRENT_DATE THEN 'critical'
                    WHEN server_record.os_eol_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'high'
                    ELSE 'warning'
                END,
                FORMAT('%s %s is EOL or expiring soon (%s)', 
                    server_record.operating_system, 
                    server_record.os_version, 
                    server_record.os_eol_date),
                COALESCE(compatibility_record.recommendations, 'Consider upgrading to a supported OS version')
            WHERE NOT EXISTS (
                SELECT 1 FROM eol_alerts 
                WHERE server_id = server_record.id 
                AND alert_type = 'os_eol' 
                AND acknowledged = false
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = '';