import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Server,
  Building2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  Settings,
  Search,
  Calendar,
  Network,
  RefreshCw,
  ArrowRight,
  Zap,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardMetrics {
  totalServers: number;
  onlineServers: number;
  criticalAlerts: number;
  warrantyExpiring: number;
  healthScore: number;
  lastDiscovery: string;
  datacenters: Array<{
    name: string;
    location: string;
    servers: number;
    status: 'healthy' | 'warning' | 'critical';
  }>;
}

export function EnterpriseManagement() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalServers: 0,
    onlineServers: 0,
    criticalAlerts: 0,
    warrantyExpiring: 0,
    healthScore: 0,
    lastDiscovery: 'Never',
    datacenters: []
  });
  
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [serversResult, datacentersResult, alertsResult] = await Promise.allSettled([
        supabase.from('servers').select('*'),
        supabase.from('datacenters').select('*'),
        supabase.from('eol_alerts').select('*').eq('acknowledged', false)
      ]);

      if (serversResult.status === 'fulfilled' && !serversResult.value.error) {
        const servers = serversResult.value.data || [];
        const onlineServers = servers.filter(s => s.status === 'online').length;
        const warrantyExpiring = servers.filter(s => {
          if (!s.warranty_end_date) return false;
          const endDate = new Date(s.warranty_end_date);
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          return endDate <= threeMonthsFromNow;
        }).length;

        const datacenters = datacentersResult.status === 'fulfilled' ? (datacentersResult.value.data || []) : [];
        const dcMetrics = datacenters.map(dc => {
          const dcServers = servers.filter(s => s.datacenter === dc.name);
          const dcOnline = dcServers.filter(s => s.status === 'online').length;
          const healthScore = dcServers.length > 0 ? Math.round((dcOnline / dcServers.length) * 100) : 100;
          
          return {
            name: dc.name,
            location: dc.location || 'Unknown',
            servers: dcServers.length,
            status: healthScore >= 90 ? 'healthy' as const : healthScore >= 70 ? 'warning' as const : 'critical' as const
          };
        });

        const overallHealth = servers.length > 0 ? Math.round((onlineServers / servers.length) * 100) : 100;
        const criticalAlerts = (alertsResult.status === 'fulfilled' ? (alertsResult.value.data?.length || 0) : 0) + 
                              (warrantyExpiring > 5 ? 1 : 0);

        setMetrics({
          totalServers: servers.length,
          onlineServers,
          criticalAlerts,
          warrantyExpiring,
          healthScore: overallHealth,
          lastDiscovery: servers.length > 0 ? '2 hours ago' : 'Never',
          datacenters: dcMetrics
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load infrastructure data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    await fetchDashboardData();
    toast({
      title: "Refreshed",
      description: "Infrastructure data updated"
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Infrastructure & Operations</h1>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />
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
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Infrastructure Dashboard</h1>
            <p className="text-muted-foreground text-lg">Real-time monitoring and management</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {metrics.criticalAlerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-base">
            <strong>{metrics.criticalAlerts} critical alert{metrics.criticalAlerts > 1 ? 's' : ''} require immediate attention</strong>
            {metrics.warrantyExpiring > 0 && (
              <div className="mt-1">{metrics.warrantyExpiring} systems have warranties expiring soon</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Infrastructure Overview */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Server className="w-5 h-5" />
              Infrastructure Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{metrics.totalServers}</div>
                <div className="text-sm text-muted-foreground">Total Servers</div>
                <div className="text-xs text-green-600 mt-1">
                  {metrics.onlineServers} online
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getHealthColor(metrics.healthScore)}`}>
                  {metrics.healthScore}%
                </div>
                <div className="text-sm text-muted-foreground">Health Score</div>
                <Progress value={metrics.healthScore} className="mt-2" />
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span>Last Discovery:</span>
                <span className="font-medium">{metrics.lastDiscovery}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => window.location.href = '/discovery'}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Network Discovery
              </div>
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => window.location.href = '/scheduler'}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Updates
              </div>
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => window.location.href = '/settings/datacenters'}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configure Datacenters
              </div>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Datacenters Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Datacenter Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.datacenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No datacenters configured</p>
              <p className="mb-4">Configure your first datacenter to start monitoring</p>
              <Button onClick={() => window.location.href = '/settings/datacenters'}>
                Configure Datacenters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.datacenters.map((dc, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{dc.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${
                      dc.status === 'healthy' ? 'bg-green-500' : 
                      dc.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{dc.location}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Servers:</span>
                    <span className="font-medium">{dc.servers}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm">Status:</span>
                    <span className={`text-sm font-medium capitalize ${getStatusColor(dc.status)}`}>
                      {dc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.onlineServers}</div>
                <div className="text-sm text-muted-foreground">Online Systems</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{100 - metrics.criticalAlerts}</div>
                <div className="text-sm text-muted-foreground">Security Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.warrantyExpiring}</div>
                <div className="text-sm text-muted-foreground">Warranty Expiring</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.criticalAlerts}</div>
                <div className="text-sm text-muted-foreground">Critical Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}