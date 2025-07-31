-- Drop all existing policies on system_config
DROP POLICY IF EXISTS "Allow setup and authenticated access" ON public.system_config;

-- Make sure RLS is disabled
ALTER TABLE public.system_config DISABLE ROW LEVEL SECURITY;