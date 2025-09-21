import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IdmLoginData {
  username: string;
  password: string;
  domain?: string;
}

interface IdmUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  groups: string[];
}

export function useIdmAuth() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loginWithIdm = async (credentials: IdmLoginData): Promise<IdmUser | null> => {
    setLoading(true);
    
    try {
      console.log('Attempting IDM authentication:', { username: credentials.username });

      // Call the LDAP authentication edge function
      const { data, error: functionError } = await supabase.functions.invoke('ldap-authentication', {
        body: credentials
      });

      if (functionError) {
        console.error('IDM function error:', functionError);
        throw new Error('Authentication service unavailable');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Authentication failed');
      }

      console.log('IDM authentication successful:', data.user);

      // Establish Supabase session if tokens are provided
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          console.error('Session establishment error:', sessionError);
          // Don't throw here, user is authenticated even if session fails
        }
      }

      toast({
        title: "IDM Login Successful",
        description: `Welcome, ${data.user.full_name || data.user.username}!`,
      });

      return data.user;

    } catch (error) {
      console.error('IDM login error:', error);
      
      const message = error instanceof Error ? error.message : 'Authentication failed';
      
      toast({
        title: "IDM Login Failed",
        description: message,
        variant: "destructive",
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkIdmConfiguration = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'idm_enabled')
        .single();

      if (error) {
        console.error('Error checking IDM configuration:', error);
        return false;
      }

      return Boolean(
        data?.value && 
        typeof data.value === 'object' && 
        data.value !== null &&
        'enabled' in data.value && 
        data.value.enabled === true
      );
    } catch (error) {
      console.error('IDM configuration check failed:', error);
      return false;
    }
  };

  return {
    loginWithIdm,
    checkIdmConfiguration,
    loading
  };
}