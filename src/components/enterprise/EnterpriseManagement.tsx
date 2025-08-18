import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  Building2,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  Play,
  Pause,
  BarChart3,
  Target,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Cpu
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UpdateSchedulingCenter } from "@/components/scheduler/UpdateSchedulingCenter";

interface Server {
  id: string;
  hostname: string;
  ip_address: unknown;
  model: string | null;
  status: string;
  environment: string;
  cluster_name?: string | null;
  [key: string]: any; // Allow other properties from database
}

interface SystemEvent {
  id: string;
  title: string;
  description: string;
  severity: string;
  acknowledged: boolean;
  created_at: string;
}

interface OrchestrationPlan {
  id: string;
  name: string;
  status: string;
  server_ids: string[];
  current_step: number;
  total_steps: number;
}

export function EnterpriseManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [orchestrationPlans, setOrchestrationPlans] = useState<OrchestrationPlan[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  
  const { toast } = useToast();

  // Simple, stable data fetching
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel but handle each independently
      const [serversResult, eventsResult, plansResult] = await Promise.allSettled([
        supabase.from('servers').select('*').order('hostname'),
        supabase.from('system_events').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('update_orchestration_plans').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      if (serversResult.status === 'fulfilled' && !serversResult.value.error) {
        setServers(serversResult.value.data as Server[] || []);
      }
      
      if (eventsResult.status === 'fulfilled' && !eventsResult.value.error) {
        setSystemEvents(eventsResult.value.data as SystemEvent[] || []);
      }
      
      if (plansResult.status === 'fulfilled' && !plansResult.value.error) {
        setOrchestrationPlans(plansResult.value.data as OrchestrationPlan[] || []);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load enterprise data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data once on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Stable calculations with default values
  const enterpriseMetrics = useMemo(() => {
    if (loading) {
      return {
        totalServers: 0,
        onlineServers: 0,
        criticalAlerts: 0,
        orchestrationPlans: 0,
        complianceScore: 0
      };
    }

    const onlineServers = servers.filter(s => s.status === 'online').length;
    const criticalAlerts = systemEvents.filter(e => e.severity === 'critical' && !e.acknowledged).length;
    
    return {
      totalServers: servers.length,
      onlineServers,
      criticalAlerts,
      orchestrationPlans: orchestrationPlans.length,
      complianceScore: servers.length > 0 ? Math.round((onlineServers / servers.length) * 100) : 0
    };
  }, [servers, systemEvents, orchestrationPlans, loading]);

  const clusters = useMemo(() => 
    [...new Set(servers.map(s => s.cluster_name).filter(Boolean))], 
    [servers]
  );

  const filteredServers = useMemo(() => 
    selectedCluster === "all" 
      ? servers 
      : servers.filter(s => s.cluster_name === selectedCluster),
    [selectedCluster, servers]
  );

  const handleRefresh = async () => {
    await fetchData();
    toast({
      title: "Refreshed",
      description: "Enterprise data has been updated"
    });
  };

  const handleDiscovery = async () => {
    try {
      toast({
        title: "Discovery Started",
        description: "Firmware discovery is running..."
      });
      
      // Simulate discovery process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Discovery Complete",
        description: "Firmware discovery completed successfully"
      });
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Failed to perform firmware discovery",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg" />
          <div>
            <h1 className="text-3xl font-bold text-gradient">Enterprise Management</h1>
            <p className="text-muted-foreground">Loading enterprise data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Enterprise Management</h1>
          <p className="text-muted-foreground">
            Centralized management for your enterprise infrastructure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enterprise Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enterpriseMetrics.totalServers}</div>
            <p className="text-xs text-muted-foreground">
              Enterprise infrastructure
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Servers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enterpriseMetrics.onlineServers}</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${enterpriseMetrics.complianceScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enterpriseMetrics.orchestrationPlans}</div>
            <p className="text-xs text-muted-foreground">
              Orchestration plans
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {enterpriseMetrics.criticalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {enterpriseMetrics.criticalAlerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {enterpriseMetrics.criticalAlerts} critical alerts requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fleet Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Fleet Status
                </CardTitle>
                <CardDescription>
                  Current status of your server fleet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Online Servers</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {enterpriseMetrics.onlineServers}/{enterpriseMetrics.totalServers}
                    </span>
                    <Progress value={enterpriseMetrics.complianceScore} className="w-20" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Clusters</span>
                  <span className="text-sm font-medium">{clusters.length}</span>
                </div>
                <Button onClick={handleDiscovery} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  Discover Firmware
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`w-2 h-2 rounded-full ${
                        event.severity === 'critical' ? 'bg-destructive' :
                        event.severity === 'warning' ? 'bg-warning' : 'bg-success'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Fleet</CardTitle>
              <CardDescription>
                Manage your enterprise server infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.slice(0, 10).map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.hostname}</TableCell>
                      <TableCell>{server.model || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{server.environment}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          server.status === 'online' ? 'default' :
                          server.status === 'updating' ? 'secondary' : 'destructive'
                        }>
                          {server.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Discovery Performance</span>
                    <span className="text-sm font-medium">95%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Update Success Rate</span>
                    <span className="text-sm font-medium">98%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Uptime</span>
                    <span className="text-sm font-medium">99.9%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">45%</span>
                      <Progress value={45} className="w-20" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">62%</span>
                      <Progress value={62} className="w-20" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage Usage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">78%</span>
                      <Progress value={78} className="w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}