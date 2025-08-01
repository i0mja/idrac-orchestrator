import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AutoOrchestrationConfig {
  id: string;
  enabled: boolean;
  execution_interval_months: number;
  update_interval_minutes: number;
  maintenance_window_start: string;
  maintenance_window_end: string;
  cluster_priority_order: string[];
  created_at: string;
  updated_at: string;
}

export const useAutoOrchestration = () => {
  const [config, setConfig] = useState<AutoOrchestrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('auto_orchestration_config')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching auto-orchestration config:', error);
        toast({
          title: "Error",
          description: "Failed to fetch auto-orchestration configuration",
          variant: "destructive",
        });
        return;
      }

      setConfig(data as AutoOrchestrationConfig);
    } catch (error) {
      console.error('Error fetching auto-orchestration config:', error);
      toast({
        title: "Error",
        description: "Failed to fetch auto-orchestration configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AutoOrchestrationConfig>) => {
    try {
      if (!config) return;

      const { error } = await supabase
        .from('auto_orchestration_config')
        .update(updates)
        .eq('id', config.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update configuration",
          variant: "destructive",
        });
        return;
      }

      setConfig({ ...config, ...updates } as AutoOrchestrationConfig);
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
    } catch (error) {
      console.error('Error updating auto-orchestration config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  const toggleAutoOrchestration = async () => {
    if (!config) return;
    await updateConfig({ enabled: !config.enabled });
  };

  useEffect(() => {
    fetchConfig();

    // Set up realtime subscription
    const channel = supabase
      .channel('auto-orchestration-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_orchestration_config'
        },
        () => {
          fetchConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    config,
    loading,
    fetchConfig,
    updateConfig,
    toggleAutoOrchestration
  };
};