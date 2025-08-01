import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Calendar,
  Target,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Users,
  Database,
  Cpu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedEnterprise } from "@/hooks/useOptimizedEnterprise";
import { useAutoOrchestration } from "@/hooks/useAutoOrchestration";
import { useServers } from "@/hooks/useServers";
import { useDellEnterprise } from "@/hooks/useDellEnterprise";

export function EnterpriseManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [orchestrationDialogOpen, setOrchestrationDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { 
    servers, 
    dellPackages, 
    systemEvents, 
    loading: dataLoading, 
    operationStates,
    discoverFirmwareIntelligent,
    calculateSystemHealthScore,
    refresh 
  } = useOptimizedEnterprise();
  
  const { 
    config: autoConfig, 
    toggleAutoOrchestration
  } = useAutoOrchestration();
  
  // Add stable loading state to prevent stuttering
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Use effect to handle initial load completion
  useEffect(() => {
    if (!dataLoading && servers.length >= 0) {
      setIsInitialLoad(false);
    }
  }, [dataLoading, servers.length]);

  const { 
    orchestrationPlans,
    createOrchestrationPlan, 
    executeOrchestrationPlan,
    pauseOrchestrationPlan 
  } = useDellEnterprise();

  // Memoize expensive calculations to prevent flickering
  const enterpriseMetrics = useMemo(() => {
    // Return empty state while loading to prevent stuttering
    if (isInitialLoad || dataLoading) {
      return {
        totalServers: 0,
        dellServers: 0,
        onlineServers: 0,
        criticalAlerts: 0,
        updatePackages: 0,
        orchestrationPlans: 0,
        clustersCount: 0,
        complianceScore: 0
      };
    }
    
    return {
      totalServers: servers.length,
      dellServers: servers.filter(s => s.model?.toLowerCase().includes('dell')).length,
      onlineServers: servers.filter(s => s.status === 'online').length,
      criticalAlerts: systemEvents.filter(e => e.severity === 'critical' && !e.acknowledged).length,
      updatePackages: dellPackages.length,
      orchestrationPlans: orchestrationPlans.length,
      clustersCount: [...new Set(servers.map(s => s.cluster_name).filter(Boolean))].length,
      complianceScore: Math.round((servers.filter(s => s.status === 'online').length / Math.max(servers.length, 1)) * 100)
    };
  }, [servers, systemEvents, dellPackages, orchestrationPlans, isInitialLoad, dataLoading]);

  // Memoize system health score calculation
  const healthScore = useMemo(() => {
    if (isInitialLoad || dataLoading || servers.length === 0) {
      return { 
        overallScore: 0, 
        breakdown: { serverHealth: 0, firmwareCompliance: 0, eventSeverity: 0, systemStability: 0 }, 
        recommendations: [],
        trend: 'stable' as const
      };
    }
    return calculateSystemHealthScore();
  }, [calculateSystemHealthScore, isInitialLoad, dataLoading, servers.length]);
  
  // Memoize clusters calculation
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

  // Stabilize callback functions to prevent re-renders
  const handleBulkFirmwareDiscovery = useCallback(async () => {
    try {
      const serverIds = filteredServers
        .filter(s => s.status === 'online')
        .map(s => s.id);
      
      if (serverIds.length === 0) {
        toast({
          title: "No servers available",
          description: "No online servers found for discovery",
          variant: "destructive"
        });
        return;
      }

      const discoveredCount = await discoverFirmwareIntelligent(serverIds);
      
      toast({
        title: "Firmware Discovery Complete",
        description: `Discovered firmware for ${discoveredCount} servers`,
      });
      
      await refresh();
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Failed to perform firmware discovery",
        variant: "destructive"
      });
    }
  }, [filteredServers, discoverFirmwareIntelligent, refresh, toast]);

  const handleCreateOrchestrationPlan = useCallback(async () => {
    try {
      const selectedServers = filteredServers
        .filter(s => s.status === 'online')
        .slice(0, 10); // Limit for demo
      
      if (selectedServers.length === 0) {
        toast({
          title: "No servers selected",
          description: "Please select servers for orchestration",
          variant: "destructive"
        });
        return;
      }

      // Create update sequence
      const updateSequence = selectedServers.map((server, index) => ({
        step_number: index + 1,
        component_type: 'firmware',
        package_id: dellPackages[0]?.id || '',
        estimated_duration_minutes: 45,
        requires_maintenance_mode: true,
        pre_checks: ['backup_config', 'verify_connectivity'],
        post_checks: ['verify_update', 'check_services']
      }));

      const plan = await createOrchestrationPlan({
        name: `Enterprise Update Plan ${new Date().toLocaleDateString()}`,
        server_ids: selectedServers.map(s => s.id),
        update_sequence: updateSequence,
        vmware_settings: {
          enable_maintenance_mode: true,
          evacuate_vms: true,
          drs_enabled: true,
          migration_policy: 'automatic' as const,
          max_concurrent_hosts: 2,
          wait_for_vm_migration: true
        },
        safety_checks: {
          verify_backups: true,
          check_vmware_compatibility: true,
          validate_checksums: true,
          ensure_cluster_health: true,
          minimum_healthy_hosts: 2,
          max_downtime_minutes: 60
        },
        rollback_plan: [
          {
            step_number: 1,
            action: 'restore_snapshot',
            component: 'system'
          },
          {
            step_number: 2,
            action: 'exit_maintenance_mode',
            component: 'vmware'
          }
        ]
      });

      if (plan) {
        toast({
          title: "Orchestration Plan Created",
          description: `Created plan for ${selectedServers.length} servers`,
        });
        setOrchestrationDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Failed to Create Plan",
        description: "Could not create orchestration plan",
        variant: "destructive"
      });
    }
  }, [filteredServers, dellPackages, createOrchestrationPlan, toast]);

  const handleExecutePlan = useCallback(async (planId: string) => {
    try {
      await executeOrchestrationPlan(planId);
      toast({
        title: "Plan Execution Started",
        description: "Orchestration plan is now running",
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Could not start plan execution",
        variant: "destructive"
      });
    }
  }, [executeOrchestrationPlan, toast]);

  const handlePausePlan = useCallback(async (planId: string) => {
    try {
      await pauseOrchestrationPlan(planId);
      toast({
        title: "Plan Paused",
        description: "Orchestration plan has been paused",
      });
    } catch (error) {
      toast({
        title: "Pause Failed",
        description: "Could not pause plan execution",
        variant: "destructive"
      });
    }
  }, [pauseOrchestrationPlan, toast]);

  // Show stable loading state without stuttering
  if (isInitialLoad) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold text-gradient">Enterprise Management</h1>
            <p className="text-muted-foreground">Loading enterprise data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border border-border/50" />
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
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clusters</SelectItem>
              {clusters.map(cluster => (
                <SelectItem key={cluster} value={cluster}>{cluster}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => refresh()} variant="outline" size="sm">
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
              {enterpriseMetrics.dellServers} Dell servers
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore.overallScore}%</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${healthScore.overallScore}%` }}
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
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
                    <Progress 
                      value={(enterpriseMetrics.onlineServers / Math.max(enterpriseMetrics.totalServers, 1)) * 100} 
                      className="w-20" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compliance Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{enterpriseMetrics.complianceScore}%</span>
                    <Progress value={enterpriseMetrics.complianceScore} className="w-20" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Clusters</span>
                  <span className="text-sm font-medium">{enterpriseMetrics.clustersCount}</span>
                </div>
                <Separator />
                <Button 
                  onClick={handleBulkFirmwareDiscovery} 
                  className="w-full"
                  disabled={operationStates.discoverFirmwareIntelligent}
                >
                  {operationStates.discoverFirmwareIntelligent ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Discover Firmware
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* System Health Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Detailed health analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(healthScore.breakdown).map(([category, score]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{category.replace(/([A-Z])/g, ' $1')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{Math.round(score as number)}%</span>
                      <Progress value={score as number} className="w-20" />
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recommendations</h4>
                  {healthScore.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                      {rec.description}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

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
        </TabsContent>

        {/* Orchestration Tab */}
        <TabsContent value="orchestration" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Update Orchestration</h3>
              <p className="text-sm text-muted-foreground">
                Manage coordinated updates across your infrastructure
              </p>
            </div>
            <Dialog open={orchestrationDialogOpen} onOpenChange={setOrchestrationDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Play className="w-4 h-4 mr-2" />
                  Create Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Orchestration Plan</DialogTitle>
                  <DialogDescription>
                    Create a new update orchestration plan for selected servers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm">
                    <p><strong>Selected Cluster:</strong> {selectedCluster === "all" ? "All Clusters" : selectedCluster}</p>
                    <p><strong>Available Servers:</strong> {filteredServers.filter(s => s.status === 'online').length}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleCreateOrchestrationPlan} className="flex-1">
                      Create Plan
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setOrchestrationDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Orchestration Plans Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Servers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orchestrationPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.server_ids?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant={
                          plan.status === 'running' ? 'default' :
                          plan.status === 'completed' ? 'secondary' :
                          plan.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={plan.total_steps ? (plan.current_step / plan.total_steps) * 100 : 0} 
                            className="w-20" 
                          />
                          <span className="text-xs text-muted-foreground">
                            {plan.current_step}/{plan.total_steps || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {plan.status === 'planned' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleExecutePlan(plan.id)}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          {plan.status === 'running' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePausePlan(plan.id)}
                            >
                              <Pause className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-Orchestration
              </CardTitle>
              <CardDescription>
                Automated update management and scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Orchestration</h4>
                  <p className="text-sm text-muted-foreground">
                    {autoConfig?.enabled ? 'Enabled' : 'Disabled'} - 
                    Runs every {autoConfig?.execution_interval_months} months
                  </p>
                </div>
                <Button 
                  variant={autoConfig?.enabled ? "destructive" : "default"}
                  onClick={toggleAutoOrchestration}
                >
                  {autoConfig?.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
              
              {autoConfig?.enabled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium">Maintenance Window</span>
                    <p className="text-sm text-muted-foreground">
                      {autoConfig.maintenance_window_start} - {autoConfig.maintenance_window_end}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Update Interval</span>
                    <p className="text-sm text-muted-foreground">
                      Every {autoConfig.update_interval_minutes} minutes
                    </p>
                  </div>
                </div>
              )}
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

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Downloads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full mb-2">
                  Export Server List
                </Button>
                <Button variant="outline" className="w-full mb-2">
                  Export Update Report
                </Button>
                <Button variant="outline" className="w-full">
                  Export Health Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full mb-2">
                  Import Server Data
                </Button>
                <Button variant="outline" className="w-full mb-2">
                  Import Configuration
                </Button>
                <Button variant="outline" className="w-full">
                  Import Policies
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full mb-2">
                  System Settings
                </Button>
                <Button variant="outline" className="w-full mb-2">
                  Update Policies
                </Button>
                <Button variant="outline" className="w-full">
                  Backup Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}