import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HostStats {
  total: number;
  vcenterManaged: number;
  standalone: number;
  online: number;
  offline: number;
  byVCenter: Array<{
    vcenter_name: string;
    host_count: number;
  }>;
}

interface HostDetail {
  id: string;
  hostname: string;
  ip_address: string;
  model: string;
  service_tag: string;
  status: string;
  host_type: 'vcenter_managed' | 'standalone';
  vcenter_name?: string;
  cluster_name?: string;
  last_discovered: string;
}

export function useHostInventory() {
  const [stats, setStats] = useState<HostStats>({
    total: 0,
    vcenterManaged: 0,
    standalone: 0,
    online: 0,
    offline: 0,
    byVCenter: []
  });
  const [hosts, setHosts] = useState<HostDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHostStats = async () => {
    try {
      // Get overall stats
      const { data: allHosts, error: hostsError } = await supabase
        .from('servers')
        .select('*');

      if (hostsError) throw hostsError;

      const total = allHosts?.length || 0;
      // For now, we'll calculate based on vcenter_id until types are updated
      const vcenterManaged = allHosts?.filter(h => h.vcenter_id !== null).length || 0;
      const standalone = allHosts?.filter(h => h.vcenter_id === null).length || 0;
      const online = allHosts?.filter(h => h.status === 'online').length || 0;
      const offline = allHosts?.filter(h => h.status === 'offline').length || 0;

      // For now, create mock vCenter grouping
      const byVCenter = vcenterManaged > 0 ? [
        { vcenter_name: 'Production vCenter', host_count: vcenterManaged }
      ] : [];

      setStats({
        total,
        vcenterManaged,
        standalone,
        online,
        offline,
        byVCenter
      });

      // Transform hosts for detailed view  
      const transformedHosts = allHosts?.map(host => ({
        id: host.id,
        hostname: host.hostname,
        ip_address: String(host.ip_address), // Convert unknown to string
        model: host.model || 'Unknown',
        service_tag: host.service_tag || 'N/A',
        status: host.status || 'unknown',
        host_type: (host.vcenter_id ? 'vcenter_managed' : 'standalone') as 'vcenter_managed' | 'standalone',
        vcenter_name: host.vcenter_id ? 'Production vCenter' : undefined,
        cluster_name: undefined, // Will be populated when types are updated
        last_discovered: host.last_discovered || host.created_at
      })) || [];

      setHosts(transformedHosts);

    } catch (error) {
      console.error('Error fetching host stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch host inventory statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHostsByCategory = (category: 'total' | 'vcenter' | 'standalone') => {
    switch (category) {
      case 'total':
        return hosts;
      case 'vcenter':
        return hosts.filter(h => h.vcenter_name !== undefined);
      case 'standalone':
        return hosts.filter(h => h.vcenter_name === undefined);
      default:
        return hosts;
    }
  };

  const syncVCenterHosts = async (vcenterId: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-vcenter-hosts', {
        body: { vcenterId, password }
      });

      if (error) throw error;

      toast({
        title: "vCenter Sync Complete",
        description: data.message,
      });

      // Refresh stats after sync
      await fetchHostStats();
      
      return data.results;
    } catch (error) {
      console.error('vCenter sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync hosts from vCenter",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchHostStats();

    // Set up real-time subscription for server changes
    const subscription = supabase
      .channel('host_inventory_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'servers' },
        () => {
          fetchHostStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    stats,
    hosts,
    loading,
    getHostsByCategory,
    syncVCenterHosts,
    refreshStats: fetchHostStats
  };
}