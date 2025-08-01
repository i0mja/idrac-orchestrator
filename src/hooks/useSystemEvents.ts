import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
  created_by: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

export const useSystemEvents = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching system events:', error);
        toast({
          title: "Error",
          description: "Failed to fetch system events",
          variant: "destructive",
        });
        return;
      }

      setEvents((data || []) as SystemEvent[]);
    } catch (error) {
      console.error('Error fetching system events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('system_events')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', eventId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to acknowledge event",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, acknowledged: true, acknowledged_at: new Date().toISOString() }
          : event
      ));

      toast({
        title: "Success",
        description: "Event acknowledged",
      });
    } catch (error) {
      console.error('Error acknowledging event:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge event",
        variant: "destructive",
      });
    }
  };

  const acknowledgeAllEvents = async () => {
    try {
      const unacknowledgedEvents = events.filter(event => !event.acknowledged);
      
      if (unacknowledgedEvents.length === 0) {
        toast({
          title: "Info",
          description: "No events to acknowledge",
        });
        return;
      }

      const { error } = await supabase
        .from('system_events')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .in('id', unacknowledgedEvents.map(e => e.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to acknowledge all events",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setEvents(events.map(event => ({
        ...event,
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })));

      toast({
        title: "Success",
        description: `Acknowledged ${unacknowledgedEvents.length} events`,
      });
    } catch (error) {
      console.error('Error acknowledging all events:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge all events",
        variant: "destructive",
      });
    }
  };

  const createSystemEvent = async (event: {
    event_type: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    title: string;
    description?: string;
    metadata?: any;
  }) => {
    try {
      const { error } = await supabase
        .from('system_events')
        .insert({
          ...event,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error creating system event:', error);
        return;
      }

      // Refresh events
      fetchEvents();
    } catch (error) {
      console.error('Error creating system event:', error);
    }
  };

  const triggerAutoOrchestration = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('auto-orchestration');

      if (error) {
        toast({
          title: "Error",
          description: "Failed to trigger auto-orchestration",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Auto-orchestration triggered successfully",
      });

      // Refresh events to see the results
      setTimeout(fetchEvents, 2000);
    } catch (error) {
      console.error('Error triggering auto-orchestration:', error);
      toast({
        title: "Error",
        description: "Failed to trigger auto-orchestration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Set up realtime subscription
    const channel = supabase
      .channel('system-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter events by severity
  const criticalEvents = events.filter(e => e.severity === 'error' && !e.acknowledged);
  const warningEvents = events.filter(e => e.severity === 'warning' && !e.acknowledged);
  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;

  return {
    events,
    loading,
    criticalEvents,
    warningEvents,
    unacknowledgedCount,
    fetchEvents,
    acknowledgeEvent,
    acknowledgeAllEvents,
    createSystemEvent,
    triggerAutoOrchestration
  };
};