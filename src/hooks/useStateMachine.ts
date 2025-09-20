import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HostRun {
  id: string;
  state: 'PRECHECKS' | 'ENTER_MAINT' | 'APPLY' | 'POSTCHECKS' | 'EXIT_MAINT' | 'DONE' | 'ERROR';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  context: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface StateMachineJob {
  id: string;
  type: 'firmware_update' | 'maintenance_mode' | 'health_check' | 'vcenter_sync';
  status: string;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  logs?: string;
}

export const useStateMachine = () => {
  const [hostRuns, setHostRuns] = useState<HostRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHostRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use raw SQL query since host_runs table is not in TypeScript types yet
      const { data, error: fetchError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT id, server_id, state, status, context, 
                 started_at, completed_at, error_message,
                 created_at, updated_at
          FROM host_runs 
          ORDER BY created_at DESC 
          LIMIT 50
        `
      });

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map((row: any) => ({
        id: row.id,
        serverId: row.server_id,
        state: row.state,
        status: row.status,
        context: row.context || {},
        startedAt: row.started_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message
      }));

      setHostRuns(transformedData);
    } catch (err) {
      console.error('Error fetching host runs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch host runs');
      
      // Fallback: use empty array if table doesn't exist yet
      setHostRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const startStateMachine = useCallback(async (hostRunId: string, context: Record<string, any>) => {
    try {
      const { data, error: startError } = await supabase.functions.invoke('state-machine-orchestrator', {
        body: {
          action: 'start',
          hostRunId,
          context
        }
      });

      if (startError) {
        throw startError;
      }

      if (data?.success) {
        // Refresh host runs
        await fetchHostRuns();
        return data;
      } else {
        throw new Error(data?.error || 'Failed to start state machine');
      }
    } catch (err) {
      console.error('Error starting state machine:', err);
      throw err;
    }
  }, [fetchHostRuns]);

  const transitionState = useCallback(async (hostRunId: string, targetState: string, context: Record<string, any> = {}) => {
    try {
      const { data, error: transitionError } = await supabase.functions.invoke('state-machine-orchestrator', {
        body: {
          action: 'transition',
          hostRunId,
          targetState,
          context
        }
      });

      if (transitionError) {
        throw transitionError;
      }

      if (data?.success) {
        // Refresh host runs
        await fetchHostRuns();
        return data;
      } else {
        throw new Error(data?.error || 'Failed to transition state');
      }
    } catch (err) {
      console.error('Error transitioning state:', err);
      throw err;
    }
  }, [fetchHostRuns]);

  const getStateMachineStatus = useCallback(async (hostRunId: string) => {
    try {
      const { data, error: statusError } = await supabase.functions.invoke('state-machine-orchestrator', {
        body: {
          action: 'status',
          hostRunId
        }
      });

      if (statusError) {
        throw statusError;
      }

      if (data?.success) {
        return {
          hostRun: data.hostRun,
          jobs: data.jobs,
          availableTransitions: data.availableTransitions
        };
      } else {
        throw new Error(data?.error || 'Failed to get state machine status');
      }
    } catch (err) {
      console.error('Error getting state machine status:', err);
      throw err;
    }
  }, []);

  const cancelStateMachine = useCallback(async (hostRunId: string) => {
    try {
      const { data, error: cancelError } = await supabase.functions.invoke('state-machine-orchestrator', {
        body: {
          action: 'cancel',
          hostRunId
        }
      });

      if (cancelError) {
        throw cancelError;
      }

      if (data?.success) {
        // Refresh host runs
        await fetchHostRuns();
        return data;
      } else {
        throw new Error(data?.error || 'Failed to cancel state machine');
      }
    } catch (err) {
      console.error('Error cancelling state machine:', err);
      throw err;
    }
  }, [fetchHostRuns]);

  // Real-time host run updates
  useEffect(() => {
    const channel = supabase
      .channel('host-runs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'host_runs'
        },
        (payload) => {
          console.log('Host run updated:', payload);
          fetchHostRuns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHostRuns]);

  // Initial load
  useEffect(() => {
    fetchHostRuns();
  }, [fetchHostRuns]);

  // Statistics
  const runningHostRuns = hostRuns.filter(run => run.status === 'running');
  const completedHostRuns = hostRuns.filter(run => run.status === 'completed');
  const failedHostRuns = hostRuns.filter(run => run.status === 'failed');

  const stateDistribution = hostRuns.reduce((acc, run) => {
    acc[run.state] = (acc[run.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    hostRuns,
    loading,
    error,
    runningHostRuns,
    completedHostRuns,
    failedHostRuns,
    stateDistribution,
    fetchHostRuns,
    startStateMachine,
    transitionState,
    getStateMachineStatus,
    cancelStateMachine
  };
};

export default useStateMachine;