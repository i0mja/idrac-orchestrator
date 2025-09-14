-- Fix security vulnerability: Restrict credential access to admin users only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated access to credential profiles" ON public.credential_profiles;
DROP POLICY IF EXISTS "Allow authenticated access to credential assignments" ON public.credential_assignments;  
DROP POLICY IF EXISTS "Allow authenticated access to host credential overrides" ON public.host_credential_overrides;

-- Create admin-only policies for credential_profiles
CREATE POLICY "Only admins can manage credential profiles" 
ON public.credential_profiles 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create admin-only policies for credential_assignments
CREATE POLICY "Only admins can manage credential assignments"
ON public.credential_assignments
FOR ALL 
TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create admin-only policies for host_credential_overrides
CREATE POLICY "Only admins can manage host credential overrides"
ON public.host_credential_overrides
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Add comment documenting the security fix
COMMENT ON TABLE public.credential_profiles IS 'Contains sensitive server credentials - access restricted to admin users only for security';
COMMENT ON TABLE public.credential_assignments IS 'Contains credential assignment rules - access restricted to admin users only for security';  
COMMENT ON TABLE public.host_credential_overrides IS 'Contains host-specific credential overrides - access restricted to admin users only for security';