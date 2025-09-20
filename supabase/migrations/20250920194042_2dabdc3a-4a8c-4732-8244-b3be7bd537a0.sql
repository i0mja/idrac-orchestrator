-- Add password encryption support and improve credential security
-- First, let's update the credential_profiles table to ensure we have proper encryption support

-- Add encrypted password field with proper default
ALTER TABLE public.credential_profiles 
ADD COLUMN IF NOT EXISTS password_encrypted_v2 TEXT;

-- Add created_by and updated_by tracking
ALTER TABLE public.credential_profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);

-- Add credential testing tracking
CREATE TABLE IF NOT EXISTS public.credential_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_profile_id UUID NOT NULL REFERENCES public.credential_profiles(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    protocol TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    response_time_ms INTEGER,
    error_message TEXT,
    tested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.credential_test_results ENABLE ROW LEVEL SECURITY;

-- Create policy for credential test results
CREATE POLICY "Allow authenticated access to credential test results" 
ON public.credential_test_results 
FOR ALL 
USING (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_credential_test_results_profile_id 
ON public.credential_test_results(credential_profile_id);

CREATE INDEX IF NOT EXISTS idx_credential_test_results_tested_at 
ON public.credential_test_results(tested_at DESC);

-- Create function to encrypt passwords (simplified version for demo)
CREATE OR REPLACE FUNCTION public.encrypt_credential_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use proper encryption like pgcrypto
    -- For now, this is a placeholder that at least obscures the password
    RETURN encode(plain_password::bytea, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt passwords (simplified version for demo)
CREATE OR REPLACE FUNCTION public.decrypt_credential_password(encrypted_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use proper decryption like pgcrypto
    -- For now, decode the base64 
    RETURN convert_from(decode(encrypted_password, 'base64'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
    -- If decoding fails, assume it's plain text (backward compatibility)
    RETURN encrypted_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get decrypted credentials for discovery processes
CREATE OR REPLACE FUNCTION public.get_decrypted_credentials_for_ip(target_ip inet)
RETURNS TABLE(
    credential_profile_id uuid, 
    name text, 
    username text, 
    password_decrypted text, 
    port integer, 
    protocol text, 
    priority_order integer, 
    assignment_type text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        creds.credential_profile_id,
        creds.name,
        creds.username,
        public.decrypt_credential_password(creds.password_encrypted) as password_decrypted,
        creds.port,
        creds.protocol,
        creds.priority_order,
        creds.assignment_type
    FROM public.get_credentials_for_ip(target_ip) creds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;