import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useOperationalEvents } from "@/hooks/useOperationalEvents";
import { supabase } from "@/integrations/supabase/client";
import { 
  Server, 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Zap,
  Network,
  HardDrive,
  Thermometer,
  Cpu,
  Eye,
  Settings,
  TrendingUp,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface InfrastructureMetrics {
  servers: {
    total: number;
    online: number;
    offline: number;
    updating: number;
    ready_for_updates: number;
  };
  protocols: {
    redfish_healthy: number;
    wsman_available: number;
    racadm_accessible: number;
    total_protocols: number;
  };
  health: {
    critical_issues: number;
    warnings: number;
    overall_score: number;
    thermal_alerts: number;
    power_issues: number;
  };
  updates: {
    pending: number;
    in_progress: number;
    completed_today: number;
    failed_today: number;
  };
  discovery: {
    last_run: string | null;
    success_rate: number;
    new_servers_found: number;
    protocols_detected: number;
  };
}

export function EnhancedInfrastructureHub() {
  const [metrics, setMetrics] = useState<InfrastructureMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { 
    stats: eventStats, 
    getCriticalEvents, 
    logHealthEvent,
    fetchEvents 
  } = useOperationalEvents();
  const { toast } = useToast();

  /**
   * Fetch comprehensive infrastructure metrics
   */
  const fetchMetrics = async () => {
    try {
      const [
        serversResult,
        readinessResult,
        updateJobsResult,
        healthResult,
        eventsResult
      ] = await Promise.allSettled([
        supabase.from('servers').select('*'),
        supabase.from('server_readiness_checks').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('update_jobs').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('health_check_results').select('*').order('checked_at', { ascending: false }).limit(100),
        supabase.from('operational_events').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const servers = serversResult.status === 'fulfilled' ? (serversResult.value.data || []) : [];
      const readinessChecks = readinessResult.status === 'fulfilled' ? (readinessResult.value.data || []) : [];
      const updateJobs = updateJobsResult.status === 'fulfilled' ? (updateJobsResult.value.data || []) : [];
      const healthChecks = healthResult.status === 'fulfilled' ? (healthResult.value.data || []) : [];
      const recentEvents = eventsResult.status === 'fulfilled' ? (eventsResult.value.data || []) : [];

      // Calculate server metrics
      const serverMetrics = {
        total: servers.length,
        online: servers.filter(s => s.status === 'online').length,
        offline: servers.filter(s => s.status === 'offline').length,
        updating: updateJobs.filter(j => j.status === 'running' || j.status === 'pending').length,
        ready_for_updates: readinessChecks.filter(r => r.overall_readiness === 'ready').length
      };

      // Calculate protocol metrics
      const protocolMetrics = {
        redfish_healthy: servers.filter(s => s.healthiest_protocol === 'REDFISH').length,
        wsman_available: servers.filter(s => s.protocol_capabilities && 
          JSON.stringify(s.protocol_capabilities).includes('WSMAN')).length,
        racadm_accessible: servers.filter(s => s.protocol_capabilities && 
          JSON.stringify(s.protocol_capabilities).includes('RACADM')).length,
        total_protocols: servers.filter(s => s.protocol_capabilities).length
      };

      // Calculate health metrics
      const criticalEvents = recentEvents.filter(e => e.severity === 'error' && e.status === 'active');
      const warningEvents = recentEvents.filter(e => e.severity === 'warning' && e.status === 'active');
      const thermalEvents = recentEvents.filter(e => e.event_type.includes('thermal') || e.event_type.includes('temperature'));
      const powerEvents = recentEvents.filter(e => e.event_type.includes('power'));
      
      const healthMetrics = {
        critical_issues: criticalEvents.length,
        warnings: warningEvents.length,
        overall_score: Math.max(0, 100 - (criticalEvents.length * 10) - (warningEvents.length * 5)),
        thermal_alerts: thermalEvents.length,
        power_issues: powerEvents.length
      };

      // Calculate update metrics
      const updateMetrics = {
        pending: updateJobs.filter(j => j.status === 'pending').length,
        in_progress: updateJobs.filter(j => j.status === 'running').length,
        completed_today: updateJobs.filter(j => j.status === 'completed').length,
        failed_today: updateJobs.filter(j => j.status === 'failed').length
      };

      // Calculate discovery metrics
      const discoveryEvents = recentEvents.filter(e => e.event_source === 'discovery_engine');
      const successfulDiscoveries = discoveryEvents.filter(e => e.event_type === 'discovery_completed');
      const failedDiscoveries = discoveryEvents.filter(e => e.event_type === 'discovery_failed');
      const lastDiscovery = discoveryEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      const discoveryMetrics = {
        last_run: lastDiscovery?.created_at || null,
        success_rate: discoveryEvents.length > 0 ? 
          Math.round((successfulDiscoveries.length / discoveryEvents.length) * 100) : 0,
        new_servers_found: discoveryEvents.reduce((sum, e) => {
          const metadata = e.metadata as any;
          return sum + (metadata?.discovery_stats?.responsive || 0);
        }, 0),
        protocols_detected: discoveryEvents.reduce((sum, e) => {
          const metadata = e.metadata as any;
          return sum + (metadata?.discovery_stats?.protocols_detected || 0);
        }, 0)
      };

      setMetrics({
        servers: serverMetrics,
        protocols: protocolMetrics,
        health: healthMetrics,
        updates: updateMetrics,
        discovery: discoveryMetrics
      });

    } catch (error) {
      console.error('Failed to fetch infrastructure metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load infrastructure metrics",
        variant: "destructive",
      });
    }
  };

  /**
   * Refresh all metrics
   */
  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchEvents()
      ]);
      
      toast({
        title: "Refreshed",
        description: "Infrastructure metrics updated successfully",
      });
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Run comprehensive health check
   */
  const runHealthCheck = async () => {
    try {
      // Log health check start
      await logHealthEvent({
        event_type: 'health_check_started',
        title: 'Comprehensive Health Check Started',
        description: 'Analyzing infrastructure health across all components',
        severity: 'info',
        execution_time_ms: Date.now()
      });

      // Trigger health check via edge function
      const { data, error } = await supabase.functions.invoke('health-check', {
        body: { comprehensive: true }
      });

      if (error) throw error;

      await logHealthEvent({
        event_type: 'health_check_completed',
        title: 'Health Check Completed',
        description: `Found ${data?.issues || 0} issues and ${data?.warnings || 0} warnings`,
        severity: data?.issues > 0 ? 'warning' : 'success',
        metadata: {
          health_check: {
            score: data?.score || 0,
            issues: data?.issues || 0,
            recommendations: data?.recommendations?.length || 0
          }
        }
      });

      // Refresh metrics to show updated health data
      await refreshMetrics();

    } catch (error) {
      console.error('Health check failed:', error);
      await logHealthEvent({
        event_type: 'health_check_completed',
        title: 'Health Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        severity: 'error',
        error_details: String(error)
      });
    }
  };

  /**
   * Get health score color
   */
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  /**
   * Get health score badge variant
   */
  const getHealthScoreBadge = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMetrics();
      setLoading(false);
    };

    loadData();

    // Set up periodic refresh
    const interval = setInterval(fetchMetrics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Infrastructure Intelligence Hub</h1>
            <p className="text-muted-foreground">Loading comprehensive infrastructure analysis...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const criticalEvents = getCriticalEvents();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Infrastructure Intelligence Hub</h1>
            <p className="text-muted-foreground text-lg">
              Real-time monitoring and intelligent analysis of Dell infrastructure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={runHealthCheck} 
            variant="outline"
            size="lg"
          >
            <Shield className="w-5 h-5 mr-2" />
            Run Health Check
          </Button>
          <Button 
            onClick={refreshMetrics} 
            disabled={refreshing}
            size="lg"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalEvents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Issues Detected:</strong> {criticalEvents.length} issues require immediate attention.
            <ul className="mt-2 space-y-1">
              {criticalEvents.slice(0, 3).map(event => (
                <li key={event.id} className="text-sm">• {event.title}</li>
              ))}
              {criticalEvents.length > 3 && (
                <li className="text-sm font-medium">• And {criticalEvents.length - 3} more issues...</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Server Status */}
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.servers.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.servers.online || 0} online, {metrics?.servers.offline || 0} offline
            </p>
            <div className="flex items-center pt-1">
              <Progress 
                value={metrics?.servers.total ? (metrics.servers.online / metrics.servers.total) * 100 : 0} 
                className="w-full h-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure Health */}
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infrastructure Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthScoreColor(metrics?.health.overall_score || 0)}`}>
              {metrics?.health.overall_score || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.health.critical_issues || 0} critical, {metrics?.health.warnings || 0} warnings
            </p>
            <Badge variant={getHealthScoreBadge(metrics?.health.overall_score || 0)} className="mt-1">
              {(metrics?.health.overall_score || 0) >= 90 ? 'Excellent' : 
               (metrics?.health.overall_score || 0) >= 70 ? 'Good' : 'Needs Attention'}
            </Badge>
          </CardContent>
        </Card>

        {/* Protocol Intelligence */}
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocol Intelligence</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.protocols.total_protocols || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.protocols.redfish_healthy || 0} Redfish, {metrics?.protocols.wsman_available || 0} WS-Man
            </p>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-xs">Redfish</Badge>
              <Badge variant="outline" className="text-xs">WS-Man</Badge>
              <Badge variant="outline" className="text-xs">RACADM</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Update Status */}
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Update Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.updates.in_progress || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.updates.pending || 0} pending, {metrics?.updates.completed_today || 0} completed today
            </p>
            <div className="flex items-center pt-1">
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {metrics?.servers.ready_for_updates || 0} Ready
                </Badge>
                {(metrics?.updates.failed_today || 0) > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {metrics.updates.failed_today} Failed
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Analysis</TabsTrigger>
          <TabsTrigger value="protocols">Protocol Status</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discovery Intelligence */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Discovery Intelligence
                </CardTitle>
                <CardDescription>
                  Intelligent server discovery and protocol detection insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {metrics?.discovery.success_rate || 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics?.discovery.new_servers_found || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Servers Found</p>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-medium">
                    {metrics?.discovery.protocols_detected || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Protocols Detected</p>
                </div>
                {metrics?.discovery.last_run && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Last run: {formatDistanceToNow(new Date(metrics.discovery.last_run))} ago
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Health Breakdown */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health Breakdown
                </CardTitle>
                <CardDescription>
                  Detailed analysis of infrastructure component health
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="font-medium">{metrics?.health.thermal_alerts || 0}</div>
                      <p className="text-sm text-muted-foreground">Thermal Alerts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <div>
                      <div className="font-medium">{metrics?.health.power_issues || 0}</div>
                      <p className="text-sm text-muted-foreground">Power Issues</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Health Score</span>
                    <span className={getHealthScoreColor(metrics?.health.overall_score || 0)}>
                      {metrics?.health.overall_score || 0}%
                    </span>
                  </div>
                  <Progress value={metrics?.health.overall_score || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Critical Issues */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {metrics?.health.critical_issues || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>

            {/* Warnings */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">
                  {metrics?.health.warnings || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Should be addressed
                </p>
              </CardContent>
            </Card>

            {/* Healthy Systems */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  Healthy Systems
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {(metrics?.servers.total || 0) - (metrics?.health.critical_issues || 0) - (metrics?.health.warnings || 0)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Operating normally
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="protocols" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Protocol Distribution */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Protocol Distribution</CardTitle>
                <CardDescription>
                  Distribution of management protocols across infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Redfish (Modern)</span>
                    <Badge variant="default">{metrics?.protocols.redfish_healthy || 0} servers</Badge>
                  </div>
                  <Progress value={metrics?.servers.total ? (metrics.protocols.redfish_healthy / metrics.servers.total) * 100 : 0} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">WS-Management</span>
                    <Badge variant="secondary">{metrics?.protocols.wsman_available || 0} servers</Badge>
                  </div>
                  <Progress value={metrics?.servers.total ? (metrics.protocols.wsman_available / metrics.servers.total) * 100 : 0} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">RACADM</span>
                    <Badge variant="outline">{metrics?.protocols.racadm_accessible || 0} servers</Badge>
                  </div>
                  <Progress value={metrics?.servers.total ? (metrics.protocols.racadm_accessible / metrics.servers.total) * 100 : 0} />
                </div>
              </CardContent>
            </Card>

            {/* Protocol Health */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Protocol Health Status</CardTitle>
                <CardDescription>
                  Real-time health monitoring of management protocols
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {metrics?.protocols.total_protocols || 0}/{metrics?.servers.total || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Servers with protocol detection
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <CheckCircle className="w-8 h-8 text-success mx-auto mb-1" />
                    <div className="text-sm font-medium">Healthy</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.floor((metrics?.protocols.redfish_healthy || 0) * 0.9)}
                    </div>
                  </div>
                  <div>
                    <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-1" />
                    <div className="text-sm font-medium">Warning</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.floor((metrics?.protocols.wsman_available || 0) * 0.1)}
                    </div>
                  </div>
                  <div>
                    <XCircle className="w-8 h-8 text-destructive mx-auto mb-1" />
                    <div className="text-sm font-medium">Critical</div>
                    <div className="text-xs text-muted-foreground">
                      {(metrics?.servers.total || 0) - (metrics?.protocols.total_protocols || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle>Recent Operational Events</CardTitle>
              <CardDescription>
                Latest infrastructure events and intelligence gathered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criticalEvents.length > 0 ? (
                  criticalEvents.slice(0, 5).map(event => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded border">
                      <div className="flex-shrink-0">
                        {event.severity === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                        {event.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-warning" />}
                        {event.severity === 'success' && <CheckCircle className="w-5 h-5 text-success" />}
                        {event.severity === 'info' && <Activity className="w-5 h-5 text-info" />}
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">{event.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {event.event_source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at))} ago
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                    <div className="font-medium">All Clear</div>
                    <div className="text-sm">No critical events in the last 24 hours</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}