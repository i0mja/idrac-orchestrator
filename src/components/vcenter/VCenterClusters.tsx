import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVCenterService } from "@/hooks/useVCenterService";
import { formatDistanceToNow } from "date-fns";
import { 
  Database, 
  Server, 
  Settings, 
  Shield, 
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export function VCenterClusters() {
  const { vcenters, clusters } = useVCenterService();

  const getMaintenancePolicyBadge = (policy: string) => {
    const policies = {
      'ensure_accessibility': { color: 'bg-green-100 text-green-800 border-green-300', label: 'Ensure Accessibility' },
      'quarantine': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Quarantine' },
      'shutdown': { color: 'bg-red-100 text-red-800 border-red-300', label: 'Shutdown' }
    };
    
    const policyInfo = policies[policy as keyof typeof policies] || policies.ensure_accessibility;
    
    return (
      <Badge variant="outline" className={policyInfo.color}>
        {policyInfo.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cluster Management</h2>
          <p className="text-muted-foreground">
            Manage cluster settings and maintenance policies across your vCenter infrastructure
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Clusters
        </Button>
      </div>

      {/* Cluster Cards */}
      <div className="grid gap-4">
        {clusters.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Clusters Found</h3>
              <p className="text-muted-foreground mb-4">
                Sync your vCenter connections to discover and manage clusters
              </p>
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync vCenter Data
              </Button>
            </CardContent>
          </Card>
        ) : (
          clusters.map((cluster) => {
            const vcenter = vcenters.find(vc => vc.id === cluster.vcenter_id);
            const healthPercentage = cluster.total_hosts > 0 
              ? Math.round((cluster.active_hosts / cluster.total_hosts) * 100)
              : 0;
            
            return (
              <Card key={cluster.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {cluster.name}
                          {healthPercentage === 100 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {vcenter?.name} • {cluster.active_hosts}/{cluster.total_hosts} hosts active
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      {getMaintenancePolicyBadge(cluster.maintenance_mode_policy)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cluster Status Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {cluster.total_hosts}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Hosts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {cluster.active_hosts}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Hosts</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {cluster.ha_enabled ? (
                          <Shield className="w-5 h-5 text-green-500" />
                        ) : (
                          <Shield className="w-5 h-5 text-gray-300" />
                        )}
                        <span className="text-sm font-medium">
                          {cluster.ha_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">High Availability</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {cluster.drs_enabled ? (
                          <Zap className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Zap className="w-5 h-5 text-gray-300" />
                        )}
                        <span className="text-sm font-medium">
                          {cluster.drs_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">DRS</div>
                    </div>
                  </div>

                  {/* Maintenance Policy Configuration */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Maintenance Policy
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Maintenance Mode Policy</label>
                        <Select value={cluster.maintenance_mode_policy} disabled>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ensure_accessibility">Ensure Accessibility</SelectItem>
                            <SelectItem value="quarantine">Quarantine</SelectItem>
                            <SelectItem value="shutdown">Shutdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button variant="outline" size="sm" disabled>
                          Update Policy
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      This policy determines how VMs are handled when hosts enter maintenance mode
                    </div>
                  </div>

                  {/* Host Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Host Status</h4>
                      <Badge variant="outline">
                        {healthPercentage}% Healthy
                      </Badge>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${healthPercentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cluster.active_hosts} of {cluster.total_hosts} hosts are active and healthy
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="text-sm text-muted-foreground pt-2 border-t">
                    Last updated {formatDistanceToNow(new Date(cluster.updated_at))} ago
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}