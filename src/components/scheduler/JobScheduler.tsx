import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useServers } from "@/hooks/useServers";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Plus,
  RefreshCw
} from "lucide-react";

export function JobScheduler() {
  const { jobs, loading: jobsLoading, createUpdateJob } = useUpdateJobs();
  const { servers } = useServers();
  const { packages } = useFirmwarePackages();
  const { toast } = useToast();

  const [newJob, setNewJob] = useState({
    serverId: "",
    firmwarePackageId: "",
    scheduledAt: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateJob = async () => {
    if (!newJob.serverId || !newJob.firmwarePackageId) {
      toast({
        title: "Missing Information",
        description: "Please select both server and firmware package",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createUpdateJob(
        newJob.serverId, 
        newJob.firmwarePackageId, 
        newJob.scheduledAt || undefined
      );
      setNewJob({ serverId: "", firmwarePackageId: "", scheduledAt: "" });
    } finally {
      setIsCreating(false);
    }
  };

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

  const scheduledJobs = jobs.filter(job => job.scheduled_at || job.status === 'pending');
  const activeJobs = jobs.filter(job => job.status === 'running');
  const completedJobs = jobs.filter(job => job.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Scheduler</h2>
          <p className="text-muted-foreground">Schedule and manage firmware update jobs</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="enterprise">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Update Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="server">Target Server</Label>
                <Select value={newJob.serverId} onValueChange={(value) => setNewJob(prev => ({ ...prev, serverId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.hostname} ({String(server.ip_address)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="firmware">Firmware Package</Label>
                <Select value={newJob.firmwarePackageId} onValueChange={(value) => setNewJob(prev => ({ ...prev, firmwarePackageId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select firmware" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} v{pkg.version} ({pkg.firmware_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scheduledAt">Schedule Time (optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={newJob.scheduledAt}
                  onChange={(e) => setNewJob(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to start immediately</p>
              </div>
              <Button onClick={handleCreateJob} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Job
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Jobs</p>
                <h3 className="text-2xl font-bold">{scheduledJobs.length}</h3>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running Jobs</p>
                <h3 className="text-2xl font-bold">{activeJobs.length}</h3>
              </div>
              <Play className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Jobs</p>
                <h3 className="text-2xl font-bold">{completedJobs.length}</h3>
              </div>
              <Calendar className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Jobs ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading jobs...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Firmware</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.server?.hostname || 'Unknown'}</TableCell>
                    <TableCell>
                      {job.firmware_package?.name} v{job.firmware_package?.version}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      {job.scheduled_at 
                        ? formatDistanceToNow(new Date(job.scheduled_at)) + ' ago'
                        : 'Immediate'
                      }
                    </TableCell>
                    <TableCell>
                      {job.started_at 
                        ? formatDistanceToNow(new Date(job.started_at)) + ' ago'
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {job.completed_at 
                        ? formatDistanceToNow(new Date(job.completed_at)) + ' ago'
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {job.status === 'running' && (
                          <Button variant="outline" size="sm">
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {(job.status === 'pending' || job.status === 'failed') && (
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No jobs scheduled. Create your first job above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}