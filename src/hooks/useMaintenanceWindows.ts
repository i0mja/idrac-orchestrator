import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceWindow {
  id: string;
  name: string;
  description?: string;
  datacenter_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  max_concurrent_updates: number;
  recurrence: string;
  next_occurrence?: string;
  notification_hours_before: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Include datacenter info
  datacenters?: {
    name: string;
    location: string;
    maintenance_window_start: string;
    maintenance_window_end: string;
  };
}

export function useMaintenanceWindows() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [datacenters, setDatacenters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMaintenanceWindows = async () => {
    try {
      setIsLoading(true);
      
      // Fetch scheduled maintenance windows with datacenter info
      const { data: windowsData, error: windowsError } = await supabase
        .from('maintenance_windows')
        .select(`
          *,
          datacenters (
            name,
            location,
            maintenance_window_start,
            maintenance_window_end
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (windowsError) throw windowsError;

      // Fetch all datacenters for defaults display
      const { data: datacentersData, error: datacentersError } = await supabase
        .from('datacenters')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (datacentersError) throw datacentersError;

      setWindows(windowsData || []);
      setDatacenters(datacentersData || []);
    } catch (error) {
      console.error('Error fetching maintenance windows:', error);
      toast({
        title: "Error",
        description: "Failed to load maintenance windows",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMaintenanceWindow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_windows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Window Deleted",
        description: "Maintenance window has been removed"
      });

      await fetchMaintenanceWindows();
    } catch (error) {
      console.error('Error deleting maintenance window:', error);
      toast({
        title: "Error",
        description: "Failed to delete maintenance window",
        variant: "destructive"
      });
    }
  };

  const updateWindowStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_windows')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      await fetchMaintenanceWindows();
    } catch (error) {
      console.error('Error updating window status:', error);
      toast({
        title: "Error",
        description: "Failed to update maintenance window status",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMaintenanceWindows();
  }, []);

  return {
    windows,
    datacenters,
    isLoading,
    refetch: fetchMaintenanceWindows,
    deleteWindow: deleteMaintenanceWindow,
    updateStatus: updateWindowStatus
  };
}