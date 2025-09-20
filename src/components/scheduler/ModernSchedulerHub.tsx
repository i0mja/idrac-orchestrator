import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { supabase } from "@/integrations/supabase/client";
import { ManualUpdatePanel } from "../updates/ManualUpdatePanel";
import { DetailedSchedulingDialog } from "./DetailedSchedulingDialog";
import { 
  Calendar,
  Zap,
  Play,
  Pause,
  Clock,
  Server,
  Building2,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Settings,
  Target,
  Users,
  Layers,
  GitBranch,
  Monitor,
  ExternalLink,
  Eye,
  FileText,
  Timer,
  Rocket,
  Command,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  action: () => void;
  disabled?: boolean;
  badge?: string;
}

interface RunningJob {
  id: string;
  name: string;
  type: 'manual' | 'scheduled' | 'emergency';
  progress: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'pending';
  servers_affected: number;
  started_at: string;
  estimated_completion?: string;
}

interface ScheduledEvent {
  id: string;
  name: string;
  type: 'maintenance' | 'update' | 'patch';
  scheduled_for: string;
  servers_count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'scheduled' | 'cancelled';
  max_concurrent_updates?: number | null;
}

export function ModernSchedulerHub() {
  const [runningJobs, setRunningJobs] = useState<RunningJob[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isManualUpdateOpen, setIsManualUpdateOpen] = useState(false);
  const [isDetailedScheduleOpen, setIsDetailedScheduleOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const { jobs, loading: jobsLoading, createRemoteCommand, cancelJob, retryJob } = useUpdateJobs();
  const { servers, datacenters } = useEnhancedServers();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load running jobs from update_jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('update_jobs')
        .select(`
          *,
          server:servers(hostname, datacenter),
          firmware_package:firmware_packages(name, version)
        `)
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const runningJobsData: RunningJob[] = (jobsData || []).map(job => ({
        id: job.id,
        name: `${job.server?.hostname} - ${job.firmware_package?.name}`,
        type: job.scheduled_at ? 'scheduled' : 'manual',
        progress: job.progress || 0,
        status: job.status as RunningJob['status'],
        servers_affected: 1,
        started_at: job.started_at || job.created_at,
        estimated_completion: job.scheduled_at
      }));

      setRunningJobs(runningJobsData);

      // Load scheduled events from maintenance_windows and update_jobs
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_windows')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (maintenanceError) throw maintenanceError;

      const scheduledEventsData: ScheduledEvent[] = [
        ...(maintenanceData || []).map(window => ({
          id: window.id,
          name: window.name,
          type: 'maintenance' as const,
          scheduled_for: `${window.scheduled_date}T${window.start_time}`,
          servers_count: servers.filter(s =>
            window.datacenter_id ? s.datacenter === window.datacenter_id : true
          ).length,
          priority: 'medium' as const,
          status: 'scheduled' as const,
          max_concurrent_updates: window.max_concurrent_updates
        })),
        // Add scheduled update jobs
        ...(jobsData || [])
          .filter(job => job.scheduled_at && job.status === 'pending')
          .map(job => ({
            id: `job-${job.id}`,
            name: `Update: ${job.server?.hostname}`,
            type: 'update' as const,
            scheduled_for: job.scheduled_at,
            servers_count: 1,
            priority: 'medium' as const,
            status: 'scheduled' as const,
            max_concurrent_updates: null
          }))
      ];

      setScheduledEvents(scheduledEventsData);

    } catch (error) {
      console.error('Error loading scheduler data:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduler data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyPatch = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-remote-command', {
        body: {
          command: 'emergency_security_patch',
          target_type: 'all_servers',
          priority: 'critical'
        }
      });

      if (error) throw error;

      toast({
        title: "Emergency Patch Initiated",
        description: "Critical security patch deployment started across all servers",
      });

      await supabase
        .from('system_events')
        .insert({
          title: 'Emergency Security Patch Initiated',
          description: 'Critical security patch deployment started',
          event_type: 'emergency_patch',
          severity: 'critical'
        });

      loadData();
    } catch (error) {
      console.error('Error initiating emergency patch:', error);
      toast({
        title: "Error",
        description: "Failed to initiate emergency patch",
        variant: "destructive"
      });
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'manual-update',
      title: 'Manual Update',
      description: 'Start immediate firmware/BIOS update',
      icon: Zap,
      variant: 'default',
      action: () => setIsManualUpdateOpen(true),
    },
    {
      id: 'schedule-maintenance',
      title: 'Schedule Event',
      description: 'Create detailed maintenance schedule',
      icon: Calendar,
      variant: 'outline',
      action: () => setIsDetailedScheduleOpen(true),
    },
    {
      id: 'emergency-patch',
      title: 'Emergency Patch',
      description: 'Deploy critical security updates',
      icon: Shield,
      variant: 'destructive',
      action: handleEmergencyPatch,
      badge: 'Critical'
    },
    {
      id: 'bulk-operations',
      title: 'Bulk Operations',
      description: 'Manage multiple servers',
      icon: Layers,
      variant: 'outline',
      action: () => setActiveTab('bulk'),
      badge: `${selectedServers.length} selected`
    }
  ];

  const stats = {
    activeJobs: runningJobs.filter(j => j.status === 'running').length,
    scheduledEvents: scheduledEvents.length,
    serversInMaintenance: runningJobs.reduce((sum, job) => sum + job.servers_affected, 0),
    completionRate: runningJobs.length > 0 
      ? Math.round(runningJobs.filter(j => j.status === 'completed').length / runningJobs.length * 100)
      : 100
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-orange-500">Pending</Badge>;
      case 'running': return <Badge className="bg-blue-500">Running</Badge>;
      case 'paused': return <Badge className="bg-yellow-500">Paused</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
      case 'scheduled': return <Badge variant="outline">Scheduled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-12 bg-muted/20 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Command className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Scheduler Hub</h1>
            <p className="text-muted-foreground text-lg">
              Unified command center for updates, maintenance, and operations
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <h3 className="text-3xl font-bold text-blue-600">{stats.activeJobs}</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.serversInMaintenance} servers affected
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Events</p>
                <h3 className="text-3xl font-bold text-green-600">{stats.scheduledEvents}</h3>
                <p className="text-xs text-muted-foreground">
                  Next in {scheduledEvents[0] ? new Date(scheduledEvents[0].scheduled_for).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <h3 className="text-3xl font-bold text-purple-600">{stats.completionRate}%</h3>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Server Fleet</p>
                <h3 className="text-3xl font-bold text-orange-600">{servers.length}</h3>
                <p className="text-xs text-muted-foreground">
                  {servers.filter(s => s.status === 'online').length} online
                </p>
              </div>
              <Server className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Panel - Most Important Feature! */}
      <Card className="card-enterprise border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-6 h-6 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                onClick={action.action}
                disabled={action.disabled}
                className="h-auto p-6 flex flex-col items-center gap-3 relative"
              >
                <action.icon className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-xs opacity-80">{action.description}</div>
                </div>
                {action.badge && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                    {action.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="running" className="gap-2">
            <Activity className="w-4 h-4" />
            Running Jobs
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="w-4 h-4" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Layers className="w-4 h-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Running Jobs Summary */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Active Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {runningJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active operations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {runningJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(job.status)}
                            <span className="text-xs text-muted-foreground">
                              {job.progress}% complete
                            </span>
                          </div>
                          <Progress value={job.progress} className="mt-2" />
                        </div>
                      </div>
                    ))}
                    {runningJobs.length > 3 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('running')}
                        className="w-full"
                      >
                        View All {runningJobs.length} Operations
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming events</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsDetailedScheduleOpen(true)}
                    >
                      Schedule Event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduledEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.scheduled_for).toLocaleDateString()} at{' '}
                            {new Date(event.scheduled_for).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {event.servers_count} servers
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {event.priority}
                            </Badge>
                            {typeof event.max_concurrent_updates === 'number' && (
                              <Badge variant="outline" className="text-xs">
                                Max {event.max_concurrent_updates}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {scheduledEvents.length > 3 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('scheduled')}
                        className="w-full"
                      >
                        View All {scheduledEvents.length} Events
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Health Alert */}
          {stats.activeJobs > 5 && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>High System Activity:</strong> {stats.activeJobs} operations currently running. 
                Monitor system resources and consider scheduling additional maintenance during off-peak hours.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Running Jobs Tab */}
        <TabsContent value="running" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Active Operations
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>ETC</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs?.slice(0, 10).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">Job #{job.id.slice(-8)}</p>
                          <p className="text-xs text-muted-foreground">Server Update</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={job.progress || 0} className="w-20" />
                          <span className="text-xs">{job.progress || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {job.started_at ? new Date(job.started_at).toLocaleTimeString() : 'Not started'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {job.scheduled_at ? new Date(job.scheduled_at).toLocaleTimeString() : '--:--'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryJob(job.id)}
                            disabled={job.status === 'running'}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelJob(job.id)}
                            disabled={job.status === 'completed'}
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!jobs || jobs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No active operations
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Events Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Scheduled Events & Maintenance
                </CardTitle>
                <Button onClick={() => setIsDetailedScheduleOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule New Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Servers</TableHead>
                    <TableHead>Concurrent Limit</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {event.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(event.scheduled_for).toLocaleDateString()} at{' '}
                        {new Date(event.scheduled_for).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{event.servers_count}</TableCell>
                      <TableCell>
                        {typeof event.max_concurrent_updates === 'number'
                          ? event.max_concurrent_updates
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.priority === 'critical' ? 'destructive' : 'outline'}
                          className="capitalize"
                        >
                          {event.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {scheduledEvents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="mb-4">No scheduled events</p>
                          <Button onClick={() => setIsDetailedScheduleOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Schedule Your First Event
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Bulk Server Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-3">Server Selection</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {servers.slice(0, 10).map((server) => (
                      <div key={server.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={server.id}
                          checked={selectedServers.includes(server.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedServers([...selectedServers, server.id]);
                            } else {
                              setSelectedServers(selectedServers.filter(id => id !== server.id));
                            }
                          }}
                        />
                        <label htmlFor={server.id} className="text-sm flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{server.hostname}</span>
                            <Badge variant="outline" className="text-xs">{server.environment}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {String(server.ip_address)} • {server.datacenter}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Bulk Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      disabled={selectedServers.length === 0}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Update Firmware ({selectedServers.length} servers)
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      disabled={selectedServers.length === 0}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reboot Servers ({selectedServers.length} servers)
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      disabled={selectedServers.length === 0}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Apply Security Patches ({selectedServers.length} servers)
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      disabled={selectedServers.length === 0}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Health Check ({selectedServers.length} servers)
                    </Button>
                  </div>
                </div>
              </div>
              
              {selectedServers.length > 0 && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    {selectedServers.length} server(s) selected for bulk operations.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Operation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Operation history will be displayed here</p>
                <p className="text-sm">Track completed jobs, maintenance windows, and system changes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Update Dialog */}
      <Dialog open={isManualUpdateOpen} onOpenChange={setIsManualUpdateOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Manual Update Center
            </DialogTitle>
          </DialogHeader>
          <ManualUpdatePanel />
        </DialogContent>
      </Dialog>

      {/* Detailed Scheduling Dialog */}
      <DetailedSchedulingDialog
        open={isDetailedScheduleOpen}
        onOpenChange={setIsDetailedScheduleOpen}
        onScheduleCreated={loadData}
      />
    </div>
  );
}