import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVCenterService } from "@/hooks/useVCenterService";
import { formatDistanceToNow } from "date-fns";
import { 
  Server, 
  HardDrive, 
  Cpu, 
  RefreshCw, 
  Monitor,
  Database,
  Globe,
  AlertCircle
} from "lucide-react";

export function VCenterInfrastructure({ hostFilter }: { hostFilter?: string }) {
  const { vcenters, clusters, lastSync } = useVCenterService();
  const filteredClusters = hostFilter ? clusters.filter(c => c.total_hosts > 0) : clusters;

  const totalStats = {
    clusters: filteredClusters.length,
    totalHosts: filteredClusters.reduce((sum, c) => sum + c.total_hosts, 0),
    activeHosts: filteredClusters.reduce((sum, c) => sum + c.active_hosts, 0),
    vms: 0 // This would come from virtual_machines table
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Virtual Infrastructure Overview</h2>
          <p className="text-muted-foreground">
            Monitor your virtualized environment across all vCenter servers
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Refresh All</span>
          <span className="sm:hidden">Refresh</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">vCenter Servers</span>
            </div>
            <div className="text-2xl font-bold">{vcenters.length}</div>
            <div className="text-sm text-muted-foreground">Connected</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Clusters</span>
            </div>
            <div className="text-2xl font-bold">{totalStats.clusters}</div>
            <div className="text-sm text-muted-foreground">Total clusters</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">ESXi Hosts</span>
            </div>
            <div className="text-2xl font-bold">{totalStats.activeHosts}</div>
            <div className="text-sm text-muted-foreground">
              {totalStats.totalHosts} total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium">Virtual Machines</span>
            </div>
            <div className="text-2xl font-bold">{totalStats.vms}</div>
            <div className="text-sm text-muted-foreground">Managed VMs</div>
          </CardContent>
        </Card>
      </div>

      {/* vCenter Overview Cards */}
      <div className="grid gap-4">
        {vcenters.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No vCenter Connections</h3>
              <p className="text-muted-foreground">
                Configure vCenter connections to view your virtual infrastructure
              </p>
            </CardContent>
          </Card>
        ) : (
          vcenters.map((vcenter) => {
            const vcenterClusters = filteredClusters.filter(c => c.vcenter_id === vcenter.id);
            const lastSyncTime = lastSync[vcenter.id];
            const isRecent = lastSyncTime && 
              Date.now() - new Date(lastSyncTime).getTime() < 60 * 60 * 1000;

            return (
              <Card key={vcenter.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle>{vcenter.name}</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {vcenter.hostname}
                        </div>
                      </div>
                    </div>
                    <Badge variant={isRecent ? "default" : "outline"}>
                      {isRecent ? "Synced" : "Needs Sync"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {vcenterClusters.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-medium mb-2">No Clusters Found</h4>
                      <p className="text-sm text-muted-foreground">
                        Sync this vCenter to discover clusters and hosts
                      </p>
                      <Button variant="outline" size="sm" className="mt-4 flex-shrink-0">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span className="whitespace-nowrap">Sync Now</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Cluster Summary */}
                      <div className="grid grid-cols-3 gap-4 text-center border rounded-lg p-4">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {vcenterClusters.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Clusters</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {vcenterClusters.reduce((sum, c) => sum + c.active_hosts, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Active Hosts</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {vcenterClusters.reduce((sum, c) => sum + c.total_hosts, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Hosts</div>
                        </div>
                      </div>

                      {/* Cluster List */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Clusters</h4>
                        {vcenterClusters.map((cluster) => (
                          <div key={cluster.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Database className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{cluster.name}</span>
                                <div className="text-sm text-muted-foreground">
                                  {cluster.active_hosts}/{cluster.total_hosts} hosts active
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cluster.ha_enabled && (
                                <Badge variant="outline" className="text-xs">HA</Badge>
                              )}
                              {cluster.drs_enabled && (
                                <Badge variant="outline" className="text-xs">DRS</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {lastSyncTime && (
                        <div className="text-sm text-muted-foreground">
                          Last synchronized {formatDistanceToNow(new Date(lastSyncTime))} ago
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}