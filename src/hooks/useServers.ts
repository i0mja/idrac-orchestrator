import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Server {
  id: string;
  hostname: string;
  ip_address: unknown; // PostgreSQL INET type comes as unknown from Supabase
  model?: string;
  service_tag?: string;
  idrac_version?: string;
  bios_version?: string;
  status: 'online' | 'offline' | 'updating' | 'error' | 'unknown';
  vcenter_id?: string;
  rack_location?: string;
  datacenter?: string;
  environment: string;
  last_discovered?: string;
  last_updated?: string;
  created_at: string;
  updated_at: string;
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname');

      if (error) throw error;
      setServers(data || []);
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
      
      toast({
        title: "Discovery Started",
        description: `Server discovery initiated for ${ipRange}`,
      });
      
      // Refresh the servers list after a delay
      setTimeout(() => fetchServers(), 3000);
      
      return data;
    } catch (error) {
      console.error('Error discovering servers:', error);
      toast({
        title: "Discovery Error",
        description: "Failed to start server discovery",
        variant: "destructive",
      });
    }
  };

  const updateServer = async (id: string, updates: Partial<Server>) => {
    try {
      const { error } = await supabase
        .from('servers')
        .update(updates)
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

  useEffect(() => {
    fetchServers();

    // Set up real-time subscription for server updates
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
  };
}