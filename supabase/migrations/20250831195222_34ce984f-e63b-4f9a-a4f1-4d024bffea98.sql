-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.ip_in_datacenter_scope(ip_addr inet, datacenter_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    scope_record jsonb;
    subnet_cidr cidr;
BEGIN
    -- Get all IP scopes for the datacenter
    FOR scope_record IN 
        SELECT jsonb_array_elements(ip_scopes) 
        FROM public.datacenters 
        WHERE id = datacenter_id
    LOOP
        -- Extract subnet and check if IP is within it
        subnet_cidr := (scope_record->>'subnet')::cidr;
        IF ip_addr << subnet_cidr THEN
            RETURN true;
        END IF;
    END LOOP;
    
    RETURN false;
END;
$$;

-- Create function to auto-assign datacenter based on IP
CREATE OR REPLACE FUNCTION public.get_datacenter_for_ip(ip_addr inet)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Create trigger to auto-assign datacenter on server insert/update
CREATE OR REPLACE FUNCTION public.auto_assign_datacenter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;