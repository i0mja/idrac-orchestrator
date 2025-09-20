import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UnifiedEvent {
  id: string;
  event_type: string;
  event_source: string; // 'system', 'eol', 'operational', 'analytics', 'audit'
  severity: string; // Allow any string, we'll validate in the components
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
  created_by: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  status?: string;
  error_details?: string | null;
  server_id?: string | null;
  connection_id?: string | null;
  execution_time_ms?: number | null;
}

export const useSystemEvents = () => {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch from all event sources in parallel
      const [systemEventsRes, eolAlertsRes, operationalEventsRes, analyticsEventsRes] = await Promise.all([
        supabase
          .from('system_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('eol_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('operational_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('analytics_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(25)
      ]);

      // Transform and combine all events
      const allEvents: UnifiedEvent[] = [];

      // Add system events
      if (systemEventsRes.data) {
        allEvents.push(...systemEventsRes.data.map(event => ({
          ...event,
          event_source: 'system'
        })));
      }

      // Add EOL alerts
      if (eolAlertsRes.data) {
        allEvents.push(...eolAlertsRes.data.map(alert => ({
          id: alert.id,
          event_type: alert.alert_type || 'eol_alert',
          event_source: 'eol',
          severity: alert.severity || 'warning',
          title: `EOL Alert: ${alert.message}`,
          description: alert.recommendation,
          metadata: { server_id: alert.server_id, alert_type: alert.alert_type },
          created_at: alert.created_at,
          created_by: alert.acknowledged_by,
          acknowledged: alert.acknowledged || false,
          acknowledged_at: alert.acknowledged_at,
          acknowledged_by: alert.acknowledged_by,
          server_id: alert.server_id
        } as UnifiedEvent)));
      }

      // Add operational events
      if (operationalEventsRes.data) {
        allEvents.push(...operationalEventsRes.data.map(event => ({
          ...event,
          event_source: 'operational',
          acknowledged: false, // operational events don't have acknowledgment by default
          acknowledged_at: null,
          acknowledged_by: null
        } as UnifiedEvent)));
      }

      // Add analytics events
      if (analyticsEventsRes.data) {
        allEvents.push(...analyticsEventsRes.data.map(event => ({
          id: event.id,
          event_type: event.event_type,
          event_source: 'analytics',
          severity: 'info',
          title: `Analytics: ${event.event_type}`,
          description: JSON.stringify(event.properties),
          metadata: event.properties,
          created_at: event.timestamp,
          created_by: event.user_id,
          acknowledged: false,
          acknowledged_at: null,
          acknowledged_by: null,
          server_id: event.server_id
        } as UnifiedEvent)));
      }

      // Sort by created_at descending and limit to 200 total events
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(allEvents.slice(0, 200));

    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
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

  // Set up realtime subscriptions for all event sources
    const channel = supabase
      .channel('unified-events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eol_alerts' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_events' }, fetchEvents)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter events by severity
  const criticalEvents = events.filter(e => (e.severity === 'error' || e.severity === 'critical') && !e.acknowledged);
  const warningEvents = events.filter(e => (e.severity === 'warning' || e.severity === 'high') && !e.acknowledged);
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