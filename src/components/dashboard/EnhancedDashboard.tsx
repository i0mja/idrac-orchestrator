// Enhanced: Multi-datacenter dashboard with OS distribution and EOL warnings
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  Server, 
  Download, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Cpu,
  HardDrive,
  RefreshCw,
  Building2,
  Monitor,
  Shield,
  TrendingUp,
  Globe,
  Calendar
} from "lucide-react";

export function EnhancedDashboard() {
  const { 
    servers, 
    datacenters, 
    eolAlerts, 
    loading: serversLoading,
    getEOLRiskServers,
    getExpiringServers,
    acknowledgeEOLAlert
  } = useEnhancedServers();
  const { jobs, loading: jobsLoading } = useUpdateJobs();
  const { packages } = useFirmwarePackages();
  const navigate = useNavigate();

  // Enhanced: Calculate OS distribution statistics
  const osDistribution = servers.reduce((acc, server) => {
    const os = server.operating_system || 'Unknown';
    const version = server.os_version || '';
    const key = version ? `${os} ${version}` : os;
    
    if (!acc[key]) {
      acc[key] = { count: 0, eolRisk: false };
    }
    acc[key].count++;
    
    // Check if this OS version is EOL
    if (server.os_eol_date && new Date(server.os_eol_date) <= new Date()) {
      acc[key].eolRisk = true;
    }
    
    return acc;
  }, {} as Record<string, { count: number; eolRisk: boolean }>);

  // Enhanced: Calculate datacenter health summaries
  const datacenterHealth = datacenters.map(dc => {
    const dcServers = servers.filter(s => s.site_id === dc.id);
    const onlineServers = dcServers.filter(s => s.status === 'online').length;
    const eolRiskServers = dcServers.filter(s => 
      s.os_eol_date && new Date(s.os_eol_date) <= new Date()
    ).length;
    
    return {
      ...dc,
      totalServers: dcServers.length,
      onlineServers,
      healthPercentage: dcServers.length > 0 ? Math.round((onlineServers / dcServers.length) * 100) : 0,
      eolRiskCount: eolRiskServers
    };
  });

  // Calculate real statistics
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;
  const eolRiskServers = getEOLRiskServers();
  const expiringServers = getExpiringServers(90);

  // Get recent jobs
  const recentJobs = jobs.slice(0, 4);

  // Enhanced: Multi-OS and datacenter stats
  const stats = [
    {
      title: "Total Servers",
      value: totalServers.toString(),
      change: `${datacenters.length} sites`,
      icon: Server,
      color: "text-primary"
    },
    {
      title: "Online Status", 
      value: onlineServers.toString(),
      change: `${Math.round((onlineServers / (totalServers || 1)) * 100)}% uptime`,
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "EOL Risk",
      value: eolRiskServers.length.toString(),
      change: eolRiskServers.length > 0 ? "Need attention" : "All current",
      icon: AlertTriangle,
      color: eolRiskServers.length > 0 ? "text-error" : "text-success"
    },
    {
      title: "Active Commands",
      value: pendingJobs.toString(),
      change: pendingJobs > 0 ? `${pendingJobs} executing` : "All complete",
      icon: Download,
      color: "text-warning"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="status-online">Completed</Badge>;
      case "running": return <Badge className="status-updating">Running</Badge>;
      case "failed": return <Badge className="status-offline">Failed</Badge>;
      case "pending": return <Badge className="status-warning">Pending</Badge>;
      case "cancelled": return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOSBadge = (osName: string, eolRisk: boolean) => {
    if (eolRisk) {
      return <Badge variant="destructive" className="text-xs">EOL Risk</Badge>;
    }
    if (osName.includes('CentOS 7')) {
      return <Badge variant="destructive" className="text-xs">CentOS 7 EOL</Badge>;
    }
    if (osName.includes('ESXi')) {
      return <Badge className="status-online text-xs">VMware</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{osName}</Badge>;
  };

  if (serversLoading || jobsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading enhanced dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced: EOL Warnings at top */}
      {eolAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {eolAlerts.length} servers have EOL operating systems requiring immediate attention
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate('/inventory')}>
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="card-enterprise">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">{stat.value}</h3>
                      <span className="text-sm text-muted-foreground">({stat.change})</span>
                    </div>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced: OS Distribution */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              OS Distribution ({Object.keys(osDistribution).length} variants)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(osDistribution)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 8)
                .map(([osName, data]) => (
                  <div key={osName} className="flex items-center justify-between p-3 rounded-lg bg-gradient-subtle border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{osName}</span>
                        {getOSBadge(osName, data.eolRisk)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{data.count}</span>
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${data.eolRisk ? 'bg-destructive' : 'bg-primary'}`} 
                          style={{ width: `${(data.count / totalServers) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/inventory')}>
              <Globe className="w-4 h-4 mr-2" />
              View Full Inventory
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced: Datacenter Health Summary */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Multi-Site Health ({datacenters.length} sites)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {datacenterHealth.map((dc) => (
                <div key={dc.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{dc.name}</span>
                      {dc.eolRiskCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {dc.eolRiskCount} EOL
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {dc.onlineServers}/{dc.totalServers}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={dc.healthPercentage} className="flex-1 h-2" />
                    <span className="text-xs font-medium w-10">{dc.healthPercentage}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{dc.location}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/vcenter')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Manage Sites
            </Button>
          </CardContent>
        </Card>

        {/* Recent Commands */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Commands ({recentJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-subtle border border-border/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{job.server?.hostname || 'Unknown Server'}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.firmware_package?.name || 'Remote Command'} 
                        {job.firmware_package?.version && ` v${job.firmware_package.version}`}
                      </p>
                      {job.progress && job.progress > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={job.progress} className="w-20 h-1" />
                          <span className="text-xs text-muted-foreground">{job.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No recent commands</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/scheduler')}>
              <Shield className="w-4 h-4 mr-2" />
              Command Center
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              className="h-16 flex flex-col gap-2 bg-gradient-primary"
              onClick={() => navigate('/inventory')}
            >
              <Server className="w-5 h-5" />
              <span>Global Inventory</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-2"
              onClick={() => navigate('/scheduler')}
            >
              <Download className="w-5 h-5" />
              <span>Command Control</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-2"
              onClick={() => navigate('/alerts')}
            >
              <AlertTriangle className="w-5 h-5" />
              <span>View Alerts</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-2"
              onClick={() => navigate('/vcenter')}
            >
              <Building2 className="w-5 h-5" />
              <span>Site Management</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}