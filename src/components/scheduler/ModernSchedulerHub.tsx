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
import { SchedulerSettingsDialog } from "./SchedulerSettingsDialog";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import { useSchedulerHistory } from "@/hooks/useSchedulerHistory";
import { useSchedulerRealTime } from "@/hooks/useSchedulerRealTime";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEventViewOpen, setIsEventViewOpen] = useState(false);

  const { jobs, loading: jobsLoading, createRemoteCommand, cancelJob, retryJob } = useUpdateJobs();
  const { servers, datacenters } = useEnhancedServers();
  const { history, loading: historyLoading, filters, updateFilters, statistics } = useSchedulerHistory();
  const { isConnected } = useSchedulerRealTime();
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
      const targetNames = (datacenters.length > 0
        ? datacenters.map(dc => dc.name || dc.id)
        : servers.map(server => server.hostname)
      ).filter(Boolean) as string[];

      if (targetNames.length === 0) {
        toast({
          title: "No Targets Available",
          description: "Unable to initiate emergency patch without target systems",
          variant: "destructive"
        });
        return;
      }

      const commandId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `emergency-patch-${Date.now()}`;

      const command = {
        id: commandId,
        name: 'Emergency Security Patch Deployment',
        target_type: datacenters.length > 0 ? 'datacenter' : 'individual',
        target_names: targetNames,
        command_type: 'security_patch',
        command_parameters: {
          priority: 'critical',
          initiated_from: 'scheduler_hub',
          patch_type: 'emergency'
        }
      };

      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        command_id?: string;
        execution_status?: string;
        error?: string;
        details?: string;
      }>('execute-remote-command', {
        body: {
          command,
          immediate_execution: true
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.details || data.error);
      }

      const commandIdResponse = data?.command_id ?? command.id;
      const executionStatus = data?.execution_status ?? 'submitted';

      const eventDescription = `Command ${commandIdResponse} ${executionStatus}.`;

      const { error: eventError } = await supabase
        .from('system_events')
        .insert({
          title: 'Emergency Security Patch Initiated',
          description: eventDescription,
          event_type: 'emergency_patch',
          severity: 'critical'
        });

      if (eventError) {
        toast({
          title: "Emergency Patch Initiated",
          description: `${eventDescription} However, event logging failed: ${eventError.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Emergency Patch Initiated",
          description: eventDescription,
        });
      }

      loadData();
    } catch (error) {
      console.error('Error initiating emergency patch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to initiate emergency patch',
        variant: "destructive"
      });
    }
  };

  const handlePauseAllJobs = async () => {
    try {
      const runningJobIds = jobs?.filter(job => job.status === 'running').map(job => job.id) || [];
      
      if (runningJobIds.length === 0) {
        toast({
          title: "No Running Jobs",
          description: "There are no running jobs to pause",
          variant: "destructive"
        });
        return;
      }

      for (const jobId of runningJobIds) {
        await cancelJob(jobId);
      }

      toast({
        title: "Jobs Paused",
        description: `Paused ${runningJobIds.length} running job(s)`,
      });
    } catch (error) {
      console.error('Error pausing jobs:', error);
      toast({
        title: "Error",
        description: "Failed to pause running jobs",
        variant: "destructive"
      });
    }
  };

  const handleViewEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsEventViewOpen(true);
  };

  const handleEditEvent = (eventId: string) => {
    // For now, just show a toast - could implement edit functionality
    toast({
      title: "Edit Event",
      description: `Edit functionality for event ${eventId} will be implemented`,
    });
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
          <Button variant="outline" className="gap-2" onClick={() => setIsSettingsOpen(true)}>
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
        <TabsList className="grid w-full grid-cols-4">
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
                  <Button variant="outline" size="sm" onClick={handlePauseAllJobs}>
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
                          <Button size="sm" variant="outline" onClick={() => handleViewEvent(event.id)}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditEvent(event.id)}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Server Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedServers(servers.map(s => s.id))}
                  >
                    Select All ({servers.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedServers([])}
                  >
                    Clear Selection
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {servers.slice(0, 20).map((server) => (
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
                      <label htmlFor={server.id} className="text-sm flex-1 cursor-pointer">
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

            <BulkOperationsPanel selectedServers={selectedServers} servers={servers} />
          </div>
        </TabsContent>


        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* History Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="card-enterprise">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Operations</p>
                    <h3 className="text-2xl font-bold">{statistics.totalOperations}</h3>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-enterprise">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <h3 className="text-2xl font-bold text-green-600">{statistics.successRate}%</h3>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-enterprise">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed Operations</p>
                    <h3 className="text-2xl font-bold text-red-600">{statistics.failedOperations}</h3>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-enterprise">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                    <h3 className="text-2xl font-bold">{statistics.avgDurationMinutes}m</h3>
                  </div>
                  <Timer className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Filters */}
          <Card className="card-enterprise">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Operation History
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={filters.type} onValueChange={(value) => updateFilters({ type: value })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="job">Update Jobs</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="system_event">System Events</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.dateRange} onValueChange={(value) => updateFilters({ dateRange: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last 24h</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No operations found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{entry.title}</h4>
                            <Badge 
                              variant={entry.status === 'completed' ? 'default' : 
                                     entry.status === 'failed' ? 'destructive' : 'outline'}
                            >
                              {entry.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {entry.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{entry.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Started: {new Date(entry.started_at).toLocaleString()}
                            </span>
                            {entry.completed_at && (
                              <span>
                                Completed: {new Date(entry.completed_at).toLocaleString()}
                              </span>
                            )}
                            {entry.duration_minutes && (
                              <span>Duration: {entry.duration_minutes}m</span>
                            )}
                            {entry.affected_servers > 0 && (
                              <span>Servers: {entry.affected_servers}</span>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={entry.severity === 'error' ? 'destructive' : 
                                 entry.severity === 'warning' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          {entry.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {history.length > 20 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Showing first 20 of {history.length} entries
                    </div>
                  )}
                </div>
              )}
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

      {/* Settings Dialog */}
      <SchedulerSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}