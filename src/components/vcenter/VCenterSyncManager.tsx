import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVCenterService } from "@/hooks/useVCenterService";
import { formatDistanceToNow } from "date-fns";
import { 
  RefreshCw, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Server,
  AlertCircle,
  Zap,
  Settings
} from "lucide-react";

interface VCenterSyncManagerProps {
  vcenterId?: string;
  showAllVCenters?: boolean;
  compact?: boolean;
}

export function VCenterSyncManager({ 
  vcenterId, 
  showAllVCenters = false, 
  compact = false 
}: VCenterSyncManagerProps) {
  const {
    vcenters,
    clusters,
    operations,
    lastSync,
    testConnection,
    syncHosts,
    fullSync,
    getVCenterById,
    getClustersByVCenter,
    getActiveOperations,
    isVCenterBusy,
    refresh
  } = useVCenterService();

  const [selectedVCenter, setSelectedVCenter] = useState(vcenterId);

  const targetVCenters = showAllVCenters 
    ? vcenters 
    : selectedVCenter 
      ? [getVCenterById(selectedVCenter)].filter(Boolean)
      : vcenterId 
        ? [getVCenterById(vcenterId)].filter(Boolean)
        : [];

  const getStatusBadge = (vcenter: any) => {
    const busy = isVCenterBusy(vcenter.id);
    const lastSyncTime = lastSync[vcenter.id];
    const isRecent = lastSyncTime && 
      Date.now() - new Date(lastSyncTime).getTime() < 60 * 60 * 1000; // 1 hour

    if (busy) {
      return <Badge variant="secondary" className="animate-pulse">Syncing</Badge>;
    }
    
    if (isRecent) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Synced</Badge>;
    }
    
    return <Badge variant="outline">Needs Sync</Badge>;
  };

  const getOperationIcon = (operation: any) => {
    switch (operation.status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {targetVCenters.map((vcenter) => {
          const vcenterOperations = getActiveOperations(vcenter.id);
          const vcenterClusters = getClustersByVCenter(vcenter.id);
          
          return (
            <div key={vcenter.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">{vcenter.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {vcenterClusters.length} clusters
                  </div>
                </div>
                {getStatusBadge(vcenter)}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testConnection(vcenter.id)}
                  disabled={isVCenterBusy(vcenter.id)}
                >
                  <PlayCircle className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => syncHosts(vcenter.id)}
                  disabled={isVCenterBusy(vcenter.id)}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">vCenter Synchronization</h3>
          <p className="text-sm text-muted-foreground">
            Centralized management for all vCenter operations
          </p>
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Quick Actions */}
      {showAllVCenters && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Manage all vCenter connections from this central location</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  vcenters.forEach(vc => testConnection(vc.id));
                }}
                disabled={vcenters.some(vc => isVCenterBusy(vc.id))}
              >
                Test All
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  vcenters.forEach(vc => syncHosts(vc.id));
                }}
                disabled={vcenters.some(vc => isVCenterBusy(vc.id))}
              >
                Sync All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* vCenter Cards */}
      <div className="grid gap-4">
        {targetVCenters.map((vcenter) => {
          const vcenterOperations = operations.filter(op => op.vcenter_id === vcenter.id);
          const activeOperations = vcenterOperations.filter(op => op.status === 'running');
          const vcenterClusters = getClustersByVCenter(vcenter.id);
          const lastSyncTime = lastSync[vcenter.id];

          return (
            <Card key={vcenter.id} className="card-enterprise">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{vcenter.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {vcenter.hostname}:{vcenter.port}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(vcenter)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {vcenterClusters.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Clusters</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">
                      {vcenterClusters.reduce((sum, c) => sum + c.active_hosts, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Hosts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {vcenterClusters.reduce((sum, c) => sum + c.total_hosts, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Hosts</div>
                  </div>
                </div>

                {/* Last Sync Info */}
                {lastSyncTime && (
                  <div className="text-sm text-muted-foreground">
                    Last synchronized {formatDistanceToNow(new Date(lastSyncTime))} ago
                  </div>
                )}

                {/* Active Operations */}
                {activeOperations.length > 0 && (
                  <div className="space-y-2">
                    {activeOperations.map((operation) => (
                      <div key={operation.id} className="p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getOperationIcon(operation)}
                            <span className="font-medium capitalize">
                              {operation.type.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {operation.progress}%
                          </span>
                        </div>
                        <Progress value={operation.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(vcenter.id)}
                    disabled={isVCenterBusy(vcenter.id)}
                    className="flex-1"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Test Connection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncHosts(vcenter.id)}
                    disabled={isVCenterBusy(vcenter.id)}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Hosts
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => fullSync(vcenter.id)}
                    disabled={isVCenterBusy(vcenter.id)}
                    className="flex-1"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Full Sync
                  </Button>
                </div>

                {/* Recent Operations History */}
                {vcenterOperations.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2 text-sm">Recent Operations</h4>
                    <div className="space-y-1">
                      {vcenterOperations.slice(-3).map((operation) => (
                        <div key={operation.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getOperationIcon(operation)}
                            <span>{operation.type.replace('_', ' ')}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {operation.completed_at && formatDistanceToNow(new Date(operation.completed_at))} ago
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {targetVCenters.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No vCenter Connections</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure vCenter connections to start synchronizing your virtual infrastructure.
            </p>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configure vCenter
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}