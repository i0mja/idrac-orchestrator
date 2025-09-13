import { useState, useEffect } from 'react';
import type { SetupConfig, CompletedSetupConfig } from '@/types/setup';
import { supabase } from '@/integrations/supabase/client';

export function useSetupStatus() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [setupConfig, setSetupConfig] = useState<CompletedSetupConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
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

      // Check database for setup completion
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .eq('key', 'setup_completed')
        .single();

      if (error || !data) {
        // No setup found, first run
        setIsSetupComplete(false);
        setLoading(false);
        return;
      }

      const setupCompleted = data.value as boolean;
      setIsSetupComplete(setupCompleted);
      
      if (setupCompleted) {
        // Load full config from database
        const { data: configData } = await supabase
          .from('system_config')
          .select('key, value')
          .in('key', ['backend_mode', 'organization_name', 'admin_email', 'deployment_type', 'setup_completed_at']);
        
        if (configData) {
          const configMap = new Map(configData.map(item => [item.key, item.value]));
          setSetupConfig({
            backend_mode: (configMap.get('backend_mode') as 'supabase' | 'on_premise') || 'supabase',
            organization_name: (configMap.get('organization_name') as string) || '',
            admin_email: (configMap.get('admin_email') as string) || '',
            deployment_type: (configMap.get('deployment_type') as 'cloud' | 'on_premise' | 'hybrid') || 'cloud',
            setup_completed: true,
            setup_completed_at: (configMap.get('setup_completed_at') as string) || new Date().toISOString()
          });
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setIsSetupComplete(false);
      setLoading(false);
    }
  };

  const completeSetup = async (config: SetupConfig) => {
    const finalConfig: CompletedSetupConfig = {
      ...config,
      setup_completed: true,
      setup_completed_at: new Date().toISOString()
    };
    
    // Store temporarily in localStorage
    localStorage.setItem('idrac_setup_config', JSON.stringify(finalConfig));
    
    // Initialize database with setup configuration
    await initializeSystem(finalConfig);
    
    setSetupConfig(finalConfig);
    setIsSetupComplete(true);
  };

  const initializeSystem = async (config: CompletedSetupConfig) => {
    try {
      // Store setup config in database for future reference
      await supabase
        .from('system_config')
        .upsert([
          { key: 'setup_completed', value: true, description: 'Initial setup completion status' },
          { key: 'backend_mode', value: config.backend_mode, description: 'Backend deployment mode' },
          { key: 'organization_name', value: config.organization_name, description: 'Organization name' },
          { key: 'admin_email', value: config.admin_email, description: 'Administrator email' },
          { key: 'deployment_type', value: config.deployment_type, description: 'Deployment type' },
          { key: 'setup_completed_at', value: config.setup_completed_at, description: 'Setup completion timestamp' }
        ]);

      // Clean up localStorage after successful database storage
      localStorage.removeItem('idrac_setup_config');
    } catch (error) {
      console.error('Failed to initialize system:', error);
      // Keep localStorage as fallback if database fails
    }
  };

  const clearSetup = async () => {
    localStorage.removeItem('idrac_setup_config');
    
    // Also clear from database
    try {
      await supabase
        .from('system_config')
        .delete()
        .in('key', ['setup_completed', 'backend_mode', 'organization_name', 'admin_email', 'deployment_type', 'setup_completed_at']);
    } catch (error) {
      console.error('Failed to clear setup from database:', error);
    }
    
    setSetupConfig(null);
    setIsSetupComplete(false);
  };

  return {
    isSetupComplete,
    setupConfig,
    loading,
    completeSetup,
    clearSetup,
    refreshStatus: () => checkSetupStatus()
  };
}