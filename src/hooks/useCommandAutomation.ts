import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AutomationPolicy {
  id: string;
  name: string;
  target_type: 'cluster' | 'host_group';
  target_groups: string[];
  rotation_interval_days: number;
  maintenance_window_start: string;
  maintenance_window_end: string;
  command_template: {
    command_type: 'update_firmware' | 'reboot' | 'maintenance_mode' | 'health_check';
    version_target?: string;
    [key: string]: any;
  };
  enabled: boolean;
  last_executed?: string;
  next_execution: string;
  created_at: string;
  updated_at: string;
}

export interface RemoteCommand {
  id: string;
  name: string;
  target_type: 'cluster' | 'host_group' | 'individual';
  target_names: string[];
  command_type: 'update_firmware' | 'reboot' | 'maintenance_mode' | 'health_check';
  command_parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  scheduled_at?: string;
  executed_at?: string;
  created_by: string;
  created_at: string;
}

export function useCommandAutomation() {
  const [automationPolicies, setAutomationPolicies] = useState<AutomationPolicy[]>([]);
  const [commandHistory, setCommandHistory] = useState<RemoteCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAutomationPolicies = async () => {
    try {
      // In a real implementation, these would be stored in dedicated tables
      // For now, we'll use mock data
      const mockPolicies: AutomationPolicy[] = [
        {
          id: '1',
          name: 'Quarterly Cluster Updates',
          target_type: 'cluster',
          target_groups: ['Production', 'Staging'],
          rotation_interval_days: 90,
          maintenance_window_start: '02:00',
          maintenance_window_end: '06:00',
          command_template: {
            command_type: 'update_firmware',
            version_target: 'latest'
          },
          enabled: true,
          next_execution: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setAutomationPolicies(mockPolicies);
    } catch (error) {
      console.error('Error fetching automation policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation policies",
        variant: "destructive",
      });
    }
  };

  const fetchCommandHistory = async () => {
    try {
      // Mock command history
      const mockCommands: RemoteCommand[] = [
        {
          id: '1',
          name: 'Production Cluster Health Check',
          target_type: 'cluster',
          target_names: ['Production'],
          command_type: 'health_check',
          command_parameters: { check_types: ['hardware', 'network'] },
          status: 'completed',
          executed_at: new Date(Date.now() - 3600000).toISOString(),
          created_by: 'admin',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      
      setCommandHistory(mockCommands);
    } catch (error) {
      console.error('Error fetching command history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch command history",
        variant: "destructive",
      });
    }
  };

  const createAutomationPolicy = async (policyData: Omit<AutomationPolicy, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPolicy: AutomationPolicy = {
        ...policyData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // In a real implementation, this would be stored in the database
      setAutomationPolicies(prev => [...prev, newPolicy]);

      toast({
        title: "Success",
        description: "Automation policy created successfully",
      });

      return newPolicy;
    } catch (error) {
      console.error('Error creating automation policy:', error);
      toast({
        title: "Error",
        description: "Failed to create automation policy",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAutomationPolicy = async (id: string, updates: Partial<AutomationPolicy>) => {
    try {
      setAutomationPolicies(prev => prev.map(policy => 
        policy.id === id 
          ? { ...policy, ...updates, updated_at: new Date().toISOString() }
          : policy
      ));

      toast({
        title: "Success",
        description: "Automation policy updated successfully",
      });
    } catch (error) {
      console.error('Error updating automation policy:', error);
      toast({
        title: "Error",
        description: "Failed to update automation policy",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleAutomationPolicy = async (id: string) => {
    const policy = automationPolicies.find(p => p.id === id);
    if (!policy) return;

    await updateAutomationPolicy(id, { enabled: !policy.enabled });
  };

  const executeRemoteCommand = async (commandData: Omit<RemoteCommand, 'id' | 'created_at' | 'status'>) => {
    try {
      const command: RemoteCommand = {
        ...commandData,
        id: Date.now().toString(),
        status: commandData.scheduled_at ? 'pending' : 'executing',
        created_at: new Date().toISOString()
      };

      // Call the edge function to execute the command
      const { error } = await supabase.functions.invoke('execute-remote-command', {
        body: {
          command,
          immediate_execution: !commandData.scheduled_at
        }
      });

      if (error) throw error;

      setCommandHistory(prev => [command, ...prev]);

      toast({
        title: "Success",
        description: `Command ${commandData.scheduled_at ? 'scheduled' : 'executed'} successfully`,
      });

      return command;
    } catch (error) {
      console.error('Error executing remote command:', error);
      toast({
        title: "Error",
        description: "Failed to execute remote command",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getNextRotationDate = (policy: AutomationPolicy): Date => {
    const lastExecuted = policy.last_executed ? new Date(policy.last_executed) : new Date();
    return new Date(lastExecuted.getTime() + policy.rotation_interval_days * 24 * 60 * 60 * 1000);
  };

  const getOverduePolicies = (): AutomationPolicy[] => {
    const now = new Date();
    return automationPolicies.filter(policy => 
      policy.enabled && new Date(policy.next_execution) <= now
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAutomationPolicies(),
        fetchCommandHistory()
      ]);
      setLoading(false);
    };

    loadData();

    // Set up periodic checks for automation policies
    const interval = setInterval(() => {
      const overduePolicies = getOverduePolicies();
      if (overduePolicies.length > 0) {
        console.log(`Found ${overduePolicies.length} overdue automation policies`);
        // In a real implementation, this would trigger the policies
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    automationPolicies,
    commandHistory,
    loading,
    createAutomationPolicy,
    updateAutomationPolicy,
    toggleAutomationPolicy,
    executeRemoteCommand,
    getNextRotationDate,
    getOverduePolicies,
    refreshData: () => {
      fetchAutomationPolicies();
      fetchCommandHistory();
    }
  };
}