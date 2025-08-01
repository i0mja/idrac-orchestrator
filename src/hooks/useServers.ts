import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Server {
  id: string;
  hostname: string;
  ip_address: string | unknown; // PostgreSQL INET type
  model?: string | null;
  service_tag?: string | null;
  status: 'online' | 'offline' | 'unknown' | 'updating' | 'error' | 'maintenance';
  host_type: string;
  vcenter_id?: string | null;
  cluster_name?: string | null;
  datacenter?: string | null;
  environment?: string | null;
  bios_version?: string | null;
  idrac_version?: string | null;
  rack_location?: string | null;
  last_discovered?: string | null;
  last_updated?: string | null;
  created_at: string;
  updated_at: string;
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname');

      if (error) throw error;
      setServers((data || []).map((server: any) => ({
        ...server,
        host_type: server.host_type || 'standalone'
      })));
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const discoverServers = async (ipRange: string, credentials: { username: string; password: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('discover-servers', {
        body: { ipRange, credentials }
      });

      if (error) throw error;
      
      await fetchServers();
      toast({
        title: "Discovery Complete",
        description: `Found ${data?.discovered || 0} servers`,
      });
    } catch (error) {
      console.error('Error discovering servers:', error);
      toast({
        title: "Discovery Failed",
        description: "Failed to discover servers. Check credentials and network.",
        variant: "destructive",
      });
    }
  };

  const updateServer = async (id: string, updates: Partial<Server>) => {
    try {
      const { error } = await supabase
        .from('servers')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      
      await fetchServers();
      toast({
        title: "Success",
        description: "Server updated successfully",
      });
    } catch (error) {
      console.error('Error updating server:', error);
      toast({
        title: "Error",
        description: "Failed to update server",
        variant: "destructive",
      });
    }
  };

  const deleteServer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchServers();
      toast({
        title: "Success",
        description: "Server deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      });
    }
  };

  const testConnection = async (serverId: string) => {
    try {
      const server = servers.find(s => s.id === serverId);
      if (!server) throw new Error('Server not found');

      const { data, error } = await supabase.functions.invoke('redfish-discovery', {
        body: { 
          ip: String(server.ip_address),
          action: 'test' 
        }
      });

      if (error) throw error;

      toast({
        title: "Connection Test",
        description: data?.connected ? "Successfully connected to server" : "Failed to connect to server",
        variant: data?.connected ? "default" : "destructive",
      });

      return data?.connected || false;
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection Test Failed",
        description: "Unable to test server connection",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchServers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('servers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'servers' },
        () => {
          fetchServers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    servers,
    loading,
    fetchServers,
    discoverServers,
    updateServer,
    deleteServer,
    testConnection,
    refresh: fetchServers
  };
}