-- Update the function to set search_path for security
CREATE OR REPLACE FUNCTION public.is_setup_completed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT (value)::boolean FROM public.system_config WHERE key = 'setup_completed'), 
    false
  );
$$;