import { apiSend } from '@/lib/api';

export interface SimpleUpdateInput {
  host: string; username: string; password: string;
  imageUri: string;
  transferProtocol?: 'HTTP'|'HTTPS'|'FTP';
  applyTime?: 'Immediate'|'OnReset';
  maintenanceWindowStart?: string;
  maintenanceWindowDurationSeconds?: number;
  preferredProtocol?: 'REDFISH' | 'WSMAN' | 'RACADM';
  enableFallback?: boolean;
}

/**
 * Legacy Redfish update hook - use useEnhancedFirmwareUpdate for new protocol orchestration features
 * @deprecated Use useEnhancedFirmwareUpdate instead
 */
export function useRedfishUpdate() {
  const start = async (input: SimpleUpdateInput, hostIds: string[]) => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // For each host, call the new Redfish update edge function
    const results = [];
    for (const hostId of hostIds) {
      try {
        const { data, error } = await supabase.functions.invoke('redfish-update', {
          body: {
            serverId: hostId,
            firmwarePackageId: null, // Would be set if using a specific package
            imageUri: input.imageUri,
            transferProtocol: input.transferProtocol || 'HTTPS',
            applyTime: input.applyTime || 'OnReset',
            maintenanceWindowStart: input.maintenanceWindowStart,
            maintenanceWindowDurationSeconds: input.maintenanceWindowDurationSeconds
          }
        });

        if (error) throw error;
        results.push({ hostId, success: true, data });
      } catch (error) {
        results.push({ hostId, success: false, error: error.message });
      }
    }
    
    return { success: true, results };
  };
  
  const status = async (taskUri: string) => {
    // This would query the update_jobs table for task status
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('update_jobs')
      .select('*')
      .eq('logs', `%${taskUri}%`)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      taskState: data.status === 'completed' ? 'Completed' : 
                 data.status === 'failed' ? 'Exception' : 'Running',
      percentComplete: data.progress || 0
    };
  };
  
  return { start, status };
}
