-- Fix remaining function search path security warnings

-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.has_permission(user_uuid uuid, perm app_permission)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN profiles p ON p.id = up.user_id
    WHERE p.user_id = user_uuid
    AND up.permission = perm
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = user_uuid AND p.role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_user_id uuid, p_action character varying, p_resource_type character varying DEFAULT NULL::character varying, p_resource_id uuid DEFAULT NULL::uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_success boolean DEFAULT true, p_error_message text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, 
    ip_address, user_agent, success, error_message, metadata
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_ip_address, p_user_agent, p_success, p_error_message, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_analytics_event(p_event_type character varying, p_user_id uuid DEFAULT NULL::uuid, p_session_id uuid DEFAULT NULL::uuid, p_properties jsonb DEFAULT '{}'::jsonb, p_server_id uuid DEFAULT NULL::uuid, p_campaign_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    event_type, user_id, session_id, properties,
    server_id, campaign_id
  ) VALUES (
    p_event_type, p_user_id, p_session_id, p_properties,
    p_server_id, p_campaign_id
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;