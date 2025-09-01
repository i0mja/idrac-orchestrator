-- Database initialization script for iDRAC Updater Orchestrator
-- Run this after creating the database and before running the application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create database functions for credential resolution
CREATE OR REPLACE FUNCTION public.get_credentials_for_ip(target_ip inet)
RETURNS TABLE(credential_profile_id uuid, name text, username text, password_encrypted text, port integer, protocol text, priority_order integer, assignment_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

-- Create function for datacenter IP scope checking
CREATE OR REPLACE FUNCTION public.get_datacenter_for_ip(ip_addr inet)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    dc_id uuid;
    scope_record jsonb;
    subnet_cidr cidr;
BEGIN
    -- Loop through all active datacenters
    FOR dc_id IN 
        SELECT id FROM public.datacenters WHERE is_active = true
    LOOP
        -- Check if IP matches any scope in this datacenter
        FOR scope_record IN 
            SELECT jsonb_array_elements(ip_scopes) 
            FROM public.datacenters 
            WHERE id = dc_id
        LOOP
            subnet_cidr := (scope_record->>'subnet')::cidr;
            IF ip_addr << subnet_cidr THEN
                RETURN dc_id;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN NULL;
END;
$function$;

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Create function for auto-assigning datacenters
CREATE OR REPLACE FUNCTION public.auto_assign_datacenter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    assigned_dc_id uuid;
BEGIN
    -- Get datacenter for the IP address
    assigned_dc_id := public.get_datacenter_for_ip(NEW.ip_address);
    
    -- If found and not already set, assign it
    IF assigned_dc_id IS NOT NULL THEN
        NEW.datacenter := (SELECT name FROM public.datacenters WHERE id = assigned_dc_id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create function for making first user admin
CREATE OR REPLACE FUNCTION public.make_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    NEW.role = 'admin';
  END IF;
  RETURN NEW;
END;
$function$;

-- Create function for EOL status checking
CREATE OR REPLACE FUNCTION public.check_os_eol_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

-- Create custom types
CREATE TYPE server_status AS ENUM ('online', 'offline', 'maintenance', 'unknown', 'error');
CREATE TYPE update_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'scheduled');
CREATE TYPE firmware_type AS ENUM ('bios', 'idrac', 'nic', 'raid', 'storage', 'other');
CREATE TYPE connection_method AS ENUM ('ssh', 'winrm', 'snmp', 'redfish', 'wsman');

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Reload configuration
SELECT pg_reload_conf();

COMMENT ON DATABASE CURRENT_DATABASE() IS 'iDRAC Updater Orchestrator - Enterprise firmware management system';