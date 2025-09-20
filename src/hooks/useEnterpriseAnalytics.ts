import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsEvent {
  id: string;
  event_type: string;
  user_id?: string;
  session_id?: string;
  properties: any;
  timestamp: string;
  server_id?: string;
  campaign_id?: string;
}

interface SystemInsight {
  id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  recommendations: any;
  confidence_score: number;
  affected_resources: any;
  created_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  expires_at?: string;
}

interface AnalyticsMetrics {
  userEngagement: {
    activeUsers: number;
    sessionDuration: number;
    pageViews: number;
    bounceRate: number;
  };
  systemPerformance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  businessMetrics: {
    totalServers: number;
    successfulUpdates: number;
    costSavings: number;
    riskReduction: number;
  };
}

export function useEnterpriseAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [insights, setInsights] = useState<SystemInsight[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData || []);
    } catch (error: any) {
      setError(error.message);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const { data: insightsData, error: insightsError } = await supabase
        .from('system_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);
    } catch (error: any) {
      setError(error.message);
    }
  }, []);

  const calculateMetrics = useCallback(async () => {
    try {
      // Fetch additional data for metrics calculation
      const { data: servers } = await supabase.from('servers').select('*');
      const { data: jobs } = await supabase.from('update_jobs').select('*');
      const { data: events } = await supabase.from('system_events').select('*');

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Calculate user engagement metrics
      const recentEvents = analytics.filter(e => new Date(e.timestamp) > last24Hours);
      const uniqueUsers = new Set(recentEvents.map(e => e.user_id).filter(Boolean)).size;
      const totalSessions = new Set(recentEvents.map(e => e.session_id).filter(Boolean)).size;
      
      // Calculate system performance metrics
      const totalServers = servers?.length || 0;
      const onlineServers = servers?.filter(s => s.status === 'online').length || 0;
      const successfulJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const totalJobs = jobs?.length || 0;
      const criticalAlerts = events?.filter(e => e.severity === 'critical').length || 0;

      const calculatedMetrics: AnalyticsMetrics = {
        userEngagement: {
          activeUsers: uniqueUsers,
          sessionDuration: totalSessions > 0 ? Math.round((recentEvents.length / totalSessions) * 10) / 10 : 0,
          pageViews: recentEvents.filter(e => e.event_type === 'page_view').length,
          bounceRate: 0.15 // Simulated - would need proper session tracking
        },
        systemPerformance: {
          responseTime: Math.random() * 200 + 50, // Simulated
          throughput: recentEvents.length,
          errorRate: criticalAlerts / Math.max(recentEvents.length, 1),
          uptime: totalServers > 0 ? (onlineServers / totalServers) * 100 : 100
        },
        businessMetrics: {
          totalServers,
          successfulUpdates: successfulJobs,
          costSavings: successfulJobs * 127.5, // Estimated cost per update
          riskReduction: Math.min(90, (successfulJobs / Math.max(totalJobs, 1)) * 100)
        }
      };

      setMetrics(calculatedMetrics);
    } catch (error: any) {
      console.error('Error calculating metrics:', error);
    }
  }, [analytics]);

  const trackEvent = useCallback(async (
    eventType: string,
    properties: Record<string, any> = {},
    serverId?: string,
    campaignId?: string
  ) => {
    try {
      const { error } = await supabase.rpc('track_analytics_event', {
        p_event_type: eventType,
        p_properties: properties,
        p_server_id: serverId,
        p_campaign_id: campaignId
      });

      if (error) throw error;
      
      // Refresh analytics after tracking
      await fetchAnalytics();
    } catch (error: any) {
      console.error('Error tracking event:', error);
    }
  }, [fetchAnalytics]);

  const acknowledgeInsight = useCallback(async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('system_insights')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.from('profiles').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single())?.data?.id
        })
        .eq('id', insightId);

      if (error) throw error;

      toast({
        title: "Insight Acknowledged",
        description: "The system insight has been marked as acknowledged.",
      });

      await fetchInsights();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [fetchInsights, toast]);

  const generateReport = useCallback(async (type: 'daily' | 'weekly' | 'monthly') => {
    const days = type === 'daily' ? 1 : type === 'weekly' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const filteredEvents = analytics.filter(e => new Date(e.timestamp) >= startDate);
    const filteredInsights = insights.filter(i => new Date(i.created_at) >= startDate);

    return {
      period: type,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      summary: {
        totalEvents: filteredEvents.length,
        totalInsights: filteredInsights.length,
        criticalInsights: filteredInsights.filter(i => i.severity === 'critical').length,
        userActions: filteredEvents.filter(e => e.event_type.includes('user_')).length
      },
      events: filteredEvents,
      insights: filteredInsights,
      metrics: metrics
    };
  }, [analytics, insights, metrics]);

  const predictiveInsights = useMemo(() => {
    if (!metrics || !analytics.length) return [];

    const predictions = [];

    // Predict system issues based on trends
    if (metrics.systemPerformance.errorRate > 0.05) {
      predictions.push({
        type: 'system_health',
        severity: 'warning' as const,
        title: 'Increasing Error Rate Detected',
        description: 'System error rate is trending upward. Consider investigating root causes.',
        likelihood: 0.75,
        timeframe: '24-48 hours'
      });
    }

    // Predict resource needs
    if (metrics.businessMetrics.totalServers > 0 && metrics.systemPerformance.uptime < 95) {
      predictions.push({
        type: 'resource_planning',
        severity: 'info' as const,
        title: 'Server Capacity Planning Needed',
        description: 'Based on current usage patterns, consider expanding server capacity.',
        likelihood: 0.68,
        timeframe: '1-2 weeks'
      });
    }

    // Predict maintenance windows
    const recentUpdates = analytics.filter(e => 
      e.event_type === 'firmware_update' && 
      new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentUpdates.length > 5) {
      predictions.push({
        type: 'maintenance',
        severity: 'info' as const,
        title: 'Optimal Maintenance Window Identified',
        description: 'Analysis suggests scheduling maintenance during low-activity periods.',
        likelihood: 0.82,
        timeframe: 'Next week'
      });
    }

    return predictions;
  }, [metrics, analytics]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAnalytics(), fetchInsights()]);
      setLoading(false);
    };

    loadData();
  }, [fetchAnalytics, fetchInsights]);

  useEffect(() => {
    if (analytics.length > 0) {
      calculateMetrics();
    }
  }, [analytics, calculateMetrics]);

  // Set up real-time subscriptions
  useEffect(() => {
    const analyticsSubscription = supabase
      .channel('analytics-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'analytics_events'
      }, () => {
        fetchAnalytics();
      })
      .subscribe();

    const insightsSubscription = supabase
      .channel('system-insights')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_insights'
      }, () => {
        fetchInsights();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(analyticsSubscription);
      supabase.removeChannel(insightsSubscription);
    };
  }, [fetchAnalytics, fetchInsights]);

  return {
    analytics,
    insights,
    metrics,
    predictiveInsights,
    loading,
    error,
    trackEvent,
    acknowledgeInsight,
    generateReport,
    refresh: useCallback(async () => {
      await Promise.all([fetchAnalytics(), fetchInsights()]);
    }, [fetchAnalytics, fetchInsights])
  };
}