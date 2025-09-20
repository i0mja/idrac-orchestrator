import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Network, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';
import { useUnifiedDiscovery } from '@/hooks/useUnifiedDiscovery';

export function DiscoveryDashboard() {
  const { results, isDiscovering, progress, phase } = useUnifiedDiscovery();

  const stats = results?.stats;
  const trends = results?.trends;

  if (isDiscovering) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Discovery in Progress</h3>
                <p className="text-sm text-muted-foreground">{phase || 'Scanning network...'}</p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% Complete
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No discovery data available</p>
            <p className="text-sm">Start a discovery scan to see insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total Servers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalServers.toLocaleString()}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Network className="w-3 h-3 mr-1" />
            {stats.networkDiscovered} Network + {stats.omeDiscovered} OME
          </div>
          {trends && (
            <div className="flex items-center mt-2">
              {getTrendIcon(trends.discoveryGrowth)}
              <span className={`text-xs ml-1 ${getTrendColor(trends.discoveryGrowth)}`}>
                {trends.discoveryGrowth > 0 ? '+' : ''}{trends.discoveryGrowth}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Protocol Health</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Redfish</span>
              <Badge variant="outline">{stats.protocolHealth.redfish}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>WS-MAN</span>
              <Badge variant="outline">{stats.protocolHealth.wsman}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>IPMI</span>
              <Badge variant="outline">{stats.protocolHealth.ipmi}</Badge>
            </div>
          </div>
          {trends && (
            <div className="flex items-center mt-2">
              {getTrendIcon(trends.healthImprovement)}
              <span className={`text-xs ml-1 ${getTrendColor(trends.healthImprovement)}`}>
                {trends.healthImprovement > 0 ? '+' : ''}{trends.healthImprovement}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Firmware Compliance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Firmware Status</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                <span className="text-xs">Up to Date</span>
              </div>
              <Badge variant="secondary">{stats.firmwareCompliance.upToDate}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-warning" />
                <span className="text-xs">Outdated</span>
              </div>
              <Badge variant="outline">{stats.firmwareCompliance.outdated}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs">Unknown</span>
              </div>
              <Badge variant="outline">{stats.firmwareCompliance.unknown}</Badge>
            </div>
          </div>
          {trends && (
            <div className="flex items-center mt-2">
              {getTrendIcon(trends.complianceChange)}
              <span className={`text-xs ml-1 ${getTrendColor(trends.complianceChange)}`}>
                {trends.complianceChange > 0 ? '+' : ''}{trends.complianceChange}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Readiness */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Update Readiness</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                <span className="text-xs">Ready</span>
              </div>
              <Badge className="bg-success/10 text-success border-success/20">
                {stats.readinessStatus.ready}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-warning" />
                <span className="text-xs">Maintenance Req.</span>
              </div>
              <Badge variant="outline">{stats.readinessStatus.maintenanceRequired}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-destructive" />
                <span className="text-xs">Not Supported</span>
              </div>
              <Badge variant="outline">{stats.readinessStatus.notSupported}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}