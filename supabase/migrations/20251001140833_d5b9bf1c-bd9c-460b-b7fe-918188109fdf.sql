-- Security Fix: Update profiles table RLS policy to restrict access to own profile only
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;

CREATE POLICY "Users can only view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Security Fix: Add SET search_path to security definer functions to prevent search_path exploits
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_organization_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.profiles p ON p.id = om.user_id
    WHERE p.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
    AND om.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(user_uuid uuid, perm app_permission)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.profiles p ON p.id = up.user_id
    WHERE p.user_id = user_uuid
    AND up.permission = perm
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_uuid AND p.role = 'admin'
  );
END;
$function$;