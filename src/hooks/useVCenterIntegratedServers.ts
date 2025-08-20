import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVCenterService } from '@/hooks/useVCenterService';
import { useToast } from '@/hooks/use-toast';

interface IntegratedServer {
  id: string;
  hostname: string;
  ip_address: string;
  model?: string;
  service_tag?: string;
  status: string;
  environment?: string;
  site_id?: string;
  datacenter?: string;
  vcenter_id?: string;
  vcenter_name?: string;
  cluster_name?: string;
  host_type: 'standalone' | 'vcenter_managed';
  operating_system?: string;
  os_version?: string;
  os_eol_date?: string;
  ism_installed?: boolean;
  security_risk_level?: string;
  created_at: string;
  updated_at: string;
}

export const useVCenterIntegratedServers = () => {
  const [servers, setServers] = useState<IntegratedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const { vcenters } = useVCenterService();
  const { toast } = useToast();

  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load servers with vCenter information
      const { data: serversData, error: serversError } = await supabase
        .from('servers')
        .select(`
          *
        `)
        .order('hostname');

      if (serversError) throw serversError;

      // Load vCenter information separately to avoid join issues
      const { data: vcentersData } = await supabase
        .from('vcenters')
        .select('id, name');

      // Transform data to include vCenter information
      const integratedServers = serversData.map(server => {
        const vcenter = vcentersData?.find(vc => vc.id === server.vcenter_id);
        return {
          ...server,
          vcenter_name: vcenter?.name || null,
          host_type: server.vcenter_id ? 'vcenter_managed' : 'standalone'
        };
      }) as IntegratedServer[];

      setServers(integratedServers);
    } catch (error: any) {
      console.error('Failed to load integrated servers:', error);
      toast({
        title: "Error",
        description: "Failed to load server inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getServersByVCenter = useCallback((vcenterId?: string) => {
    if (!vcenterId) return servers.filter(s => !s.vcenter_id);
    return servers.filter(s => s.vcenter_id === vcenterId);
  }, [servers]);

  const getVCenterManagedServers = useCallback(() => {
    return servers.filter(s => s.vcenter_id);
  }, [servers]);

  const getStandaloneServers = useCallback(() => {
    return servers.filter(s => !s.vcenter_id);
  }, [servers]);

  const getServerStats = useCallback(() => {
    const total = servers.length;
    const vcenterManaged = servers.filter(s => s.vcenter_id).length;
    const standalone = total - vcenterManaged;
    const online = servers.filter(s => s.status === 'online').length;
    const offline = servers.filter(s => s.status === 'offline').length;

    const byVCenter = vcenters.map(vc => ({
      vcenter_id: vc.id,
      vcenter_name: vc.name,
      server_count: servers.filter(s => s.vcenter_id === vc.id).length
    }));

    return {
      total,
      vcenterManaged,
      standalone,
      online,
      offline,
      byVCenter
    };
  }, [servers, vcenters]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('integrated-servers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'servers'
        },
        () => {
          loadServers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vcenters'
        },
        () => {
          loadServers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadServers]);

  // Load initial data
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  return {
    servers,
    loading,
    loadServers,
    getServersByVCenter,
    getVCenterManagedServers,
    getStandaloneServers,
    getServerStats,
    refresh: loadServers
  };
};