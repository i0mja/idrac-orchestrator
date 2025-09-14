import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import {
  Calendar,
  Clock,
  Server,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  Zap,
  Building2,
  Eye,
  Edit,
  Trash2,
  FileText,
  Shield
} from "lucide-react";

interface UpdateJob {
  id: string;
  server_id: string;
  firmware_package_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  logs: string | null;
  created_by: string;
  created_at: string;
  server?: {
    hostname: string;
    model: string;
    datacenter: string;
    ip_address: string;
  };
  firmware_package?: {
    name: string;
    version: string;
    component_name: string;
    firmware_type: string;
  };
}

interface MaintenanceWindow {
  id: string;
  name: string;
  datacenter_id: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string; // Allow any string value from database
  max_concurrent_updates: number;
  description: string | null;
  datacenter?: {
    name: string;
    location: string;
  };
}

interface SchedulerMetrics {
  totalJobs: number;
  activeJobs: number;
  scheduledJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeWindows: number;
  scheduledWindows: number;
}

export function UpdateScheduler() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SchedulerMetrics>({
    totalJobs: 0,
    activeJobs: 0,
    scheduledJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    activeWindows: 0,
    scheduledWindows: 0
  });
  const [updateJobs, setUpdateJobs] = useState<UpdateJob[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [isCreateJobDialogOpen, setIsCreateJobDialogOpen] = useState(false);
  const [isCreateWindowDialogOpen, setIsCreateWindowDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<UpdateJob | null>(null);
  
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch update jobs with related server and firmware package data
      const { data: jobs, error: jobsError } = await supabase
        .from('update_jobs')
        .select(`
          *,
          servers:server_id (
            hostname,
            model,
            datacenter,
            ip_address
          ),
          firmware_packages:firmware_package_id (
            name,
            version,
            component_name,
            firmware_type
          )
        `)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch maintenance windows with datacenter info
      const { data: windows, error: windowsError } = await supabase
        .from('maintenance_windows')
        .select(`
          *,
          datacenters:datacenter_id (
            name,
            location
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (windowsError) throw windowsError;

      setUpdateJobs(jobs || []);
      setMaintenanceWindows(windows || []);

      // Calculate metrics
      const totalJobs = jobs?.length || 0;
      const activeJobs = jobs?.filter(j => j.status === 'running').length || 0;
      const scheduledJobs = jobs?.filter(j => j.status === 'pending').length || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0;

      const now = new Date();
      const activeWindows = windows?.filter(w => {
        if (w.status !== 'active') return false;
        const windowDate = new Date(w.scheduled_date);
        return windowDate.toDateString() === now.toDateString();
      }).length || 0;

      const scheduledWindows = windows?.filter(w => 
        w.status === 'scheduled' && new Date(w.scheduled_date) > now
      ).length || 0;

      setMetrics({
        totalJobs,
        activeJobs,
        scheduledJobs,
        completedJobs,
        failedJobs,
        activeWindows,
        scheduledWindows
      });

    } catch (error) {
      console.error('Error fetching scheduler data:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduler data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJobAction = async (jobId: string, action: 'start' | 'pause' | 'cancel') => {
    try {
      let newStatus: UpdateJob['status'];
      
      switch (action) {
        case 'start':
          newStatus = 'running';
          break;
        case 'pause':
          newStatus = 'pending';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('update_jobs')
        .update({ 
          status: newStatus,
          ...(action === 'start' && { started_at: new Date().toISOString() }),
          ...(action === 'cancel' && { completed_at: new Date().toISOString() })
        })
        .eq('id', jobId);

      if (error) throw error;

      // Log system event
      await supabase
        .from('system_events')
        .insert({
          title: `Update Job ${action}`,
          description: `Job ${jobId} was ${action}ed`,
          event_type: 'update_job_action',
          severity: action === 'cancel' ? 'warning' : 'info',
          metadata: { job_id: jobId, action }
        });

      toast({
        title: `Job ${action}ed`,
        description: `Update job has been ${action}ed successfully`
      });

      fetchData();
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: `Failed to ${action} job`,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: UpdateJob['status']) => {
    const statusConfig = {
      pending: { variant: "outline" as const, label: "Pending", className: "" },
      running: { variant: "default" as const, label: "Running", className: "bg-blue-500" },
      completed: { variant: "default" as const, label: "Completed", className: "bg-green-500" },
      failed: { variant: "destructive" as const, label: "Failed", className: "" },
      cancelled: { variant: "outline" as const, label: "Cancelled", className: "" }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className || ""}>
        {config.label}
      </Badge>
    );
  };

  const getWindowStatusBadge = (window: MaintenanceWindow) => {
    const now = new Date();
    const windowDate = new Date(window.scheduled_date);
    
    if (window.status === 'active' && windowDate.toDateString() === now.toDateString()) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (window.status === 'scheduled' && windowDate > now) {
      return <Badge className="bg-blue-500">Scheduled</Badge>;
    }
    if (window.status === 'completed') {
      return <Badge variant="outline">Completed</Badge>;
    }
    if (window.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    
    return <Badge variant="outline">{window.status}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted/20 rounded-lg w-64" />
            <div className="h-5 bg-muted/20 rounded-lg w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-gradient">Update Scheduler</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage firmware updates, maintenance windows, and orchestrated deployments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateJobDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Update
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              All update jobs
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.scheduledJobs}</div>
            <p className="text-xs text-muted-foreground">
              Pending execution
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs">Update Jobs</TabsTrigger>
          <TabsTrigger value="windows">Maintenance Windows</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Update Jobs ({updateJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {updateJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Update Jobs</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule your first firmware update to get started
                  </p>
                  <Button onClick={() => setIsCreateJobDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Update
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Server</TableHead>
                        <TableHead>Package</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {updateJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{job.server?.hostname || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">
                                {job.server?.model} • {job.server?.datacenter}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{job.firmware_package?.name || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">
                                {job.firmware_package?.component_name} v{job.firmware_package?.version}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress value={job.progress} className="w-16" />
                              <span className="text-xs text-muted-foreground">{job.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {job.scheduled_at ? format(new Date(job.scheduled_at), 'MMM dd, HH:mm') : 'Not scheduled'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {job.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleJobAction(job.id, 'start')}
                                >
                                  <Play className="w-3 h-3" />
                                </Button>
                              )}
                              {job.status === 'running' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleJobAction(job.id, 'pause')}
                                >
                                  <Pause className="w-3 h-3" />
                                </Button>
                              )}
                              {(job.status === 'pending' || job.status === 'running') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleJobAction(job.id, 'cancel')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedJob(job)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="windows" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Maintenance Windows ({maintenanceWindows.length})
                </CardTitle>
                <Button onClick={() => setIsCreateWindowDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Window
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {maintenanceWindows.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Maintenance Windows</h3>
                  <p className="text-muted-foreground mb-4">
                    Create maintenance windows to schedule coordinated updates
                  </p>
                  <Button onClick={() => setIsCreateWindowDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Window
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceWindows.map((window) => (
                    <Card key={window.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{window.name}</h4>
                              {getWindowStatusBadge(window)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>📅 {format(new Date(window.scheduled_date), 'EEEE, MMMM dd, yyyy')}</div>
                              <div>🕒 {window.start_time} - {window.end_time}</div>
                              <div>🏢 {window.datacenter?.name} ({window.datacenter?.location})</div>
                              <div>⚡ Max concurrent: {window.max_concurrent_updates}</div>
                              {window.description && (
                                <div>📝 {window.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Job Dialog */}
      <Dialog open={isCreateJobDialogOpen} onOpenChange={setIsCreateJobDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Update Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Job Name</Label>
              <Input placeholder="Enter job name" />
            </div>
            <div>
              <Label>Server</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Firmware Package</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bios">BIOS Update v2.1</SelectItem>
                  <SelectItem value="idrac">iDRAC Update v5.2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule</Label>
              <Input type="datetime-local" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCreateJobDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  toast({
                    title: "Job Scheduled",
                    description: "Update job has been scheduled successfully"
                  });
                  setIsCreateJobDialogOpen(false);
                }}
              >
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Maintenance Window Dialog */}
      <Dialog open={isCreateWindowDialogOpen} onOpenChange={setIsCreateWindowDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Maintenance Window</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Window Name</Label>
              <Input placeholder="Enter window name" />
            </div>
            <div>
              <Label>Datacenter</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select datacenter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dc1">DC1-East</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" defaultValue="02:00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>End Time</Label>
                <Input type="time" defaultValue="06:00" />
              </div>
              <div>
                <Label>Max Concurrent</Label>
                <Input type="number" defaultValue="3" min="1" max="10" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Optional description" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCreateWindowDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  toast({
                    title: "Window Created",
                    description: "Maintenance window has been created successfully"
                  });
                  setIsCreateWindowDialogOpen(false);
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Details Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Job Details - {selectedJob.server?.hostname}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedJob.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Progress</Label>
                  <div className="mt-1">
                    <Progress value={selectedJob.progress} className="w-full" />
                    <span className="text-xs text-muted-foreground">{selectedJob.progress}%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="text-sm">{format(new Date(selectedJob.created_at), 'MMM dd, yyyy HH:mm')}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Started</Label>
                  <div className="text-sm">
                    {selectedJob.started_at ? format(new Date(selectedJob.started_at), 'MMM dd, yyyy HH:mm') : 'Not started'}
                  </div>
                </div>
              </div>
              
              {selectedJob.error_message && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{selectedJob.error_message}</AlertDescription>
                </Alert>
              )}

              {selectedJob.logs && (
                <div>
                  <Label className="text-sm font-medium">Logs</Label>
                  <Textarea 
                    value={selectedJob.logs} 
                    readOnly 
                    className="mt-1 h-32 font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}