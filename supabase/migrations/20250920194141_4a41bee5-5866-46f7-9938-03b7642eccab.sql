-- Fix security warnings for newly created functions by setting proper search_path

-- Update encrypt_credential_password function with proper search_path
CREATE OR REPLACE FUNCTION public.encrypt_credential_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use proper encryption like pgcrypto
    -- For now, this is a placeholder that at least obscures the password
    RETURN encode(plain_password::bytea, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update decrypt_credential_password function with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update get_decrypted_credentials_for_ip function with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';