import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBackgroundJobs, BackgroundJob } from '@/hooks/useBackgroundJobs';
import { useUpdateJobs, UpdateJob } from '@/hooks/useUpdateJobs';
import { useStateMachine, HostRun } from '@/hooks/useStateMachine';
import { useToast } from '@/hooks/use-toast';

export interface JobStatistics {
  total: number;
  running: number;
  queued: number;
  completed: number;
  failed: number;
  cancelled: number;
  backgroundJobs: number;
  updateJobs: number;
  hostRuns: number;
}

export interface UnifiedJob {
  id: string;
  type: 'background' | 'update' | 'state_machine';
  category: string;
  status: string;
  progress: number;
  serverId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  metadata?: any;
  originalData: BackgroundJob | UpdateJob | HostRun;
}

export interface JobFilters {
  type?: string[];
  status?: string[];
  category?: string;
  serverId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const useJobsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({});
  
  const { toast } = useToast();
  
  // Get data from individual hooks
  const {
    jobs: backgroundJobs,
    loading: backgroundLoading,
    jobStats: backgroundStats,
    cancelJob: cancelBackgroundJob,
    retryJob: retryBackgroundJob,
    createJob
  } = useBackgroundJobs();

  const {
    jobs: updateJobs,
    loading: updateLoading,
    cancelJob: cancelUpdateJob,
    retryJob: retryUpdateJob
  } = useUpdateJobs();

  const {
    hostRuns,
    loading: hostRunsLoading,
    cancelStateMachine,
    startStateMachine,
    transitionState
  } = useStateMachine();

  // Combine loading states
  useEffect(() => {
    setLoading(backgroundLoading || updateLoading || hostRunsLoading);
  }, [backgroundLoading, updateLoading, hostRunsLoading]);

  // Transform all jobs into unified format
  const unifiedJobs = useCallback((): UnifiedJob[] => {
    const jobs: UnifiedJob[] = [];

    // Background jobs
    backgroundJobs.forEach(job => {
      jobs.push({
        id: job.id,
        type: 'background',
        category: job.type,
        status: job.status,
        progress: job.progress,
        serverId: job.serverId,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
        metadata: job.metadata,
        originalData: job
      });
    });

    // Update jobs
    updateJobs.forEach(job => {
      jobs.push({
        id: job.id,
        type: 'update',
        category: job.firmware_package?.firmware_type || 'firmware_update',
        status: job.status,
        progress: job.progress,
        serverId: job.server_id,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message,
        metadata: {
          firmwarePackage: job.firmware_package,
          server: job.server,
          scheduledAt: job.scheduled_at
        },
        originalData: job
      });
    });

    // Host runs (state machines)
    hostRuns.forEach(run => {
      jobs.push({
        id: run.id,
        type: 'state_machine',
        category: 'host_update',
        status: run.status,
        progress: run.state === 'DONE' ? 100 : 
                  run.state === 'ERROR' ? 0 :
                  run.state === 'PRECHECKS' ? 10 :
                  run.state === 'ENTER_MAINT' ? 30 :
                  run.state === 'APPLY' ? 60 :
                  run.state === 'POSTCHECKS' ? 80 :
                  run.state === 'EXIT_MAINT' ? 90 : 50,
        serverId: run.context?.serverId,
        createdAt: run.startedAt,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        errorMessage: run.errorMessage,
        metadata: {
          state: run.state,
          context: run.context
        },
        originalData: run
      });
    });

    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [backgroundJobs, updateJobs, hostRuns]);

  // Apply filters
  const filteredJobs = useCallback((): UnifiedJob[] => {
    let jobs = unifiedJobs();

    if (filters.type && filters.type.length > 0) {
      jobs = jobs.filter(job => filters.type!.includes(job.type));
    }

    if (filters.status && filters.status.length > 0) {
      jobs = jobs.filter(job => filters.status!.includes(job.status));
    }

    if (filters.category) {
      jobs = jobs.filter(job => job.category === filters.category);
    }

    if (filters.serverId) {
      jobs = jobs.filter(job => job.serverId === filters.serverId);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      jobs = jobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        return jobDate >= start && jobDate <= end;
      });
    }

    return jobs;
  }, [unifiedJobs, filters]);

  // Calculate statistics
  const statistics = useCallback((): JobStatistics => {
    const jobs = unifiedJobs();
    
    return {
      total: jobs.length,
      running: jobs.filter(j => j.status === 'running').length,
      queued: jobs.filter(j => j.status === 'queued' || j.status === 'pending').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      backgroundJobs: backgroundJobs.length,
      updateJobs: updateJobs.length,
      hostRuns: hostRuns.length
    };
  }, [unifiedJobs, backgroundJobs.length, updateJobs.length, hostRuns.length]);

  // Bulk operations
  const bulkCancel = useCallback(async (jobIds: string[]) => {
    const jobs = unifiedJobs();
    const results = { success: 0, failed: 0 };

    for (const jobId of jobIds) {
      const job = jobs.find(j => j.id === jobId);
      if (!job) continue;

      try {
        if (job.type === 'background') {
          await cancelBackgroundJob(jobId);
        } else if (job.type === 'update') {
          await cancelUpdateJob(jobId);
        } else if (job.type === 'state_machine') {
          await cancelStateMachine(jobId);
        }
        results.success++;
      } catch (error) {
        console.error(`Failed to cancel job ${jobId}:`, error);
        results.failed++;
      }
    }

    toast({
      title: "Bulk Cancel Complete",
      description: `Successfully cancelled ${results.success} jobs. ${results.failed} failed.`,
      variant: results.failed > 0 ? "destructive" : "default"
    });

    return results;
  }, [unifiedJobs, cancelBackgroundJob, cancelUpdateJob, cancelStateMachine, toast]);

  const bulkRetry = useCallback(async (jobIds: string[]) => {
    const jobs = unifiedJobs();
    const results = { success: 0, failed: 0 };

    for (const jobId of jobIds) {
      const job = jobs.find(j => j.id === jobId);
      if (!job || job.status !== 'failed') continue;

      try {
        if (job.type === 'background') {
          await retryBackgroundJob(jobId);
        } else if (job.type === 'update') {
          await retryUpdateJob(jobId);
        }
        // State machines don't support retry, they need to be restarted
        results.success++;
      } catch (error) {
        console.error(`Failed to retry job ${jobId}:`, error);
        results.failed++;
      }
    }

    toast({
      title: "Bulk Retry Complete",
      description: `Successfully retried ${results.success} jobs. ${results.failed} failed.`,
      variant: results.failed > 0 ? "destructive" : "default"
    });

    return results;
  }, [unifiedJobs, retryBackgroundJob, retryUpdateJob, toast]);

  // Performance metrics
  const performanceMetrics = useCallback(() => {
    const jobs = unifiedJobs();
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.startedAt && j.completedAt);
    
    if (completedJobs.length === 0) {
      return {
        averageExecutionTime: 0,
        successRate: 0,
        throughput: 0
      };
    }

    const executionTimes = completedJobs.map(job => {
      const startTime = new Date(job.startedAt!).getTime();
      const endTime = new Date(job.completedAt!).getTime();
      return endTime - startTime;
    });

    const averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const successRate = (completedJobs.length / jobs.filter(j => j.status !== 'queued' && j.status !== 'pending' && j.status !== 'running').length) * 100;
    
    // Calculate throughput (jobs per hour in last 24h)
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const recentJobs = jobs.filter(j => new Date(j.createdAt) >= last24h);
    const throughput = recentJobs.length / 24;

    return {
      averageExecutionTime: Math.round(averageExecutionTime / 1000 / 60), // Convert to minutes
      successRate: Math.round(successRate),
      throughput: Math.round(throughput * 100) / 100
    };
  }, [unifiedJobs]);

  // Get active servers
  const activeServers = useCallback(() => {
    const jobs = unifiedJobs();
    const serverIds = new Set(jobs.map(j => j.serverId).filter(Boolean));
    return Array.from(serverIds);
  }, [unifiedJobs]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('jobs-management-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'background_jobs' },
        () => {
          // Background jobs will update automatically via useBackgroundJobs
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'update_jobs' },
        () => {
          // Update jobs will update automatically via useUpdateJobs
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'host_runs' },
        () => {
          // Host runs will update automatically via useStateMachine
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    // Core data
    jobs: filteredJobs(),
    allJobs: unifiedJobs(),
    loading,
    error,
    
    // Statistics
    statistics: statistics(),
    performanceMetrics: performanceMetrics(),
    activeServers: activeServers(),
    
    // Filtering
    filters,
    setFilters,
    
    // Individual job actions
    cancelJob: async (jobId: string, jobType: 'background' | 'update' | 'state_machine') => {
      if (jobType === 'background') return cancelBackgroundJob(jobId);
      if (jobType === 'update') return cancelUpdateJob(jobId);
      if (jobType === 'state_machine') return cancelStateMachine(jobId);
    },
    
    retryJob: async (jobId: string, jobType: 'background' | 'update' | 'state_machine') => {
      if (jobType === 'background') return retryBackgroundJob(jobId);
      if (jobType === 'update') return retryUpdateJob(jobId);
      // State machines need special handling
    },
    
    // Bulk operations
    bulkCancel,
    bulkRetry,
    
    // Job creation
    createBackgroundJob: createJob,
    createUpdateJob: async (serverId: string, firmwarePackageId: string, scheduledAt?: string) => {
      // This would need to be implemented in the update jobs system
    },
    startStateMachine,
    transitionState
  };
};