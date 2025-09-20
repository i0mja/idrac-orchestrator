import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PreCheckResult {
  can_enter_maintenance: boolean
  blocking_issues: string[]
  warnings: string[]
  vm_evacuation_plan?: {
    total_vms: number
    evacuatable_vms: number
    problem_vms: Array<{
      vm_name: string
      issue: string
      resolution?: string
    }>
  }
  estimated_duration_minutes: number
}

interface MaintenanceResult {
  success: boolean
  task_id?: string
  status: string
  message: string
  pre_check_result?: PreCheckResult
}

interface HostStatus {
  connection_state: string
  in_maintenance_mode: boolean
  power_state: string
  name: string
}

export const useMaintenanceOrchestrator = () => {
  const [loading, setLoading] = useState(false);
  const [activeOperations, setActiveOperations] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  const performPreCheck = useCallback(async (vcenterId: string, hostMoid: string): Promise<PreCheckResult> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('host-maintenance-mode', {
        body: {
          action: 'pre-check',
          vcenter_id: vcenterId,
          host_moid: hostMoid
        }
      });

      if (error) throw error;

      if (data.success) {
        return data.pre_check_result;
      } else {
        throw new Error(data.error || 'Pre-check failed');
      }
    } catch (error: any) {
      console.error('Maintenance pre-check failed:', error);
      toast({
        title: "Pre-check Failed",
        description: error.message || "Failed to perform maintenance pre-check",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const enterMaintenanceMode = useCallback(async (
    vcenterId: string, 
    hostMoid: string, 
    options: {
      evacuate_vms?: boolean
      timeout_minutes?: number
      force?: boolean
      wait_for_completion?: boolean
    } = {}
  ): Promise<MaintenanceResult> => {
    try {
      setLoading(true);
      setActiveOperations(prev => new Map(prev.set(hostMoid, 'entering')));

      const { data, error } = await supabase.functions.invoke('host-maintenance-mode', {
        body: {
          action: 'enter',
          vcenter_id: vcenterId,
          host_moid: hostMoid,
          options
        }
      });

      if (error) throw error;

      const result: MaintenanceResult = {
        success: data.success,
        task_id: data.task_id,
        status: data.status,
        message: data.message
      };

      if (result.success) {
        toast({
          title: "Maintenance Mode",
          description: result.message,
        });
      } else {
        toast({
          title: "Maintenance Mode Failed",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;
    } catch (error: any) {
      console.error('Enter maintenance mode failed:', error);
      toast({
        title: "Maintenance Mode Failed",
        description: error.message || "Failed to enter maintenance mode",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
      setActiveOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(hostMoid);
        return newMap;
      });
    }
  }, [toast]);

  const exitMaintenanceMode = useCallback(async (
    vcenterId: string, 
    hostMoid: string,
    options: {
      wait_for_completion?: boolean
    } = {}
  ): Promise<MaintenanceResult> => {
    try {
      setLoading(true);
      setActiveOperations(prev => new Map(prev.set(hostMoid, 'exiting')));

      const { data, error } = await supabase.functions.invoke('host-maintenance-mode', {
        body: {
          action: 'exit',
          vcenter_id: vcenterId,
          host_moid: hostMoid,
          options
        }
      });

      if (error) throw error;

      const result: MaintenanceResult = {
        success: data.success,
        task_id: data.task_id,
        status: data.status,
        message: data.message
      };

      if (result.success) {
        toast({
          title: "Maintenance Mode",
          description: result.message,
        });
      } else {
        toast({
          title: "Exit Maintenance Failed",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;
    } catch (error: any) {
      console.error('Exit maintenance mode failed:', error);
      toast({
        title: "Exit Maintenance Failed",
        description: error.message || "Failed to exit maintenance mode",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
      setActiveOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(hostMoid);
        return newMap;
      });
    }
  }, [toast]);

  const getMaintenanceStatus = useCallback(async (vcenterId: string, hostMoid: string): Promise<HostStatus> => {
    try {
      const { data, error } = await supabase.functions.invoke('host-maintenance-mode', {
        body: {
          action: 'status',
          vcenter_id: vcenterId,
          host_moid: hostMoid
        }
      });

      if (error) throw error;

      if (data.success) {
        return data.host_status;
      } else {
        throw new Error(data.error || 'Status check failed');
      }
    } catch (error: any) {
      console.error('Maintenance status check failed:', error);
      throw error;
    }
  }, []);

  const isHostBusy = useCallback((hostMoid: string) => {
    return activeOperations.has(hostMoid);
  }, [activeOperations]);

  const getHostOperation = useCallback((hostMoid: string) => {
    return activeOperations.get(hostMoid);
  }, [activeOperations]);

  return {
    loading,
    activeOperations: activeOperations,
    performPreCheck,
    enterMaintenanceMode,
    exitMaintenanceMode,
    getMaintenanceStatus,
    isHostBusy,
    getHostOperation
  };
};