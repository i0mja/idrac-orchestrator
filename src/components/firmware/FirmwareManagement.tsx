import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useServers } from "@/hooks/useServers";
import { formatDistanceToNow } from "date-fns";
import { 
  Download, 
  Upload, 
  Package, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Play,
  RefreshCw
} from "lucide-react";

export function FirmwareManagement() {
  const { packages, loading: packagesLoading } = useFirmwarePackages();
  const { jobs, loading: jobsLoading, cancelJob, retryJob } = useUpdateJobs();
  const { servers } = useServers();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available": return <Badge className="status-online">Available</Badge>;
      case "downloading": return <Badge className="status-updating">Downloading</Badge>;
      case "completed": return <Badge className="status-online">Completed</Badge>;
      case "running": return <Badge className="status-updating">Running</Badge>;
      case "failed": return <Badge className="status-offline">Failed</Badge>;
      case "pending": return <Badge className="status-warning">Pending</Badge>;
      case "cancelled": return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getApplicableServersCount = (models?: string[]) => {
    if (!models || models.length === 0) return servers.length;
    return servers.filter(server => 
      models.some(model => server.model?.includes(model))
    ).length;
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
                Available Firmware Packages ({packages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {packagesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading packages...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{pkg.name}</h4>
                            {getStatusBadge("available")}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Version {pkg.version} • {pkg.firmware_type} • {formatFileSize(pkg.file_size)}
                            {pkg.release_date && ` • Released ${formatDistanceToNow(new Date(pkg.release_date))} ago`}
                          </p>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getApplicableServersCount(pkg.applicable_models)} servers</Badge>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Deploy
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {packages.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No firmware packages</h3>
                      <p className="text-muted-foreground">Upload firmware packages to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Update Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading jobs...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{job.server?.hostname || 'Unknown Server'}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.firmware_package?.name} v{job.firmware_package?.version}
                            {job.started_at && ` • Started: ${formatDistanceToNow(new Date(job.started_at))} ago`}
                            {job.completed_at && ` • Completed: ${formatDistanceToNow(new Date(job.completed_at))} ago`}
                          </p>
                          {job.error_message && (
                            <p className="text-sm text-destructive mt-1">Error: {job.error_message}</p>
                          )}
                          {job.logs && (
                            <p className="text-xs text-muted-foreground mt-1">{job.logs}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {job.status === "running" && (
                            <Button variant="outline" size="sm" onClick={() => cancelJob(job.id)}>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                          {job.status === "failed" && (
                            <Button variant="outline" size="sm" onClick={() => retryJob(job.id)}>
                              <Play className="w-4 h-4 mr-2" />
                              Retry
                            </Button>
                          )}
                          {job.status === "completed" && (
                            <CheckCircle className="w-5 h-5 text-success" />
                          )}
                        </div>
                      </div>
                      {(job.status === "running" || job.status === "pending") && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{job.logs || 'Processing...'}</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No update jobs</h3>
                      <p className="text-muted-foreground">Deploy firmware packages to create update jobs.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}