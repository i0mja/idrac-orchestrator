import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useServers } from "@/hooks/useServers";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { formatDistanceToNow } from "date-fns";
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
  TrendingUp
} from "lucide-react";
import { useDashboardActions, type Action } from './_widgetActions';

export function DashboardOverview() {
  const { servers, loading: serversLoading } = useServers();
  const { jobs, loading: jobsLoading } = useUpdateJobs();
  const { packages } = useFirmwarePackages();
  const { doAction } = useDashboardActions();

  // Calculate real statistics
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;

  // Get recent jobs (last 4)
  const recentJobs = jobs.slice(0, 4);

  const stats: Array<{title:string;value:string;change:string;icon:any;color:string;action:Action}> = [
    {
      title: "Total Servers",
      value: totalServers.toString(),
      change: servers.filter(s => {
        if (!s.created_at) return false;
        const createdDate = new Date(s.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate > weekAgo;
      }).length > 0 ? `+${servers.filter(s => {
        if (!s.created_at) return false;
        const createdDate = new Date(s.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate > weekAgo;
      }).length}` : "0",
      icon: Server,
      color: "text-primary",
      action: { type: 'navigate', path: '/inventory' }
    },
    {
      title: "Online Servers",
      value: onlineServers.toString(),
      change: `${Math.round((onlineServers / (totalServers || 1)) * 100)}%`,
      icon: CheckCircle,
      color: "text-success",
      action: { type: 'navigate', path: '/inventory', params: { status: 'online' } }
    },
    {
      title: "Pending Updates",
      value: pendingJobs.toString(),
      change: pendingJobs > 0 ? `${pendingJobs} waiting` : "None",
      icon: Download,
      color: "text-warning",
      action: { type: 'navigate', path: '/scheduler', params: { tab: 'history' } }
    },
    {
      title: "Failed Jobs",
      value: failedJobs.toString(),
      change: failedJobs > 0 ? "Need attention" : "All good",
      icon: XCircle,
      color: failedJobs > 0 ? "text-error" : "text-success",
      action: { type: 'navigate', path: '/scheduler', params: { tab: 'history', status: 'failed' } }
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

  const calculateUptime = () => {
    if (totalServers === 0) return 0;
    return Math.round((onlineServers / totalServers) * 100);
  };

  const uptime = calculateUptime();

  if (serversLoading || jobsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Real-time infrastructure monitoring and fleet management
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="card-enterprise"
              role="button"
              tabIndex={0}
              onClick={() => doAction(stat.action)}
            >
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
        {/* Recent Jobs */}
        <Card className="card-enterprise lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Command Executions ({recentJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-subtle border border-border/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-foreground">{job.server?.hostname || 'Unknown Server'}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Command: {job.firmware_package?.name || 'Remote Command'} 
                        {job.firmware_package?.version && ` v${job.firmware_package.version}`}
                      </p>
                      {job.progress && job.progress > 0 && (
                        <div className="flex items-center gap-2 mb-1">
                          <Progress value={job.progress} className="w-32 h-1" />
                          <span className="text-xs text-muted-foreground">{job.progress}%</span>
                        </div>
                      )}
                      {job.error_message && (
                        <p className="text-sm text-destructive mt-1 font-medium">{job.error_message}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {job.completed_at 
                          ? formatDistanceToNow(new Date(job.completed_at)) + ' ago'
                          : job.started_at 
                          ? 'Running'
                          : 'Scheduled'
                        }
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No recent command executions</p>
                  <p className="text-sm text-muted-foreground mt-1">Execute remote commands to see activity here</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full mt-6 bg-gradient-subtle">
              View Command History
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced System Health */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Infrastructure Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Fleet Availability</span>
                  <span className={uptime > 90 ? "text-success font-semibold" : uptime > 70 ? "text-warning font-semibold" : "text-error font-semibold"}>
                    {uptime}%
                  </span>
                </div>
                <Progress value={uptime} className="h-3 bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">
                  {onlineServers} of {totalServers} servers online
                </p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Command Success Rate</span>
                  <span className={
                    jobs.length === 0 ? "text-muted-foreground" :
                    ((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100) > 80 ? "text-success font-semibold" : "text-warning font-semibold"
                  }>
                    {jobs.length === 0 ? "No data" : `${Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)}%`}
                  </span>
                </div>
                <Progress 
                  value={jobs.length === 0 ? 0 : (jobs.filter(j => j.status === 'completed').length / jobs.length) * 100} 
                  className="h-3 bg-muted" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {jobs.filter(j => j.status === 'completed').length} successful of {jobs.length} total commands
                </p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Firmware Packages</span>
                  <span className="text-success font-semibold">{packages.length} available</span>
                </div>
                <Progress value={packages.length > 0 ? 100 : 0} className="h-3 bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">
                  Ready for deployment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-center p-3 rounded-lg bg-gradient-subtle">
                <Cpu className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="font-bold text-lg">{jobs.filter(j => j.status === 'running').length}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-subtle">
                <HardDrive className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Discovered</p>
                <p className="font-bold text-lg">{servers.filter(s => s.last_discovered).length}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-subtle">
                <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Healthy</p>
                <p className="font-bold text-lg">{onlineServers}</p>
              </div>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-16 flex flex-col gap-2 bg-gradient-primary">
              <Server className="w-5 h-5" />
              <span>Discover Servers</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <Download className="w-5 h-5" />
              <span>Schedule Commands</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>View Alerts</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}