import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UpdateJob {
  id: string;
  server_id: string;
  firmware_package_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  logs?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  server?: {
    hostname: string;
    ip_address: unknown; // PostgreSQL INET type comes as unknown from Supabase
  };
  firmware_package?: {
    name: string;
    version: string;
    firmware_type: string;
  };
}

export function useUpdateJobs() {
  const [jobs, setJobs] = useState<UpdateJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('update_jobs')
        .select(`
          *,
          server:servers(hostname, ip_address),
          firmware_package:firmware_packages(name, version, firmware_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching update jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch update jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRemoteCommand = async (serverId: string, command: string, scheduledAt?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-remote-command', {
        body: { 
          serverId,
          command,
          scheduledAt 
        }
      });

      if (error) throw error;
      
      await fetchJobs();
      toast({
        title: "Success",
        description: "Remote command initiated successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error executing remote command:', error);
      toast({
        title: "Error",
        description: "Failed to execute remote command",
        variant: "destructive",
      });
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('update_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (error) throw error;
      
      await fetchJobs();
      toast({
        title: "Success",
        description: "Update job cancelled",
      });
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive",
      });
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('update_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          progress: 0 
        })
        .eq('id', jobId);

      if (error) throw error;
      
      // Trigger the retry via edge function
      await supabase.functions.invoke('execute-remote-command', {
        body: { jobId }
      });
      
      await fetchJobs();
      toast({
        title: "Success",
        description: "Update job retried",
      });
    } catch (error) {
      console.error('Error retrying job:', error);
      toast({
        title: "Error",
        description: "Failed to retry job",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchJobs();

    // Set up real-time subscription for job updates
    const subscription = supabase
      .channel('jobs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'update_jobs' },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    jobs,
    loading,
    fetchJobs,
    createRemoteCommand,
    cancelJob,
    retryJob,
  };
}