import { useState, useEffect } from 'react';
import type { SetupConfig, CompletedSetupConfig } from '@/types/setup';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_ENABLED } from '@/lib/env';
import { getSetup, putSetup } from '@/lib/api';

const SETUP_SENTINEL_KEY = 'idrac_setup_complete';

export function useSetupStatus() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [setupConfig, setSetupConfig] = useState<CompletedSetupConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const readSentinel = () => {
    if (typeof window === 'undefined') return false;
    const value = localStorage.getItem(SETUP_SENTINEL_KEY);
    return value === 'true' || value === '1';
  };

  const readCachedConfig = (): CompletedSetupConfig | null => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem('idrac_setup_config');
    if (!cached) return null;
    try {
      return JSON.parse(cached) as CompletedSetupConfig;
    } catch {
      return null;
    }
  };

  const checkApiModeSetup = async () => {
    const cached = readCachedConfig();
    const sentinel = readSentinel();

    try {
      const remoteConfig = await getSetup();
      if (remoteConfig && (remoteConfig as any).setup_completed) {
        const completed = remoteConfig as CompletedSetupConfig;
        setSetupConfig(completed);
        setIsSetupComplete(true);
        localStorage.setItem(SETUP_SENTINEL_KEY, '1');
        return;
      }
    } catch (error) {
      console.error('Failed to fetch setup via API:', error);
    }

    if (cached) {
      setSetupConfig(cached);
      setIsSetupComplete(cached.setup_completed ?? sentinel);
      return;
    }

    setSetupConfig(null);
    setIsSetupComplete(sentinel);
  };

  const checkSupabaseSetup = async () => {
    const sentinel = readSentinel();
    if (sentinel) {
      setIsSetupComplete(true);
      const cachedConfig = readCachedConfig();
      if (cachedConfig) {
        setSetupConfig(cachedConfig);
      }
      return;
    }

    const cachedConfig = readCachedConfig();
    if (cachedConfig) {
      setSetupConfig(cachedConfig);
      setIsSetupComplete(cachedConfig.setup_completed || false);
      return;
    }

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
      setSetupConfig(null);
      setIsSetupComplete(false);
    }
  };

  const checkSetupStatus = async () => {
    try {
      if (!SUPABASE_ENABLED) {
        await checkApiModeSetup();
        return;
      }

      await checkSupabaseSetup();
    } catch (error) {
      console.error('Failed to check setup status:', error);
      const sentinel = readSentinel();
      setIsSetupComplete(sentinel);
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async (config: SetupConfig) => {
    const finalConfig: CompletedSetupConfig = {
      ...config,
      setup_completed: true,
      setup_completed_at: new Date().toISOString()
    };

    localStorage.setItem('idrac_setup_config', JSON.stringify(finalConfig));
    localStorage.setItem(SETUP_SENTINEL_KEY, SUPABASE_ENABLED ? 'true' : '1');

    if (!SUPABASE_ENABLED) {
      try {
        await putSetup(finalConfig);
        localStorage.removeItem('idrac_setup_config');
      } catch (error) {
        console.error('Failed to persist setup via API:', error);
      }

      setSetupConfig(finalConfig);
      setIsSetupComplete(true);
      return;
    }

    await initializeSystem(finalConfig);

    setSetupConfig(finalConfig);
    setIsSetupComplete(true);
  };

  const initializeSystem = async (config: CompletedSetupConfig) => {
    if (!SUPABASE_ENABLED) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('save-initial-setup', {
        body: { config }
      });

      if (error) throw error as any;

      localStorage.removeItem('idrac_setup_config');
    } catch (error) {
      console.error('Failed to initialize system:', error);
    }
  };

  const clearSetup = async () => {
    localStorage.removeItem('idrac_setup_config');
    localStorage.removeItem(SETUP_SENTINEL_KEY);

    if (!SUPABASE_ENABLED) {
      try {
        await putSetup({ setup_completed: false });
      } catch (error) {
        console.error('Failed to clear setup via API:', error);
      }

      setSetupConfig(null);
      setIsSetupComplete(false);
      return;
    }

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
