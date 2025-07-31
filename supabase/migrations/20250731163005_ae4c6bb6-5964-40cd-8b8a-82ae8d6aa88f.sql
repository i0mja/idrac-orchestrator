-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated access" ON public.system_config;

-- Create a new policy that allows unauthenticated access for initial setup
-- but requires authentication after setup is complete
CREATE POLICY "Allow setup and authenticated access" ON public.system_config
FOR ALL
USING (
  -- Allow access if system setup is not completed yet (for initial setup)
  NOT EXISTS (
    SELECT 1 FROM public.system_config 
    WHERE key = 'setup_completed' AND (value)::boolean = true
  )
  -- OR if user is authenticated (for normal operations after setup)
  OR auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Same logic for INSERT/UPDATE operations
  NOT EXISTS (
    SELECT 1 FROM public.system_config 
    WHERE key = 'setup_completed' AND (value)::boolean = true
  )
  OR auth.uid() IS NOT NULL
);