import { useState, useEffect } from 'react';
import type { SetupConfig, CompletedSetupConfig } from '@/types/setup';
import { supabase } from '@/integrations/supabase/client';

const SETUP_SENTINEL_KEY = 'idrac_setup_complete';

export function useSetupStatus() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [setupConfig, setSetupConfig] = useState<CompletedSetupConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      // 1) Fast path: durable local sentinel (survives DB/RLS hiccups in builder)
      const sentinel = localStorage.getItem(SETUP_SENTINEL_KEY) === 'true';
      if (sentinel) {
        setIsSetupComplete(true);
        // Optionally hydrate with any cached config if present
        const cached = localStorage.getItem('idrac_setup_config');
        if (cached) {
          try {
            setSetupConfig(JSON.parse(cached));
          } catch {}
        }
        setLoading(false);
        return;
      }

      // 2) Check local cached config (fresh setups before DB writes)
      const localConfig = localStorage.getItem('idrac_setup_config');
      if (localConfig) {
        const config = JSON.parse(localConfig);
        setSetupConfig(config);
        setIsSetupComplete(config.setup_completed || false);
        setLoading(false);
        return;
      }

      // 3) Check database for setup completion using the same key as useFirstRun
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'initial_setup')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data && data.value) {
        const config = data.value as unknown as CompletedSetupConfig;
        setSetupConfig(config);
        setIsSetupComplete(config.setup_completed);
      } else {
        setIsSetupComplete(false);
        setSetupConfig(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to check setup status:', error);
      // If we have the sentinel, prefer staying in the app instead of OOBE
      const sentinel = localStorage.getItem(SETUP_SENTINEL_KEY) === 'true';
      setIsSetupComplete(sentinel ? true : false);
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
    // Set durable sentinel so refreshes don't return to OOBE even if DB is unreachable
    localStorage.setItem(SETUP_SENTINEL_KEY, 'true');
    
    // Initialize database with setup configuration
    await initializeSystem(finalConfig);
    
    setSetupConfig(finalConfig);
    setIsSetupComplete(true);
  };

  const initializeSystem = async (config: CompletedSetupConfig) => {
    try {
      // Store setup config in database using the same key as useFirstRun
      await supabase
        .from('system_config')
        .upsert({
          key: 'initial_setup',
          value: config as any,
          description: 'Initial system setup configuration'
        });

      // Clean up localStorage after successful database storage
      localStorage.removeItem('idrac_setup_config');
    } catch (error) {
      console.error('Failed to initialize system:', error);
      // Keep localStorage as fallback if database fails
    }
  };

  const clearSetup = async () => {
    localStorage.removeItem('idrac_setup_config');
    localStorage.removeItem(SETUP_SENTINEL_KEY);
    
    // Also clear from database using the same key as useFirstRun
    try {
      await supabase
        .from('system_config')
        .delete()
        .eq('key', 'initial_setup');
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