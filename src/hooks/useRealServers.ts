import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealServers() {
  const [serverCount, setServerCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('status');

      if (error) throw error;
      
      setServerCount(data?.length || 0);
      setOnlineCount(data?.filter(s => s.status === 'online').length || 0);
    } catch (error) {
      console.error('Error fetching server stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch server statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStats();

    // Set up real-time subscription
    const subscription = supabase
      .channel('server-stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'servers' }, 
        () => {
          fetchServerStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    serverCount,
    onlineCount,
    loading,
    refresh: fetchServerStats
  };
}