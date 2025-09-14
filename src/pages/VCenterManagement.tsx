import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VCenterConnections } from "@/components/vcenter/VCenterConnections";
import { VCenterInfrastructure } from "@/components/vcenter/VCenterInfrastructure";
import { VCenterClusters } from "@/components/vcenter/VCenterClusters";
import { 
  Globe, 
  Network, 
  Server, 
  Settings, 
  Activity, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus
} from "lucide-react";

export default function VCenterManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchParams] = useSearchParams();
  const clusterFilter = searchParams.get('cluster') || undefined;
  const hostFilter = searchParams.get('host') || undefined;

  useEffect(() => {
    if (clusterFilter) setActiveTab('clusters');
    if (hostFilter) setActiveTab('infrastructure');
  }, [clusterFilter, hostFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Mock statistics - in real app, these would come from API
  const stats = {
    totalConnections: 3,
    activeConnections: 2,
    totalHosts: 47,
    totalVMs: 312,
    clustersManaged: 8,
    lastSync: "2 minutes ago"
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">vCenter Management</h1>
            <p className="text-muted-foreground text-lg">
              Manage vCenter connections and monitor virtual infrastructure
            </p>
          </div>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold">{stats.activeConnections}</p>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">/{stats.totalConnections}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Managed Hosts</p>
                <p className="text-2xl font-bold">{stats.totalHosts}</p>
              </div>
              <Server className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Virtual Machines</p>
                <p className="text-2xl font-bold">{stats.totalVMs}</p>
              </div>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clusters</p>
                <p className="text-2xl font-bold">{stats.clustersManaged}</p>
              </div>
              <Network className="w-5 h-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">Connections</span>
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Infrastructure</span>
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">Clusters</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  System Status
                </CardTitle>
                <CardDescription>
                  Current status of vCenter integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Health</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Sync</span>
                  <span className="text-sm text-muted-foreground">{stats.lastSync}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Collection</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common vCenter management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("connections")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add vCenter Connection
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("infrastructure")}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  View Infrastructure
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("clusters")}
                >
                  <Server className="w-4 h-4 mr-2" />
                  Manage Clusters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest vCenter operations and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">vCenter sync completed successfully</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Activity className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Infrastructure scan updated</p>
                    <p className="text-xs text-muted-foreground">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cluster maintenance window scheduled</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <VCenterConnections />
        </TabsContent>

        <TabsContent value="infrastructure">
          <VCenterInfrastructure hostFilter={hostFilter} />
        </TabsContent>

        <TabsContent value="clusters">
          <VCenterClusters clusterFilter={clusterFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}