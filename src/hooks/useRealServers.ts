import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealServers() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*');

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

  useEffect(() => {
    fetchServers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('server-stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'servers' }, 
        () => {
          fetchServers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    servers,
    loading,
    refresh: fetchServers
  };
}