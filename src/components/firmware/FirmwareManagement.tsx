import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Upload, 
  Package, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Play
} from "lucide-react";

export function FirmwareManagement() {
  const firmwarePackages = [
    {
      id: "1",
      name: "iDRAC Service Module",
      version: "6.10.30.00",
      component: "iDRAC",
      size: "45.2 MB",
      date: "2024-01-15",
      applicable: 23,
      status: "available"
    },
    {
      id: "2",
      name: "PowerEdge R750 BIOS",
      version: "2.18.0",
      component: "BIOS",
      size: "12.8 MB", 
      date: "2024-01-20",
      applicable: 15,
      status: "available"
    },
    {
      id: "3",
      name: "PERC H755 Firmware",
      version: "51.15.0-4296",
      component: "Storage",
      size: "8.9 MB",
      date: "2024-01-18",
      applicable: 8,
      status: "downloading"
    }
  ];

  const updateJobs = [
    {
      id: "1",
      server: "ESXi-PROD-01",
      firmware: "iDRAC 6.10.30.00",
      progress: 100,
      status: "completed",
      startTime: "2024-01-20 14:30",
      duration: "15m 23s"
    },
    {
      id: "2", 
      server: "ESXi-PROD-02",
      firmware: "BIOS 2.18.0",
      progress: 75,
      status: "running",
      startTime: "2024-01-20 15:45",
      duration: "12m 18s"
    },
    {
      id: "3",
      server: "ESXi-DEV-01", 
      firmware: "iDRAC 6.10.30.00",
      progress: 0,
      status: "failed",
      startTime: "2024-01-20 13:15",
      duration: "5m 12s"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available": return <Badge className="status-online">Available</Badge>;
      case "downloading": return <Badge className="status-updating">Downloading</Badge>;
      case "completed": return <Badge className="status-online">Completed</Badge>;
      case "running": return <Badge className="status-updating">Running</Badge>;
      case "failed": return <Badge className="status-offline">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Firmware Management</h2>
          <p className="text-muted-foreground">Manage firmware packages and update jobs</p>
        </div>
        <Button variant="enterprise">
          <Upload className="w-4 h-4 mr-2" />
          Upload Package
        </Button>
      </div>

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packages">Firmware Packages</TabsTrigger>
          <TabsTrigger value="jobs">Update Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Available Firmware Packages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {firmwarePackages.map((pkg) => (
                  <div key={pkg.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{pkg.name}</h4>
                          {getStatusBadge(pkg.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Version {pkg.version} • {pkg.component} • {pkg.size}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pkg.applicable} servers</Badge>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Deploy
                        </Button>
                      </div>
                    </div>
                    {pkg.status === "downloading" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Downloading...</span>
                          <span>67%</span>
                        </div>
                        <Progress value={67} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Update Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {updateJobs.map((job) => (
                  <div key={job.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{job.server}</h4>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {job.firmware} • Started: {job.startTime} • Duration: {job.duration}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === "running" && (
                          <Button variant="outline" size="sm">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                        )}
                        {job.status === "completed" && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                      </div>
                    </div>
                    {job.status === "running" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Updating firmware...</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}