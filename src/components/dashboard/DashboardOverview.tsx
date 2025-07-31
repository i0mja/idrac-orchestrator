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
  RefreshCw
} from "lucide-react";

export function DashboardOverview() {
  const { servers, loading: serversLoading } = useServers();
  const { jobs, loading: jobsLoading } = useUpdateJobs();
  const { packages } = useFirmwarePackages();

  // Calculate real statistics
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;

  // Get recent jobs (last 4)
  const recentJobs = jobs.slice(0, 4);

  const stats = [
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
      color: "text-primary"
    },
    {
      title: "Online Servers", 
      value: onlineServers.toString(),
      change: `${Math.round((onlineServers / (totalServers || 1)) * 100)}%`,
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "Pending Updates",
      value: pendingJobs.toString(),
      change: pendingJobs > 0 ? `${pendingJobs} waiting` : "None",
      icon: Download,
      color: "text-warning"
    },
    {
      title: "Failed Jobs",
      value: failedJobs.toString(),
      change: failedJobs > 0 ? "Need attention" : "All good",
      icon: XCircle,
      color: failedJobs > 0 ? "text-error" : "text-success"
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
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Update Jobs ({recentJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{job.server?.hostname || 'Unknown Server'}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {job.firmware_package?.name} v{job.firmware_package?.version}
                      </p>
                      {job.error_message && (
                        <p className="text-sm text-destructive mt-1">{job.error_message}</p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {job.completed_at 
                        ? formatDistanceToNow(new Date(job.completed_at)) + ' ago'
                        : job.started_at 
                        ? 'Running'
                        : 'Scheduled'
                      }
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent update jobs</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Jobs
            </Button>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Server Uptime</span>
                  <span className={uptime > 90 ? "text-success" : uptime > 70 ? "text-warning" : "text-error"}>
                    {uptime}%
                  </span>
                </div>
                <Progress value={uptime} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Firmware Packages</span>
                  <span className="text-success">{packages.length} available</span>
                </div>
                <Progress value={packages.length > 0 ? 100 : 0} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Job Success Rate</span>
                  <span className={
                    jobs.length === 0 ? "text-muted-foreground" :
                    ((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100) > 80 ? "text-success" : "text-warning"
                  }>
                    {jobs.length === 0 ? "No data" : `${Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)}%`}
                  </span>
                </div>
                <Progress 
                  value={jobs.length === 0 ? 0 : (jobs.filter(j => j.status === 'completed').length / jobs.length) * 100} 
                  className="h-2" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <Cpu className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">Running Jobs</p>
                <p className="font-semibold">{jobs.filter(j => j.status === 'running').length}</p>
              </div>
              <div className="text-center">
                <HardDrive className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">Discovered</p>
                <p className="font-semibold">{servers.filter(s => s.last_discovered).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}