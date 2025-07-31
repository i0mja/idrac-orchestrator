import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemConfiguration {
  setup_completed: boolean;
  organization_name?: string;
  admin_email?: string;
  timezone?: string;
  notification_settings?: {
    email_alerts: boolean;
    slack_webhook?: string;
  };
  auto_discovery?: {
    enabled: boolean;
    interval_hours: number;
    ip_ranges: string[];
  };
  security_settings?: {
    require_approval: boolean;
    backup_before_update: boolean;
    max_concurrent_updates: number;
  };
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfiguration>({
    setup_completed: false
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value');

      if (error) throw error;

      const configMap = new Map(data?.map(item => [item.key, item.value]) || []);
      
      setConfig({
        setup_completed: configMap.get('setup_completed') || false,
        organization_name: configMap.get('organization_name'),
        admin_email: configMap.get('admin_email'),
        timezone: configMap.get('timezone'),
        notification_settings: configMap.get('notification_settings'),
        auto_discovery: configMap.get('auto_discovery'),
        security_settings: configMap.get('security_settings')
      });
    } catch (error) {
      console.error('Error loading system config:', error);
      toast({
        title: "Error",
        description: "Failed to load system configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key,
          value,
          description: `System configuration for ${key}`
        });

      if (error) throw error;
      
      // Reload config to ensure consistency
      await loadConfig();
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    loadConfig,
    updateConfig
  };
}