import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HistoryEntry {
  id: string;
  type: 'job' | 'maintenance' | 'system_event';
  title: string;
  description: string;
  status: 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  affected_servers: number;
  metadata?: any;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export function useSchedulerHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: '7d'
  });
  
  const { toast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const dateThreshold = new Date();
      
      // Calculate date range
      switch (filters.dateRange) {
        case '1d':
          dateThreshold.setDate(dateThreshold.getDate() - 1);
          break;
        case '7d':
          dateThreshold.setDate(dateThreshold.getDate() - 7);
          break;
        case '30d':
          dateThreshold.setDate(dateThreshold.getDate() - 30);
          break;
        case '90d':
          dateThreshold.setDate(dateThreshold.getDate() - 90);
          break;
        default:
          dateThreshold.setDate(dateThreshold.getDate() - 7);
      }

      // Fetch completed/failed update jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('update_jobs')
        .select(`
          *,
          server:servers(hostname, datacenter)
        `)
        .in('status', ['completed', 'failed', 'cancelled'])
        .gte('created_at', dateThreshold.toISOString())
        .order('completed_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch completed maintenance windows
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_windows')
        .select('*')
        .in('status', ['completed', 'failed', 'cancelled'])
        .gte('created_at', dateThreshold.toISOString())
        .order('updated_at', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      // Fetch relevant system events
      const { data: eventsData, error: eventsError } = await supabase
        .from('system_events')
        .select('*')
        .in('event_type', [
          'job_completed', 
          'job_failed', 
          'maintenance_completed', 
          'maintenance_failed',
          'scheduler_error',
          'emergency_patch'
        ])
        .gte('created_at', dateThreshold.toISOString())
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Transform and combine data
      const historyEntries: HistoryEntry[] = [
        // Update Jobs
        ...(jobsData || []).map(job => ({
          id: `job-${job.id}`,
          type: 'job' as const,
          title: `Update Job #${job.id.slice(-8)}`,
          description: `${job.server?.hostname || 'Unknown Server'} - Update Job`,
          status: job.status as HistoryEntry['status'],
          started_at: job.started_at || job.created_at,
          completed_at: job.completed_at,
          duration_minutes: job.started_at && job.completed_at 
            ? Math.floor((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000)
            : undefined,
          affected_servers: 1,
          metadata: {
            server_hostname: job.server?.hostname,
            datacenter: job.server?.datacenter,
            progress: job.progress,
            error_message: job.error_message
          },
          severity: job.status === 'completed' ? 'success' as const : 
                   job.status === 'failed' ? 'error' as const : 'info' as const
        })),

        // Maintenance Windows
        ...(maintenanceData || []).map(window => ({
          id: `maintenance-${window.id}`,
          type: 'maintenance' as const,
          title: window.name,
          description: window.description || 'Maintenance window',
          status: window.status as HistoryEntry['status'],
          started_at: `${window.scheduled_date}T${window.start_time}`,
          completed_at: window.status === 'completed' ? window.updated_at : undefined,
          duration_minutes: window.start_time && window.end_time ? 
            Math.floor((new Date(`1970-01-01T${window.end_time}`).getTime() - 
                       new Date(`1970-01-01T${window.start_time}`).getTime()) / 60000) : undefined,
          affected_servers: 0,
          metadata: {
            datacenter_id: window.datacenter_id,
            max_concurrent_updates: window.max_concurrent_updates
          },
          severity: window.status === 'completed' ? 'success' as const : 
                   window.status === 'failed' ? 'error' as const : 'info' as const
        })),

        // System Events
        ...(eventsData || []).map(event => ({
          id: `event-${event.id}`,
          type: 'system_event' as const,
          title: event.title,
          description: event.description,
          status: event.severity === 'error' ? 'failed' as const : 'completed' as const,
          started_at: event.created_at,
          completed_at: event.created_at,
          duration_minutes: undefined,
          affected_servers: 0,
          metadata: event.metadata,
          severity: event.severity as HistoryEntry['severity']
        }))
      ];

      // Sort by completion time
      historyEntries.sort((a, b) => 
        new Date(b.completed_at || b.started_at).getTime() - 
        new Date(a.completed_at || a.started_at).getTime()
      );

      // Apply filters
      let filteredHistory = historyEntries;

      if (filters.type !== 'all') {
        filteredHistory = filteredHistory.filter(entry => entry.type === filters.type);
      }

      if (filters.status !== 'all') {
        filteredHistory = filteredHistory.filter(entry => entry.status === filters.status);
      }

      setHistory(filteredHistory);

    } catch (error) {
      console.error('Error fetching scheduler history:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduler history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const getStatistics = () => {
    const totalOperations = history.length;
    const completedOperations = history.filter(h => h.status === 'completed').length;
    const failedOperations = history.filter(h => h.status === 'failed').length;
    const cancelledOperations = history.filter(h => h.status === 'cancelled').length;
    
    const successRate = totalOperations > 0 ? Math.round((completedOperations / totalOperations) * 100) : 0;
    const totalServersAffected = history.reduce((sum, h) => sum + h.affected_servers, 0);
    
    const avgDuration = history
      .filter(h => h.duration_minutes)
      .reduce((sum, h, _, arr) => sum + (h.duration_minutes || 0) / arr.length, 0);

    return {
      totalOperations,
      completedOperations,
      failedOperations,
      cancelledOperations,
      successRate,
      totalServersAffected,
      avgDurationMinutes: Math.round(avgDuration)
    };
  };

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  return {
    history,
    loading,
    filters,
    updateFilters,
    refetch: fetchHistory,
    statistics: getStatistics()
  };
}