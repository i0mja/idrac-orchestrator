-- Drop the problematic policy
DROP POLICY IF EXISTS "Allow setup and authenticated access" ON public.system_config;

-- Create a security definer function to check if setup is completed
-- This function can bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.is_setup_completed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT (value)::boolean FROM public.system_config WHERE key = 'setup_completed'), 
    false
  );
$$;

-- Create a new policy using the function to avoid recursion
CREATE POLICY "Allow setup and authenticated access" ON public.system_config
FOR ALL
USING (
  -- Allow access if setup is not completed OR user is authenticated
  NOT public.is_setup_completed() OR auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Same logic for INSERT/UPDATE operations
  NOT public.is_setup_completed() OR auth.uid() IS NOT NULL
);