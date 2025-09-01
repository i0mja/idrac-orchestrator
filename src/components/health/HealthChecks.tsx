import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Server,
  Network,
  Database,
  Activity,
  Clock,
  HardDrive,
  TrendingUp,
  Eye,
  Zap,
  Settings,
  AlertOctagon,
  Info,
  ArrowRight
} from "lucide-react";

interface SystemHealthMetrics {
  serverHealth: {
    total: number;
    online: number;
    offline: number;
    pending: number;
    percentage: number;
  };
  securityHealth: {
    criticalAlerts: number;
    warrantyExpiring: number;
    osEolSoon: number;
    securityScore: number;
  };
  infrastructureHealth: {
    datacenters: number;
    activeDatacenters: number;
    totalVMs: number;
    vCenterConnections: number;
  };
  operationalHealth: {
    recentDiscoveries: number;
    pendingUpdates: number;
    failedJobs: number;
    lastBackup: Date | null;
  };
}

interface HealthIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
  count?: number;
}

export function HealthChecks() {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
  const [issues, setIssues] = useState<HealthIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);

      // Fetch all necessary data in parallel
      const [
        serversResult,
        datacentersResult,
        alertsResult,
        vmsResult,
        vcentersResult,
        updateJobsResult,
        backupsResult
      ] = await Promise.allSettled([
        supabase.from('servers').select('*'),
        supabase.from('datacenters').select('*'),
        supabase.from('eol_alerts').select('*').eq('acknowledged', false),
        supabase.from('virtual_machines').select('*'),
        supabase.from('vcenters').select('*'),
        supabase.from('update_jobs').select('*'),
        supabase.from('server_backups').select('*').order('created_at', { ascending: false }).limit(1)
      ]);

      // Process server health
      const servers = serversResult.status === 'fulfilled' ? (serversResult.value.data || []) : [];
      const onlineServers = servers.filter(s => s.status === 'online').length;
      const offlineServers = servers.filter(s => s.status === 'offline').length;
      const pendingServers = servers.filter(s => s.status === 'unknown').length;

      // Process security data
      const alerts = alertsResult.status === 'fulfilled' ? (alertsResult.value.data || []) : [];
      const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
      
      // Warranty expiring in next 90 days
      const warrantyExpiring = servers.filter(s => {
        if (!s.warranty_end_date) return false;
        const endDate = new Date(s.warranty_end_date);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        return endDate <= threeMonthsFromNow;
      }).length;

      // OS EOL in next 6 months
      const osEolSoon = servers.filter(s => {
        if (!s.os_eol_date) return false;
        const eolDate = new Date(s.os_eol_date);
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        return eolDate <= sixMonthsFromNow;
      }).length;

      // Process infrastructure data
      const datacenters = datacentersResult.status === 'fulfilled' ? (datacentersResult.value.data || []) : [];
      const activeDatacenters = datacenters.filter(dc => dc.is_active).length;
      const vms = vmsResult.status === 'fulfilled' ? (vmsResult.value.data || []) : [];
      const vcenters = vcentersResult.status === 'fulfilled' ? (vcentersResult.value.data || []) : [];

      // Process operational data
      const updateJobs = updateJobsResult.status === 'fulfilled' ? (updateJobsResult.value.data || []) : [];
      const failedJobs = updateJobs.filter(j => j.status === 'failed').length;
      const pendingUpdates = updateJobs.filter(j => j.status === 'pending').length;
      
      const recentDiscoveries = servers.filter(s => {
        if (!s.last_discovered) return false;
        const discoveredDate = new Date(s.last_discovered);
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return discoveredDate >= oneDayAgo;
      }).length;

      const lastBackup = backupsResult.status === 'fulfilled' && backupsResult.value.data?.[0] 
        ? new Date(backupsResult.value.data[0].created_at) 
        : null;

      // Calculate health metrics
      const serverHealthPercentage = servers.length > 0 ? Math.round((onlineServers / servers.length) * 100) : 100;
      const securityScore = Math.max(0, 100 - (criticalAlerts * 10) - (warrantyExpiring * 5) - (osEolSoon * 3));

      const healthMetrics: SystemHealthMetrics = {
        serverHealth: {
          total: servers.length,
          online: onlineServers,
          offline: offlineServers,
          pending: pendingServers,
          percentage: serverHealthPercentage
        },
        securityHealth: {
          criticalAlerts,
          warrantyExpiring,
          osEolSoon,
          securityScore
        },
        infrastructureHealth: {
          datacenters: datacenters.length,
          activeDatacenters,
          totalVMs: vms.length,
          vCenterConnections: vcenters.length
        },
        operationalHealth: {
          recentDiscoveries,
          pendingUpdates,
          failedJobs,
          lastBackup
        }
      };

      // Generate health issues
      const healthIssues: HealthIssue[] = [];

      if (offlineServers > 0) {
        healthIssues.push({
          id: 'offline-servers',
          type: 'critical',
          title: 'Servers Offline',
          description: `${offlineServers} servers are currently offline and unreachable`,
          action: 'View Inventory',
          actionUrl: '/inventory',
          count: offlineServers
        });
      }

      if (criticalAlerts > 0) {
        healthIssues.push({
          id: 'critical-alerts',
          type: 'critical',
          title: 'Critical Security Alerts',
          description: `${criticalAlerts} critical alerts require immediate attention`,
          action: 'View Alerts',
          actionUrl: '/alerts',
          count: criticalAlerts
        });
      }

      if (warrantyExpiring > 0) {
        healthIssues.push({
          id: 'warranty-expiring',
          type: 'warning',
          title: 'Warranty Expiration',
          description: `${warrantyExpiring} servers have warranties expiring within 90 days`,
          action: 'Review Inventory',
          actionUrl: '/inventory',
          count: warrantyExpiring
        });
      }

      if (failedJobs > 0) {
        healthIssues.push({
          id: 'failed-jobs',
          type: 'warning',
          title: 'Failed Update Jobs',
          description: `${failedJobs} update jobs have failed and need attention`,
          action: 'View Scheduler',
          actionUrl: '/scheduler',
          count: failedJobs
        });
      }

      if (osEolSoon > 0) {
        healthIssues.push({
          id: 'os-eol',
          type: 'warning',
          title: 'OS End-of-Life',
          description: `${osEolSoon} servers have OS reaching end-of-life within 6 months`,
          action: 'Plan Upgrades',
          actionUrl: '/inventory',
          count: osEolSoon
        });
      }

      if (!lastBackup || (Date.now() - lastBackup.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        healthIssues.push({
          id: 'backup-outdated',
          type: 'warning',
          title: 'Outdated Backups',
          description: 'System configuration backup is older than 7 days',
          action: 'Configure Backups',
          actionUrl: '/settings'
        });
      }

      setMetrics(healthMetrics);
      setIssues(healthIssues);
      setLastCheckTime(new Date());

    } catch (error) {
      console.error('Error fetching health data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system health data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsRunningCheck(true);
    toast({
      title: "Running Health Check",
      description: "Scanning all system components..."
    });

    try {
      // Run actual health diagnostics
      await fetchHealthData();
      
      // Test database connectivity
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('system_config').select('id').limit(1);
      const dbResponseTime = Date.now() - dbStart;

      if (dbError) {
        toast({
          title: "Database Issue",
          description: "Database connectivity problems detected",
          variant: "destructive"
        });
      }

      // Test edge function connectivity
      try {
        await supabase.functions.invoke('discover-servers', {
          body: { test: true }
        });
      } catch (error) {
        console.log('Edge function test failed (expected for test call)');
      }

      const criticalCount = issues.filter(i => i.type === 'critical').length;
      const warningCount = issues.filter(i => i.type === 'warning').length;

      if (criticalCount > 0) {
        toast({
          title: "Critical Issues Found",
          description: `${criticalCount} critical issues require immediate attention`,
          variant: "destructive"
        });
      } else if (warningCount > 0) {
        toast({
          title: "Warnings Detected",
          description: `${warningCount} issues found that should be addressed`,
        });
      } else {
        toast({
          title: "All Systems Healthy",
          description: "No critical issues detected"
        });
      }

    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: "Health Check Failed",
        description: "Unable to complete comprehensive health check",
        variant: "destructive"
      });
    } finally {
      setIsRunningCheck(false);
    }
  };

  const runServerConnectivityTest = async () => {
    if (!metrics) return;

    toast({
      title: "Testing Server Connectivity",
      description: `Testing connections to ${metrics.serverHealth.total} servers...`
    });

    try {
      const { data, error } = await supabase.functions.invoke('discover-servers', {
        body: {
          connectivityTest: true,
          testExistingServers: true
        }
      });

      if (error) throw error;

      toast({
        title: "Connectivity Test Complete",
        description: `Tested ${data?.tested || 0} servers. ${data?.successful || 0} responded successfully.`
      });

      // Refresh data after test
      fetchHealthData();
    } catch (error) {
      toast({
        title: "Connectivity Test Failed",
        description: "Unable to complete server connectivity test",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchHealthData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getOverallHealth = () => {
    if (!metrics) return 'unknown';
    
    const criticalIssues = issues.filter(i => i.type === 'critical').length;
    const warningIssues = issues.filter(i => i.type === 'warning').length;
    
    if (criticalIssues > 0) return 'critical';
    if (warningIssues > 0) return 'warning';
    return 'healthy';
  };

  const getHealthScore = () => {
    if (!metrics) return 0;
    
    let score = 100;
    score -= issues.filter(i => i.type === 'critical').length * 15;
    score -= issues.filter(i => i.type === 'warning').length * 5;
    
    return Math.max(0, score);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
            <p className="text-muted-foreground">Loading health metrics...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">System Health</h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive health monitoring and diagnostics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastCheckTime && (
            <p className="text-sm text-muted-foreground">
              Last check: {formatDistanceToNow(lastCheckTime)} ago
            </p>
          )}
          <Button 
            onClick={runHealthCheck} 
            disabled={isRunningCheck}
            size="lg"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isRunningCheck ? 'animate-spin' : ''}`} />
            {isRunningCheck ? 'Scanning...' : 'Run Health Check'}
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card className="border-2">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(getOverallHealth())}
              <div>
                <h2 className="text-2xl font-bold">
                  Overall System Health
                </h2>
                <p className="text-muted-foreground text-lg">
                  {getOverallHealth() === 'healthy' && 'All systems operating normally'}
                  {getOverallHealth() === 'warning' && 'Some issues detected, monitoring required'}
                  {getOverallHealth() === 'critical' && 'Critical issues require immediate attention'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getStatusColor(getOverallHealth())}`}>
                {getHealthScore()}%
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
            </div>
          </div>
          <div className="mt-6">
            <Progress value={getHealthScore()} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues Alert */}
      {issues.filter(i => i.type === 'critical').length > 0 && (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertDescription className="text-base">
            <strong>Critical Issues Detected:</strong> {issues.filter(i => i.type === 'critical').length} issues require immediate attention.
            <Button variant="outline" size="sm" className="ml-3" onClick={() => document.getElementById('issues-section')?.scrollIntoView()}>
              View Issues
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Health Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Server Health */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Server className="w-8 h-8 text-primary" />
                <Badge variant={metrics.serverHealth.percentage > 80 ? 'default' : 'destructive'}>
                  {metrics.serverHealth.percentage}%
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">Server Health</h3>
              <p className="text-2xl font-bold">{metrics.serverHealth.online}</p>
              <p className="text-sm text-muted-foreground">
                of {metrics.serverHealth.total} online
              </p>
              <div className="mt-2 text-xs">
                <span className="text-red-600">{metrics.serverHealth.offline} offline</span>
                {metrics.serverHealth.pending > 0 && (
                  <span className="ml-2 text-yellow-600">{metrics.serverHealth.pending} unknown</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Health */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Shield className="w-8 h-8 text-primary" />
                <Badge variant={metrics.securityHealth.securityScore > 80 ? 'default' : 'destructive'}>
                  {metrics.securityHealth.securityScore}%
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">Security Score</h3>
              <p className="text-2xl font-bold">{metrics.securityHealth.criticalAlerts}</p>
              <p className="text-sm text-muted-foreground">critical alerts</p>
              <div className="mt-2 text-xs">
                <span className="text-yellow-600">{metrics.securityHealth.warrantyExpiring} warranties expiring</span>
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure Health */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Network className="w-8 h-8 text-primary" />
                <Badge variant="default">
                  {metrics.infrastructureHealth.activeDatacenters}/{metrics.infrastructureHealth.datacenters}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">Infrastructure</h3>
              <p className="text-2xl font-bold">{metrics.infrastructureHealth.totalVMs}</p>
              <p className="text-sm text-muted-foreground">virtual machines</p>
              <div className="mt-2 text-xs">
                <span className="text-green-600">{metrics.infrastructureHealth.vCenterConnections} vCenter connections</span>
              </div>
            </CardContent>
          </Card>

          {/* Operational Health */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-primary" />
                <Badge variant={metrics.operationalHealth.failedJobs === 0 ? 'default' : 'destructive'}>
                  {metrics.operationalHealth.failedJobs === 0 ? 'Good' : 'Issues'}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">Operations</h3>
              <p className="text-2xl font-bold">{metrics.operationalHealth.pendingUpdates}</p>
              <p className="text-sm text-muted-foreground">pending updates</p>
              <div className="mt-2 text-xs">
                <span className="text-blue-600">{metrics.operationalHealth.recentDiscoveries} recent discoveries</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues & Recommendations */}
      {issues.length > 0 && (
        <Card id="issues-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issues & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  {issue.type === 'critical' && <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                  {issue.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                  {issue.type === 'info' && <Info className="w-5 h-5 text-blue-600 mt-0.5" />}
                  <div>
                    <h4 className="font-semibold">{issue.title}</h4>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
                {issue.action && issue.actionUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = issue.actionUrl!}
                  >
                    {issue.action}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Diagnostic Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col gap-3"
              onClick={runServerConnectivityTest}
            >
              <Server className="w-8 h-8 text-primary" />
              <span className="font-semibold">Test Server Connectivity</span>
              <span className="text-sm text-muted-foreground text-center">
                Verify iDRAC/BMC connections to all discovered servers
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col gap-3"
              onClick={() => window.location.href = '/discovery'}
            >
              <Network className="w-8 h-8 text-primary" />
              <span className="font-semibold">Network Discovery</span>
              <span className="text-sm text-muted-foreground text-center">
                Scan network for new Dell servers
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col gap-3"
              onClick={() => window.location.href = '/alerts'}
            >
              <AlertTriangle className="w-8 h-8 text-primary" />
              <span className="font-semibold">Review Alerts</span>
              <span className="text-sm text-muted-foreground text-center">
                View and manage system alerts and events
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}