import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'alert' | 'event';
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  created_at: string;
  acknowledged: boolean;
  server_id?: string;
  metadata?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Fetch system events
      const { data: events, error: eventsError } = await supabase
        .from('system_events')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      // Fetch EOL alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('eol_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) throw alertsError;

      // Transform and combine notifications
      const eventNotifications: Notification[] = (events || []).map(event => ({
        id: event.id,
        type: 'event' as const,
        title: event.title,
        message: event.description || event.title,
        severity: event.severity as any,
        created_at: event.created_at,
        acknowledged: event.acknowledged,
        metadata: event.metadata
      }));

      const alertNotifications: Notification[] = (alerts || []).map(alert => ({
        id: alert.id,
        type: 'alert' as const,
        title: `${alert.alert_type.toUpperCase()} Alert`,
        message: alert.message,
        severity: alert.severity as any,
        created_at: alert.created_at,
        acknowledged: alert.acknowledged,
        server_id: alert.server_id,
        metadata: { recommendation: alert.recommendation }
      }));

      const allNotifications = [...eventNotifications, ...alertNotifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.acknowledged).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeNotification = async (notification: Notification) => {
    try {
      const tableName = notification.type === 'event' ? 'system_events' : 'eol_alerts';
      
      const { error } = await supabase
        .from(tableName)
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, acknowledged: true }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast({
        title: "Notification acknowledged",
        description: "The notification has been marked as read"
      });
    } catch (error) {
      console.error('Failed to acknowledge notification:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge notification",
        variant: "destructive"
      });
    }
  };

  const acknowledgeAll = async () => {
    try {
      const unacknowledgedNotifications = notifications.filter(n => !n.acknowledged);
      
      // Update events
      const eventIds = unacknowledgedNotifications
        .filter(n => n.type === 'event')
        .map(n => n.id);
      
      if (eventIds.length > 0) {
        const { error: eventsError } = await supabase
          .from('system_events')
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString()
          })
          .in('id', eventIds);

        if (eventsError) throw eventsError;
      }

      // Update alerts
      const alertIds = unacknowledgedNotifications
        .filter(n => n.type === 'alert')
        .map(n => n.id);
      
      if (alertIds.length > 0) {
        const { error: alertsError } = await supabase
          .from('eol_alerts')
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString()
          })
          .in('id', alertIds);

        if (alertsError) throw alertsError;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, acknowledged: true }))
      );
      setUnreadCount(0);

      toast({
        title: "All notifications acknowledged",
        description: "All notifications have been marked as read"
      });
    } catch (error) {
      console.error('Failed to acknowledge all notifications:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge notifications",
        variant: "destructive"
      });
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchNotifications();

    const eventsChannel = supabase
      .channel('system_events_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_events' },
        () => fetchNotifications()
      )
      .subscribe();

    const alertsChannel = supabase
      .channel('eol_alerts_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'eol_alerts' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    acknowledgeNotification,
    acknowledgeAll,
    refreshNotifications: fetchNotifications
  };
}