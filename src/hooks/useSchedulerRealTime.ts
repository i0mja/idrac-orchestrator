import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSchedulerRealTime() {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to update jobs changes
    const updateJobsSubscription = supabase
      .channel('update_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'update_jobs'
        },
        (payload) => {
          console.log('Update job changed:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const job = payload.new;
            
            // Notify on job completion/failure
            if (job.status === 'completed') {
              toast({
                title: "Job Completed",
                description: `Update job completed successfully`,
              });
            } else if (job.status === 'failed') {
              toast({
                title: "Job Failed",
                description: `Update job failed: ${job.error_message || 'Unknown error'}`,
                variant: "destructive"
              });
            } else if (job.status === 'running' && payload.old?.status !== 'running') {
              toast({
                title: "Job Started",
                description: `Update job is now running`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to background jobs changes
    const backgroundJobsSubscription = supabase
      .channel('background_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_jobs'
        },
        (payload) => {
          console.log('Background job changed:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const job = payload.new;
            
            if (job.status === 'completed') {
              toast({
                title: `${job.job_type} Completed`,
                description: `Background job completed successfully`,
              });
            } else if (job.status === 'failed') {
              toast({
                title: `${job.job_type} Failed`,
                description: `Background job failed: ${job.error_message || 'Unknown error'}`,
                variant: "destructive"
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to maintenance windows changes
    const maintenanceSubscription = supabase
      .channel('maintenance_windows_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_windows'
        },
        (payload) => {
          console.log('Maintenance window changed:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const window = payload.new;
            
            if (window.status === 'active' && payload.old?.status !== 'active') {
              toast({
                title: "Maintenance Window Started",
                description: `${window.name} is now active`,
              });
            } else if (window.status === 'completed') {
              toast({
                title: "Maintenance Window Completed",
                description: `${window.name} has completed successfully`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to system events for high-priority notifications
    const systemEventsSubscription = supabase
      .channel('system_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events'
        },
        (payload) => {
          const event = payload.new;
          
          // Only show high-priority events as notifications
          if (event.severity === 'error' || event.severity === 'warning') {
            toast({
              title: event.title,
              description: event.description,
              variant: event.severity === 'error' ? "destructive" : "default"
            });
          }
        }
      )
      .subscribe();

    // Check connection status
    const checkConnection = () => {
      const channels = [
        updateJobsSubscription,
        backgroundJobsSubscription,
        maintenanceSubscription,
        systemEventsSubscription
      ];
      
      const connected = channels.every(channel => 
        ['SUBSCRIBED', 'JOINED'].includes(channel.state as string)
      );
      
      setIsConnected(connected);
    };

    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 5000);
    
    // Initial check
    setTimeout(checkConnection, 1000);

    return () => {
      clearInterval(connectionInterval);
      updateJobsSubscription.unsubscribe();
      backgroundJobsSubscription.unsubscribe();
      maintenanceSubscription.unsubscribe();
      systemEventsSubscription.unsubscribe();
    };
  }, [toast]);

  return { isConnected };
}