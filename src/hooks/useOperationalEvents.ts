import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OperationalEvent {
  id: string;
  event_type: string;
  event_source: string;
  title: string;
  description?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  status: 'active' | 'resolved' | 'investigating' | 'monitoring';
  server_id?: string;
  connection_id?: string;
  created_by?: string;
  created_at: string;
  execution_time_ms?: number;
  metadata?: {
    protocol?: string;
    generation?: string;
    firmware_version?: string;
    ip_address?: string;
    error_classification?: string;
    retry_count?: number;
    credentials_used?: string;
    discovery_stats?: {
      total_ips: number;
      responsive: number;
      protocols_detected: number;
    };
    health_check?: {
      score: number;
      issues: number;
      recommendations: number;
    };
    [key: string]: any;
  };
  error_details?: string;
}

export interface EventFilters {
  event_type?: string;
  event_source?: string;
  severity?: string;
  status?: string;
  server_id?: string;
  date_range?: {
    from: Date;
    to: Date;
  };
}

export interface EventStats {
  total: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  recent_24h: number;
  active_issues: number;
}

export function useOperationalEvents() {
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EventStats | null>(null);
  const { toast } = useToast();

  /**
   * Fetch operational events from the database
   */
  const fetchEvents = useCallback(async (filters?: EventFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('operational_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply filters
      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters?.event_source) {
        query = query.eq('event_source', filters.event_source);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.server_id) {
        query = query.eq('server_id', filters.server_id);
      }
      if (filters?.date_range) {
        query = query
          .gte('created_at', filters.date_range.from.toISOString())
          .lte('created_at', filters.date_range.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const typedData = (data || []).map(event => ({
        ...event,
        severity: event.severity as OperationalEvent['severity'],
        status: event.status as OperationalEvent['status'],
        metadata: event.metadata as any
      }));
      setEvents(typedData);
      calculateStats(typedData);
    } catch (error) {
      console.error('Failed to fetch operational events:', error);
      toast({
        title: "Error",
        description: "Failed to load operational events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Calculate event statistics
   */
  const calculateStats = useCallback((eventList: OperationalEvent[]) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats: EventStats = {
      total: eventList.length,
      by_severity: {},
      by_type: {},
      by_source: {},
      recent_24h: 0,
      active_issues: 0
    };

    eventList.forEach(event => {
      // Count by severity
      stats.by_severity[event.severity] = (stats.by_severity[event.severity] || 0) + 1;
      
      // Count by type
      stats.by_type[event.event_type] = (stats.by_type[event.event_type] || 0) + 1;
      
      // Count by source
      stats.by_source[event.event_source] = (stats.by_source[event.event_source] || 0) + 1;
      
      // Count recent events
      if (new Date(event.created_at) > yesterday) {
        stats.recent_24h++;
      }
      
      // Count active issues
      if (event.status === 'active' && (event.severity === 'error' || event.severity === 'warning')) {
        stats.active_issues++;
      }
    });

    setStats(stats);
  }, []);

  /**
   * Log a new operational event
   */
  const logEvent = useCallback(async (event: Omit<OperationalEvent, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('operational_events')
        .insert([event])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      const typedData = {
        ...data,
        severity: data.severity as OperationalEvent['severity'],
        status: data.status as OperationalEvent['status'],
        metadata: data.metadata as any
      };
      setEvents(prev => [typedData, ...prev]);
      calculateStats([typedData, ...events]);

      return data;
    } catch (error) {
      console.error('Failed to log operational event:', error);
      throw error;
    }
  }, [events, calculateStats]);

  /**
   * Log discovery event
   */
  const logDiscoveryEvent = useCallback(async (params: {
    event_type: 'discovery_started' | 'discovery_completed' | 'discovery_failed' | 'protocol_detected' | 'server_discovered';
    title: string;
    description?: string;
    severity?: OperationalEvent['severity'];
    server_id?: string;
    metadata?: OperationalEvent['metadata'];
    execution_time_ms?: number;
    error_details?: string;
  }) => {
    return logEvent({
      event_source: 'discovery_engine',
      status: params.event_type.includes('failed') ? 'active' : 'resolved',
      severity: params.severity || (params.event_type.includes('failed') ? 'error' : 'info'),
      ...params
    });
  }, [logEvent]);

  /**
   * Log protocol event
   */
  const logProtocolEvent = useCallback(async (params: {
    event_type: 'protocol_detection' | 'protocol_fallback' | 'protocol_error' | 'credential_validation' | 'connection_timeout';
    title: string;
    description?: string;
    severity?: OperationalEvent['severity'];
    server_id?: string;
    metadata?: OperationalEvent['metadata'];
    execution_time_ms?: number;
    error_details?: string;
  }) => {
    return logEvent({
      event_source: 'protocol_manager',
      status: params.event_type.includes('error') ? 'active' : 'monitoring',
      severity: params.severity || (params.event_type.includes('error') ? 'error' : 'info'),
      ...params
    });
  }, [logEvent]);

  /**
   * Log hardware health event
   */
  const logHealthEvent = useCallback(async (params: {
    event_type: 'health_check_started' | 'health_check_completed' | 'health_gate_passed' | 'health_gate_failed' | 'hardware_issue_detected';
    title: string;
    description?: string;
    severity?: OperationalEvent['severity'];
    server_id?: string;
    metadata?: OperationalEvent['metadata'];
    execution_time_ms?: number;
    error_details?: string;
  }) => {
    return logEvent({
      event_source: 'health_monitor',
      status: params.event_type.includes('failed') || params.event_type.includes('issue') ? 'active' : 'resolved',
      severity: params.severity || (params.event_type.includes('failed') || params.event_type.includes('issue') ? 'warning' : 'info'),
      ...params
    });
  }, [logEvent]);

  /**
   * Log firmware update event
   */
  const logFirmwareEvent = useCallback(async (params: {
    event_type: 'update_started' | 'update_completed' | 'update_failed' | 'job_queue_cleared' | 'readiness_check';
    title: string;
    description?: string;
    severity?: OperationalEvent['severity'];
    server_id?: string;
    metadata?: OperationalEvent['metadata'];
    execution_time_ms?: number;
    error_details?: string;
  }) => {
    return logEvent({
      event_source: 'firmware_manager',
      status: params.event_type.includes('failed') ? 'active' : 'resolved',
      severity: params.severity || (params.event_type.includes('failed') ? 'error' : 'success'),
      ...params
    });
  }, [logEvent]);

  /**
   * Log credential management event
   */
  const logCredentialEvent = useCallback(async (params: {
    event_type: 'credential_validation' | 'credential_failure' | 'account_lockout_detected' | 'credential_rotation' | 'certificate_issue';
    title: string;
    description?: string;
    severity?: OperationalEvent['severity'];
    server_id?: string;
    connection_id?: string;
    metadata?: OperationalEvent['metadata'];
    execution_time_ms?: number;
    error_details?: string;
  }) => {
    return logEvent({
      event_source: 'credential_manager',
      status: params.event_type.includes('failure') || params.event_type.includes('lockout') || params.event_type.includes('issue') ? 'active' : 'resolved',
      severity: params.severity || (params.event_type.includes('failure') || params.event_type.includes('lockout') ? 'error' : 'info'),
      ...params
    });
  }, [logEvent]);

  /**
   * Update event status
   */
  const updateEventStatus = useCallback(async (eventId: string, status: OperationalEvent['status']) => {
    try {
      const { error } = await supabase
        .from('operational_events')
        .update({ status })
        .eq('id', eventId);

      if (error) {
        throw error;
      }

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, status } : event
      ));

      toast({
        title: "Success",
        description: "Event status updated",
      });
    } catch (error) {
      console.error('Failed to update event status:', error);
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Get events by server
   */
  const getEventsByServer = useCallback((serverId: string) => {
    return events.filter(event => event.server_id === serverId);
  }, [events]);

  /**
   * Get recent critical events
   */
  const getCriticalEvents = useCallback(() => {
    return events.filter(event => 
      event.severity === 'error' && 
      event.status === 'active'
    ).slice(0, 10);
  }, [events]);

  // Load events on mount
  useEffect(() => {
    fetchEvents();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('operational_events')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'operational_events' },
        (payload) => {
          const newEvent = payload.new as OperationalEvent;
          setEvents(prev => [newEvent, ...prev]);
          calculateStats([newEvent, ...events]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchEvents, calculateStats, events]);

  return {
    // State
    events,
    loading,
    stats,
    
    // Actions
    fetchEvents,
    logEvent,
    updateEventStatus,
    
    // Specialized loggers
    logDiscoveryEvent,
    logProtocolEvent,
    logHealthEvent,
    logFirmwareEvent,
    logCredentialEvent,
    
    // Utilities
    getEventsByServer,
    getCriticalEvents
  };
}