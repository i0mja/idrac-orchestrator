import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useServers } from "@/hooks/useServers";
import { useSystemEvents } from "@/hooks/useSystemEvents";
import { useAutoOrchestration } from "@/hooks/useAutoOrchestration";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Settings,
  RefreshCw,
  Bot,
  Timer,
  Zap,
  Info,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaintenanceWindowManager } from "./MaintenanceWindowManager";
import { UpdateManagementCenter } from "./UpdateManagementCenter";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  function_name: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  success_count: number;
  failure_count: number;
}

export function JobScheduler() {
  const { servers } = useServers();
  const { events } = useSystemEvents();
  const { config: autoConfig, updateConfig, toggleAutoOrchestration } = useAutoOrchestration();
  const { toast } = useToast();
  
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock cron jobs data (in a real implementation, this would come from your cron system)
  useEffect(() => {
    const mockCronJobs: CronJob[] = [
      {
        id: "auto-orchestration",
        name: "Auto-Orchestration",
        schedule: autoConfig?.enabled ? `0 0 1 */${autoConfig.execution_interval_months || 6} *` : "disabled",
        function_name: "auto-orchestration",
        enabled: autoConfig?.enabled || false,
        last_run: "2024-01-15T02:00:00Z",
        next_run: autoConfig?.enabled ? "2024-07-01T02:00:00Z" : undefined,
        success_count: 12,
        failure_count: 1
      },
      {
        id: "health-check",
        name: "System Health Check",
        schedule: "0 */4 * * *", // Every 4 hours
        function_name: "server-health-check",
        enabled: true,
        last_run: "2024-01-30T12:00:00Z",
        next_run: "2024-01-30T16:00:00Z",
        success_count: 180,
        failure_count: 3
      },
      {
        id: "firmware-scan",
        name: "Firmware Availability Scan",
        schedule: "0 2 * * 1", // Every Monday at 2 AM
        function_name: "search-dell-firmware",
        enabled: true,
        last_run: "2024-01-29T02:00:00Z",
        next_run: "2024-02-05T02:00:00Z",
        success_count: 52,
        failure_count: 0
      }
    ];
    
    setCronJobs(mockCronJobs);
    setLoading(false);
  }, [autoConfig]);

  const getStatusBadge = (job: CronJob) => {
    if (!job.enabled) {
      return <Badge variant="outline">Disabled</Badge>;
    }
    
    const successRate = job.success_count / (job.success_count + job.failure_count);
    if (successRate >= 0.95) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Healthy</Badge>;
    } else if (successRate >= 0.8) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Warning</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Critical</Badge>;
    }
  };

  const formatCronSchedule = (schedule: string) => {
    if (schedule === "disabled") return "Disabled";
    
    const descriptions: Record<string, string> = {
      "0 0 1 */6 *": "Every 6 months on the 1st",
      "0 */4 * * *": "Every 4 hours",
      "0 2 * * 1": "Mondays at 2:00 AM"
    };
    
    return descriptions[schedule] || schedule;
  };

  const scheduledEvents = events.filter(event => 
    event.event_type.includes('orchestration') || 
    event.event_type.includes('scheduled') ||
    event.event_type.includes('maintenance')
  );

  const enabledJobs = cronJobs.filter(job => job.enabled);
  const totalExecutions = cronJobs.reduce((sum, job) => sum + job.success_count + job.failure_count, 0);
  const totalFailures = cronJobs.reduce((sum, job) => sum + job.failure_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Scheduler & Automation</h2>
          <p className="text-muted-foreground">Manage scheduled tasks, maintenance windows, and automation policies</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Cron Jobs</p>
                <h3 className="text-2xl font-bold">{enabledJobs.length}</h3>
              </div>
              <Timer className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <h3 className="text-2xl font-bold">{totalExecutions}</h3>
              </div>
              <Play className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failures</p>
                <h3 className="text-2xl font-bold text-destructive">{totalFailures}</h3>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <h3 className="text-2xl font-bold text-success">
                  {totalExecutions > 0 ? Math.round(((totalExecutions - totalFailures) / totalExecutions) * 100) : 0}%
                </h3>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Orchestration Status Alert */}
      {autoConfig && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Auto-orchestration is {autoConfig.enabled ? 'enabled' : 'disabled'}. 
                {autoConfig.enabled && ` Next execution in ${autoConfig.execution_interval_months} months.`}
              </span>
              <Button size="sm" variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
                <Settings className="w-3 h-3 mr-1" />
                Configure
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="updates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="updates" className="gap-2">
            <Zap className="w-4 h-4" />
            Update Management
          </TabsTrigger>
          <TabsTrigger value="cron" className="gap-2">
            <Timer className="w-4 h-4" />
            Scheduled Jobs
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="w-4 h-4" />
            Job History
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Clock className="w-4 h-4" />
            Maintenance Windows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-6">
          <UpdateManagementCenter />
        </TabsContent>

        <TabsContent value="cron" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Scheduled Jobs & Cron Tasks
              </CardTitle>
              <CardDescription>
                Automated tasks running on schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading scheduled jobs...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cronJobs.map((job) => {
                      const successRate = job.success_count / (job.success_count + job.failure_count);
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.name}</TableCell>
                          <TableCell className="text-sm">
                            {formatCronSchedule(job.schedule)}
                          </TableCell>
                          <TableCell>{getStatusBadge(job)}</TableCell>
                          <TableCell>
                            {job.last_run 
                              ? formatDistanceToNow(new Date(job.last_run)) + ' ago'
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            {job.next_run && job.enabled
                              ? format(new Date(job.next_run), 'MMM dd, HH:mm')
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <span className={successRate >= 0.95 ? 'text-success' : successRate >= 0.8 ? 'text-warning' : 'text-destructive'}>
                              {Math.round(successRate * 100)}%
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({job.success_count}/{job.success_count + job.failure_count})
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" disabled>
                                {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <Button variant="outline" size="sm" disabled>
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cron job management requires database-level configuration. Contact your administrator to modify job schedules.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduled Job History
              </CardTitle>
              <CardDescription>
                Recent execution history for scheduled tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledEvents.slice(0, 10).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.event_type}</TableCell>
                      <TableCell>
                        <Badge variant={event.severity === 'error' ? 'destructive' : event.severity === 'warning' ? 'secondary' : 'default'}>
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(event.created_at), 'MMM dd, HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                  {scheduledEvents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No scheduled job events found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceWindowManager servers={servers} />
        </TabsContent>
      </Tabs>

      {/* Auto-Orchestration Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto-Orchestration Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={autoConfig?.enabled || false}
                onCheckedChange={() => toggleAutoOrchestration()}
              />
              <Label>Enable Auto-Orchestration</Label>
            </div>
            
            {autoConfig?.enabled && (
              <div className="space-y-4">
                <div>
                  <Label>Execution Interval (months)</Label>
                  <Select 
                    value={autoConfig.execution_interval_months?.toString() || '6'} 
                    onValueChange={(value) => updateConfig({ execution_interval_months: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monthly</SelectItem>
                      <SelectItem value="3">Quarterly</SelectItem>
                      <SelectItem value="6">Semi-Annual</SelectItem>
                      <SelectItem value="12">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Maintenance Window Start</Label>
                  <Input
                    type="time"
                    value={autoConfig.maintenance_window_start || '02:00'}
                    onChange={(e) => updateConfig({ maintenance_window_start: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Maintenance Window End</Label>
                  <Input
                    type="time"
                    value={autoConfig.maintenance_window_end || '06:00'}
                    onChange={(e) => updateConfig({ maintenance_window_end: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Update Interval (minutes)</Label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={autoConfig.update_interval_minutes || 30}
                    onChange={(e) => updateConfig({ update_interval_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => setIsConfigDialogOpen(false)} 
              className="w-full"
            >
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}