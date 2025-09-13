import { useState, useEffect } from 'react';

interface SetupConfig {
  backend_mode: 'supabase' | 'on_premise';
  organization_name: string;
  admin_email: string;
  deployment_type: 'cloud' | 'on_premise' | 'hybrid';
  setup_completed: boolean;
  setup_completed_at: string;
}

export function useSetupStatus() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [setupConfig, setSetupConfig] = useState<SetupConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = () => {
    try {
      // First check localStorage (for fresh setups)
      const localConfig = localStorage.getItem('idrac_setup_config');
      if (localConfig) {
        const config = JSON.parse(localConfig);
        setSetupConfig(config);
        setIsSetupComplete(config.setup_completed || false);
        setLoading(false);
        return;
      }

      // Then check if we have existing auth state (indicates previous setup)
      const hasAuth = localStorage.getItem('supabase.auth.token') !== null;
      setIsSetupComplete(hasAuth);
      setLoading(false);
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setIsSetupComplete(false);
      setLoading(false);
    }
  };

  const completeSetup = (config: SetupConfig) => {
    const finalConfig = {
      ...config,
      setup_completed: true,
      setup_completed_at: new Date().toISOString()
    };
    
    localStorage.setItem('idrac_setup_config', JSON.stringify(finalConfig));
    setSetupConfig(finalConfig);
    setIsSetupComplete(true);
  };

  const clearSetup = () => {
    localStorage.removeItem('idrac_setup_config');
    setSetupConfig(null);
    setIsSetupComplete(false);
  };

  return {
    isSetupComplete,
    setupConfig,
    loading,
    completeSetup,
    clearSetup,
    refreshStatus: checkSetupStatus
  };
}