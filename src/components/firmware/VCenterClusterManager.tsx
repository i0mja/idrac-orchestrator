import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Pause,
  Play,
  RefreshCw,
  Shield,
  Server,
  Zap,
  Settings
} from "lucide-react";

interface ClusterHost {
  id: string;
  hostname: string;
  ip_address: string;
  model: string;
  status: 'online' | 'offline' | 'maintenance' | 'updating';
  cluster_name?: string;
  drs_enabled: boolean;
  ha_agent_active: boolean;
  current_vms: number;
  max_vms: number;
  firmware_compliance: 'compliant' | 'outdated' | 'critical';
  last_updated?: string;
}

interface ClusterUpdatePlan {
  cluster_name: string;
  total_hosts: number;
  hosts_per_batch: number;
  estimated_duration: number;
  maintenance_windows: string[];
  resource_requirements: {
    min_active_hosts: number;
    vm_evacuation_needed: boolean;
    storage_migration_needed: boolean;
  };
}

export function VCenterClusterManager() {
  const [clusters, setClusters] = useState<Record<string, ClusterHost[]>>({});
  const [updatePlans, setUpdatePlans] = useState<Record<string, ClusterUpdatePlan>>({});
  const [activeUpdates, setActiveUpdates] = useState<Record<string, { currentHost: string; progress: number }>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadClusterData();
  }, []);

  const loadClusterData = async () => {
    try {
      const { data: servers, error } = await supabase
        .from('servers')
        .select('*')
        .not('cluster_name', 'is', null)
        .order('cluster_name', { ascending: true });

      if (error) throw error;

      // Group servers by cluster
      const clusterMap: Record<string, ClusterHost[]> = {};
      servers?.forEach(server => {
        const clusterName = server.cluster_name || 'Standalone';
        if (!clusterMap[clusterName]) {
          clusterMap[clusterName] = [];
        }
        
        clusterMap[clusterName].push({
          id: server.id,
          hostname: server.hostname,
          ip_address: server.ip_address,
          model: server.model || 'Unknown',
          status: server.status as any,
          cluster_name: server.cluster_name,
          drs_enabled: true, // Would come from vCenter API
          ha_agent_active: server.status === 'online',
          current_vms: Math.floor(Math.random() * 20), // Mock data
          max_vms: 50,
          firmware_compliance: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'outdated' : 'compliant',
          last_updated: server.updated_at
        });
      });

      setClusters(clusterMap);
      generateUpdatePlans(clusterMap);
    } catch (error) {
      console.error('Failed to load cluster data:', error);
      toast({
        title: "Error",
        description: "Failed to load vCenter cluster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateUpdatePlans = (clusterMap: Record<string, ClusterHost[]>) => {
    const plans: Record<string, ClusterUpdatePlan> = {};
    
    Object.entries(clusterMap).forEach(([clusterName, hosts]) => {
      if (clusterName === 'Standalone') return;
      
      const criticalHosts = hosts.filter(h => h.firmware_compliance === 'critical').length;
      const outdatedHosts = hosts.filter(h => h.firmware_compliance === 'outdated').length;
      const totalVMs = hosts.reduce((sum, h) => sum + h.current_vms, 0);
      
      plans[clusterName] = {
        cluster_name: clusterName,
        total_hosts: hosts.length,
        hosts_per_batch: 1, // vCenter best practice: one host at a time
        estimated_duration: hosts.length * 45, // 45 minutes per host
        maintenance_windows: ['2024-01-20T02:00:00Z', '2024-01-21T02:00:00Z'],
        resource_requirements: {
          min_active_hosts: Math.max(1, Math.ceil(hosts.length * 0.5)), // 50% capacity minimum
          vm_evacuation_needed: totalVMs > 0,
          storage_migration_needed: false // Assume shared storage
        }
      };
    });
    
    setUpdatePlans(plans);
  };

  const startClusterUpdate = async (clusterName: string) => {
    const cluster = clusters[clusterName];
    const plan = updatePlans[clusterName];
    
    if (!cluster || !plan) return;

    // Pre-flight checks
    const onlineHosts = cluster.filter(h => h.status === 'online');
    if (onlineHosts.length < plan.resource_requirements.min_active_hosts + 1) {
      toast({
        title: "Insufficient Resources",
        description: `Need at least ${plan.resource_requirements.min_active_hosts + 1} online hosts for safe cluster updates`,
        variant: "destructive",
      });
      return;
    }

    setActiveUpdates(prev => ({
      ...prev,
      [clusterName]: { currentHost: cluster[0].hostname, progress: 0 }
    }));

    toast({
      title: "Cluster Update Started",
      description: `Starting rolling firmware update for cluster ${clusterName}`,
    });

    // Here you would integrate with vCenter APIs to:
    // 1. Put host in maintenance mode
    // 2. Evacuate VMs (if DRS is enabled)
    // 3. Update firmware
    // 4. Exit maintenance mode
    // 5. Move to next host
  };

  const pauseClusterUpdate = (clusterName: string) => {
    setActiveUpdates(prev => {
      const updated = { ...prev };
      delete updated[clusterName];
      return updated;
    });
    
    toast({
      title: "Update Paused",
      description: `Cluster ${clusterName} update has been paused`,
    });
  };

  const getClusterStatus = (hosts: ClusterHost[]) => {
    const critical = hosts.filter(h => h.firmware_compliance === 'critical').length;
    const outdated = hosts.filter(h => h.firmware_compliance === 'outdated').length;
    const online = hosts.filter(h => h.status === 'online').length;
    
    return { critical, outdated, online, total: hosts.length };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading vCenter clusters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">vCenter Cluster Management</h2>
          <p className="text-muted-foreground">
            Coordinated firmware updates with cluster awareness
          </p>
        </div>
        <Button onClick={loadClusterData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Critical Alert */}
      {Object.values(clusters).some(hosts => hosts.some(h => h.firmware_compliance === 'critical')) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Security Updates Required</AlertTitle>
          <AlertDescription className="text-red-700">
            One or more clusters have hosts with critical firmware vulnerabilities. 
            Schedule maintenance windows immediately to ensure security compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Cluster Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(clusters).map(([clusterName, hosts]) => {
          if (clusterName === 'Standalone') return null;
          
          const status = getClusterStatus(hosts);
          const plan = updatePlans[clusterName];
          const activeUpdate = activeUpdates[clusterName];
          
          return (
            <Card key={clusterName} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    {clusterName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {status.critical > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {status.critical} Critical
                      </Badge>
                    )}
                    {status.outdated > 0 && (
                      <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                        {status.outdated} Outdated
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Cluster Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Hosts</span>
                    <p className="font-medium">{status.online}/{status.total}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VMs</span>
                    <p className="font-medium">{hosts.reduce((sum, h) => sum + h.current_vms, 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HA/DRS</span>
                    <p className="font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Active
                    </p>
                  </div>
                </div>

                {/* Active Update Progress */}
                {activeUpdate && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Updating: {activeUpdate.currentHost}</span>
                      <span>{activeUpdate.progress}%</span>
                    </div>
                    <Progress value={activeUpdate.progress} className="h-2" />
                  </div>
                )}

                {/* Update Plan Summary */}
                {plan && (
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                    <h4 className="font-medium text-sm">Update Plan</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="ml-1">{plan.estimated_duration}min</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Batch Size:</span>
                        <span className="ml-1">{plan.hosts_per_batch} host</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min Active:</span>
                        <span className="ml-1">{plan.resource_requirements.min_active_hosts}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">VM Migration:</span>
                        <span className="ml-1">{plan.resource_requirements.vm_evacuation_needed ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Host List */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Hosts</h4>
                  {hosts.map(host => (
                    <div key={host.id} className="flex items-center justify-between text-sm p-2 border rounded">
                      <div>
                        <span className="font-medium">{host.hostname}</span>
                        <span className="text-muted-foreground ml-2">({host.model})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{host.current_vms} VMs</span>
                        {host.firmware_compliance === 'critical' && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {host.status === 'online' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {activeUpdate ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => pauseClusterUpdate(clusterName)}
                      className="gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause Update
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => startClusterUpdate(clusterName)}
                      disabled={status.online < 2}
                      className="gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Start Rolling Update
                    </Button>
                  )}
                  
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Standalone Hosts */}
      {clusters.Standalone && (
        <Card>
          <CardHeader>
            <CardTitle>Standalone Hosts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.Standalone.map(host => (
                <div key={host.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{host.hostname}</span>
                    {host.status === 'online' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{host.model}</p>
                  <p className="text-xs text-muted-foreground mt-1">{host.ip_address}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}