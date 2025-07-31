-- Drop the current policy
DROP POLICY IF EXISTS "Allow setup and authenticated access" ON public.system_config;

-- Create a simpler policy that allows unauthenticated access when setup_completed is not true
-- This will allow initial setup and then require authentication afterward
CREATE POLICY "Allow setup and authenticated access" ON public.system_config
FOR ALL
USING (
  -- Allow if user is authenticated
  auth.uid() IS NOT NULL
  -- OR if setup is not completed (includes when table is empty)
  OR NOT EXISTS (
    SELECT 1 FROM public.system_config 
    WHERE key = 'setup_completed' AND (value)::boolean = true
  )
)
WITH CHECK (
  -- Same logic for INSERT/UPDATE operations
  auth.uid() IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM public.system_config 
    WHERE key = 'setup_completed' AND (value)::boolean = true
  )
);

-- We can drop the function since we're not using it anymore
DROP FUNCTION IF EXISTS public.is_setup_completed();