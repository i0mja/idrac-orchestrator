import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FirmwareUpdateRequest {
  serverId: string;
  firmwarePackageId?: string;
  imageUri?: string;
  mode: 'SIMPLE_UPDATE' | 'INSTALL_FROM_REPOSITORY' | 'MULTIPART_UPDATE';
  applyTime?: 'Immediate' | 'OnReset' | 'AtMaintenanceWindowStart';
  maintenanceWindowStart?: string;
  maintenanceWindowDurationSeconds?: number;
  preferredProtocol?: 'REDFISH' | 'WSMAN' | 'RACADM';
  enableFallback?: boolean;
  enableTelemetry?: boolean;
}

export interface UpdateResult {
  jobId: string;
  protocol: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  taskLocation?: string;
  messages: string[];
  fallbackAttempts?: number;
  telemetryEnabled: boolean;
}

export interface UpdateProgress {
  jobId: string;
  status: string;
  progress: number;
  currentProtocol?: string;
  fallbackHistory?: Array<{
    protocol: string;
    attempt: number;
    error: string;
    timestamp: number;
  }>;
  telemetry?: {
    protocolLatency: number;
    transferSpeed?: number;
    estimatedCompletion?: string;
  };
}

/**
 * Enhanced firmware update hook with protocol orchestration support
 */
export function useEnhancedFirmwareUpdate() {
  const [updating, setUpdating] = useState(false);
  const [monitoringJobs, setMonitoringJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  /**
   * Start a firmware update with protocol fallback support
   */
  const startUpdate = async (request: FirmwareUpdateRequest): Promise<UpdateResult> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('redfish-update', {
        body: {
          ...request,
          enableFallback: request.enableFallback ?? true,
          enableTelemetry: request.enableTelemetry ?? true
        }
      });

      if (error) throw error;

      const result: UpdateResult = {
        jobId: data.jobId,
        protocol: data.protocol,
        status: data.status,
        taskLocation: data.taskLocation,
        messages: data.messages || [],
        fallbackAttempts: data.fallbackAttempts || 0,
        telemetryEnabled: data.telemetryEnabled || false
      };

      toast({
        title: "Update Started",
        description: `Firmware update initiated via ${result.protocol} protocol`,
      });

      return result;
    } catch (error) {
      console.error('Update start error:', error);
      toast({
        title: "Update Failed to Start",
        description: error.message || "Failed to initiate firmware update",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Start multiple firmware updates with orchestration
   */
  const startBulkUpdate = async (requests: FirmwareUpdateRequest[]): Promise<UpdateResult[]> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('orchestrator-start-rolling-update', {
        body: {
          updates: requests,
          orchestrationSettings: {
            maxConcurrentUpdates: 3,
            enableAutomaticFallback: true,
            enableTelemetryCollection: true
          }
        }
      });

      if (error) throw error;

      const results: UpdateResult[] = data.results || [];
      
      toast({
        title: "Bulk Update Started",
        description: `Initiated ${results.length} firmware updates with orchestration`,
      });

      return results;
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Bulk Update Failed",
        description: error.message || "Failed to start bulk firmware update",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Get update progress with telemetry
   */
  const getUpdateProgress = async (jobId: string): Promise<UpdateProgress | null> => {
    try {
      const { data, error } = await supabase
        .from('update_jobs')
        .select(`
          *,
          servers!inner(hostname, ip_address, model),
          firmware_packages(name, version)
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;

      // Parse telemetry and fallback data from logs/metadata
      let fallbackHistory: any[] = [];
      let telemetry: any = {};
      
      try {
        const metadata = typeof data.logs === 'string' ? JSON.parse(data.logs || '{}') : data.logs || {};
        fallbackHistory = metadata.fallbackHistory || [];
        telemetry = metadata.telemetry || {};
      } catch {
        // Ignore parsing errors
      }

      return {
        jobId: data.id,
        status: data.status,
        progress: data.progress || 0,
        currentProtocol: telemetry.currentProtocol,
        fallbackHistory,
        telemetry: telemetry.metrics
      };
    } catch (error) {
      console.error('Progress fetch error:', error);
      return null;
    }
  };

  /**
   * Monitor update progress with real-time updates
   */
  const monitorUpdate = (jobId: string, onProgress: (progress: UpdateProgress) => void) => {
    if (monitoringJobs.has(jobId)) return;

    setMonitoringJobs(prev => new Set(prev).add(jobId));

    const subscription = supabase
      .channel(`update-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'update_jobs',
          filter: `id=eq.${jobId}`
        },
        async (payload) => {
          const progress = await getUpdateProgress(jobId);
          if (progress) {
            onProgress(progress);
            
            // Stop monitoring when completed
            if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
              stopMonitoring(jobId);
            }
          }
        }
      )
      .subscribe();

    // Initial progress fetch
    getUpdateProgress(jobId).then(progress => {
      if (progress) onProgress(progress);
    });

    return () => stopMonitoring(jobId);
  };

  /**
   * Stop monitoring an update job
   */
  const stopMonitoring = (jobId: string) => {
    const channel = supabase.channel(`update-job-${jobId}`);
    supabase.removeChannel(channel);
    setMonitoringJobs(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  /**
   * Cancel an update job
   */
  const cancelUpdate = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('update_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Update Cancelled",
        description: "Firmware update has been cancelled",
      });
    } catch (error) {
      console.error('Cancel update error:', error);
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel update",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    updating,
    monitoringJobs: Array.from(monitoringJobs),
    startUpdate,
    startBulkUpdate,
    getUpdateProgress,
    monitorUpdate,
    stopMonitoring,
    cancelUpdate
  };
}