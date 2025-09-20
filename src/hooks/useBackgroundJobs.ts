import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundJob {
  id: string;
  type: 'firmware_update' | 'maintenance_mode' | 'health_check' | 'vcenter_sync';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  serverId: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  logs?: string;
  metadata?: Record<string, any>;
}

export interface JobFilters {
  status?: string[];
  type?: string;
  serverId?: string;
}

export const useBackgroundJobs = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (filters?: JobFilters) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: jobError } = await supabase.functions.invoke('job-queue-manager', {
        body: { 
          action: 'list',
          filters 
        }
      });

      if (jobError) {
        throw jobError;
      }

      if (data?.success) {
        setJobs(data.jobs || []);
      } else {
        throw new Error(data?.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Error fetching background jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = useCallback(async (jobData: {
    type: BackgroundJob['type'];
    hostRunId: string;
    serverId: string;
    priority?: number;
    delay?: number;
    metadata?: Record<string, any>;
  }) => {
    try {
      const { data, error: createError } = await supabase.functions.invoke('job-queue-manager', {
        body: { 
          action: 'create',
          jobData 
        }
      });

      if (createError) {
        throw createError;
      }

      if (data?.success) {
        // Refresh jobs list
        await fetchJobs();
        return data.job;
      } else {
        throw new Error(data?.error || 'Failed to create job');
      }
    } catch (err) {
      console.error('Error creating job:', err);
      throw err;
    }
  }, [fetchJobs]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const { data, error: cancelError } = await supabase.functions.invoke('job-queue-manager', {
        body: { 
          action: 'cancel',
          jobId 
        }
      });

      if (cancelError) {
        throw cancelError;
      }

      if (data?.success) {
        // Refresh jobs list
        await fetchJobs();
        return true;
      } else {
        throw new Error(data?.error || 'Failed to cancel job');
      }
    } catch (err) {
      console.error('Error cancelling job:', err);
      throw err;
    }
  }, [fetchJobs]);

  const retryJob = useCallback(async (jobId: string) => {
    try {
      const { data, error: retryError } = await supabase.functions.invoke('job-queue-manager', {
        body: { 
          action: 'retry',
          jobId 
        }
      });

      if (retryError) {
        throw retryError;
      }

      if (data?.success) {
        // Refresh jobs list
        await fetchJobs();
        return true;
      } else {
        throw new Error(data?.error || 'Failed to retry job');
      }
    } catch (err) {
      console.error('Error retrying job:', err);
      throw err;
    }
  }, [fetchJobs]);

  const getJobStatus = useCallback(async (jobId: string) => {
    try {
      const { data, error: statusError } = await supabase.functions.invoke('job-queue-manager', {
        body: { 
          action: 'status',
          jobId 
        }
      });

      if (statusError) {
        throw statusError;
      }

      if (data?.success) {
        return data.job;
      } else {
        throw new Error(data?.error || 'Failed to get job status');
      }
    } catch (err) {
      console.error('Error getting job status:', err);
      throw err;
    }
  }, []);

  // Real-time job updates
  useEffect(() => {
    const channel = supabase
      .channel('background-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_jobs'
        },
        (payload) => {
          console.log('Background job updated:', payload);
          // Refresh jobs when any job changes
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Job statistics
  const jobStats = jobs.reduce((stats, job) => {
    stats.total++;
    stats[job.status] = (stats[job.status] || 0) + 1;
    return stats;
  }, { 
    total: 0, 
    queued: 0, 
    running: 0, 
    completed: 0, 
    failed: 0, 
    cancelled: 0 
  } as Record<string, number>);

  // Running jobs
  const runningJobs = jobs.filter(job => job.status === 'running');
  const queuedJobs = jobs.filter(job => job.status === 'queued');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  return {
    jobs,
    loading,
    error,
    jobStats,
    runningJobs,
    queuedJobs,
    failedJobs,
    fetchJobs,
    createJob,
    cancelJob,
    retryJob,
    getJobStatus
  };
};

export default useBackgroundJobs;