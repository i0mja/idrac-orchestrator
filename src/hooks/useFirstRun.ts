import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemSetup {
  backend_mode: 'supabase' | 'onprem';
  organization_name: string;
  admin_email: string;
  deployment_type: 'development' | 'staging' | 'production';
  setup_completed: boolean;
  setup_completed_at?: string;
}

export const useFirstRun = () => {
  const [isFirstRun, setIsFirstRun] = useState<boolean>(true);
  const [setupConfig, setSetupConfig] = useState<SystemSetup | null>(null);
  const [loading, setLoading] = useState(true);

  const checkFirstRun = async () => {
    try {
      setLoading(true);
      
      // Check if system_config has setup completion flag
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'initial_setup')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data && data.value) {
        const config = data.value as unknown as SystemSetup;
        setSetupConfig(config);
        setIsFirstRun(!config.setup_completed);
      } else {
        setIsFirstRun(true);
        setSetupConfig(null);
      }
    } catch (error) {
      console.error('Error checking first run status:', error);
      // Default to first run if we can't determine status
      setIsFirstRun(true);
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async (config: Omit<SystemSetup, 'setup_completed' | 'setup_completed_at'>) => {
    try {
      const setupData: SystemSetup = {
        ...config,
        setup_completed: true,
        setup_completed_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'initial_setup',
          value: setupData as any,
          description: 'Initial system setup configuration'
        });

      if (error) throw error;

      setSetupConfig(setupData);
      setIsFirstRun(false);
      
      return { success: true };
    } catch (error) {
      console.error('Error completing setup:', error);
      return { success: false, error };
    }
  };

  const resetSetup = async () => {
    try {
      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('key', 'initial_setup');

      if (error) throw error;

      setSetupConfig(null);
      setIsFirstRun(true);
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting setup:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    checkFirstRun();
  }, []);

  return {
    isFirstRun,
    setupConfig,
    loading,
    completeSetup,
    resetSetup,
    refreshStatus: checkFirstRun
  };
};