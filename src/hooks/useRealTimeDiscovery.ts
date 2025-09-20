import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealTimeEvent {
  type: 'discovery_progress' | 'protocol_test' | 'server_found' | 'error';
  data: any;
  timestamp: string;
}

interface DiscoveryProgress {
  phase: string;
  progress: number;
  currentHost?: string;
  serversFound: number;
  protocolsTests: number;
}

export function useRealTimeDiscovery() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [progress, setProgress] = useState<DiscoveryProgress>({
    phase: '',
    progress: 0,
    serversFound: 0,
    protocolsTests: 0
  });
  const { toast } = useToast();

  const addEvent = useCallback((event: RealTimeEvent) => {
    setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
    
    if (event.type === 'discovery_progress') {
      setProgress(event.data);
    } else if (event.type === 'server_found') {
      setProgress(prev => ({
        ...prev,
        serversFound: prev.serversFound + 1
      }));
    } else if (event.type === 'protocol_test') {
      setProgress(prev => ({
        ...prev,
        protocolsTests: prev.protocolsTests + 1
      }));
    } else if (event.type === 'error') {
      toast({
        title: "Discovery Error",
        description: event.data.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const connect = useCallback(() => {
    const channel = supabase
      .channel('discovery-updates')
      .on('broadcast', { event: 'discovery_event' }, (payload) => {
        const event: RealTimeEvent = {
          type: payload.type as RealTimeEvent['type'],
          data: payload.data,
          timestamp: new Date().toISOString()
        };
        addEvent(event);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          toast({
            title: "Real-time Updates",
            description: "Connected to live discovery updates",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [addEvent, toast]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setEvents([]);
    setProgress({
      phase: '',
      progress: 0,
      serversFound: 0,
      protocolsTests: 0
    });
  }, []);

  const broadcastEvent = useCallback(async (eventType: string, data: any) => {
    if (isConnected) {
      await supabase
        .channel('discovery-updates')
        .send({
          type: 'broadcast',
          event: 'discovery_event',
          payload: { type: eventType, data }
        });
    }
  }, [isConnected]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return {
    isConnected,
    events,
    progress,
    connect,
    disconnect,
    broadcastEvent,
    clearEvents: () => setEvents([])
  };
}