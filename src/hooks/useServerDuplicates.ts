import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DuplicateServer {
  id: string;
  hostname: string;
  ip_address: string;
  created_at: string;
  duplicates: {
    id: string;
    hostname: string;
    ip_address: string;
    created_at: string;
  }[];
}

export function useServerDuplicates() {
  const [duplicates, setDuplicates] = useState<DuplicateServer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const detectDuplicates = async () => {
    setLoading(true);
    try {
      const { data: servers, error } = await supabase
        .from('servers')
        .select('id, hostname, ip_address, created_at')
        .order('created_at');

      if (error) throw error;

      // Group servers by IP address and hostname to find duplicates
      const ipGroups = new Map<string, any[]>();
      const hostnameGroups = new Map<string, any[]>();

      servers?.forEach(server => {
        const ip = String(server.ip_address);
        const hostname = server.hostname.toLowerCase();

        // Group by IP
        if (!ipGroups.has(ip)) {
          ipGroups.set(ip, []);
        }
        ipGroups.get(ip)!.push(server);

        // Group by hostname
        if (!hostnameGroups.has(hostname)) {
          hostnameGroups.set(hostname, []);
        }
        hostnameGroups.get(hostname)!.push(server);
      });

      const duplicateServers: DuplicateServer[] = [];

      // Find IP duplicates
      ipGroups.forEach((servers) => {
        if (servers.length > 1) {
          const primary = servers[0];
          const duplicateIds = duplicateServers.map(d => d.id);
          
          if (!duplicateIds.includes(primary.id)) {
            duplicateServers.push({
              ...primary,
              duplicates: servers.slice(1)
            });
          }
        }
      });

      // Find hostname duplicates (that aren't already IP duplicates)
      hostnameGroups.forEach((servers) => {
        if (servers.length > 1) {
          const primary = servers[0];
          const duplicateIds = duplicateServers.map(d => d.id);
          
          if (!duplicateIds.includes(primary.id)) {
            duplicateServers.push({
              ...primary,
              duplicates: servers.slice(1)
            });
          }
        }
      });

      setDuplicates(duplicateServers);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to detect duplicate servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mergeDuplicates = async (primaryId: string, duplicateIds: string[]) => {
    try {
      // Delete duplicate entries
      const { error } = await supabase
        .from('servers')
        .delete()
        .in('id', duplicateIds);

      if (error) throw error;

      // Update the primary server with latest information
      await supabase
        .from('servers')
        .update({ 
          last_updated: new Date().toISOString()
        })
        .eq('id', primaryId);

      await detectDuplicates();
      
      toast({
        title: "Duplicates Merged",
        description: `Successfully merged ${duplicateIds.length} duplicate server(s)`,
      });
    } catch (error) {
      console.error('Error merging duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to merge duplicate servers",
        variant: "destructive",
      });
    }
  };

  const keepPrimary = async (primaryId: string, duplicateIds: string[]) => {
    await mergeDuplicates(primaryId, duplicateIds);
  };

  useEffect(() => {
    detectDuplicates();
  }, []);

  return {
    duplicates,
    loading,
    detectDuplicates,
    mergeDuplicates,
    keepPrimary,
  };
}