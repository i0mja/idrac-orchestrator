import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  Download, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Cpu,
  HardDrive
} from "lucide-react";

export function DashboardOverview() {
  const stats = [
    {
      title: "Total Servers",
      value: "247",
      change: "+12",
      icon: Server,
      color: "text-primary"
    },
    {
      title: "Online Servers", 
      value: "239",
      change: "+5",
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "Pending Updates",
      value: "23",
      change: "-8",
      icon: Download,
      color: "text-warning"
    },
    {
      title: "Failed Jobs",
      value: "3",
      change: "+1",
      icon: XCircle,
      color: "text-error"
    }
  ];

  const recentJobs = [
    { id: "1", server: "ESXi-PROD-01", status: "completed", firmware: "iDRAC 6.10.30.00", time: "2 hours ago" },
    { id: "2", server: "ESXi-PROD-02", status: "running", firmware: "BIOS 2.18.0", time: "Running" },
    { id: "3", server: "ESXi-DEV-01", status: "failed", firmware: "iDRAC 6.10.30.00", time: "4 hours ago" },
    { id: "4", server: "ESXi-PROD-03", status: "pending", firmware: "PERC H755 51.15.0-4296", time: "Scheduled" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="status-online">Completed</Badge>;
      case "running": return <Badge className="status-updating">Running</Badge>;
      case "failed": return <Badge className="status-offline">Failed</Badge>;
      case "pending": return <Badge className="status-warning">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
                      <span className="text-sm text-success">({stat.change})</span>
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
              Recent Update Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{job.server}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{job.firmware}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{job.time}</span>
                </div>
              ))}
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
                  <span>iDRAC Connectivity</span>
                  <span className="text-success">98.7%</span>
                </div>
                <Progress value={98.7} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>vCenter Sync</span>
                  <span className="text-success">100%</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Scheduler Status</span>
                  <span className="text-warning">85.2%</span>
                </div>
                <Progress value={85.2} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <Cpu className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">CPU Load</p>
                <p className="font-semibold">23%</p>
              </div>
              <div className="text-center">
                <HardDrive className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">Memory</p>
                <p className="font-semibold">67%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}