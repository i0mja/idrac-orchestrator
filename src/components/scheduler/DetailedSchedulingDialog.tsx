import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Clock,
  Server,
  Users,
  AlertTriangle,
  CheckCircle,
  Building2,
  Shield,
  Zap,
  GitBranch,
  Bell,
  RefreshCw,
  Target,
  Settings,
  FileText,
  Timer,
  Mail
} from "lucide-react";

interface DetailedSchedulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleCreated?: () => void;
}

interface ScheduleForm {
  // Basic Details
  name: string;
  description: string;
  type: 'maintenance' | 'firmware_update' | 'security_patch' | 'system_reboot' | 'configuration_change' | 'backup';
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Scheduling
  scheduled_date: Date | undefined;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recurrence_end: Date | undefined;
  
  // Target Selection
  target_type: 'all_servers' | 'by_datacenter' | 'by_environment' | 'by_model' | 'custom_selection';
  selected_servers: string[];
  selected_datacenters: string[];
  selected_environments: string[];
  selected_models: string[];
  
  // Advanced Options
  max_concurrent_updates: number;
  rollback_plan: string;
  pre_update_checks: string[];
  post_update_validation: string[];
  
  // Approval & Notifications
  requires_approval: boolean;
  approver_emails: string[];
  notification_settings: {
    notify_before: number;
    notify_on_start: boolean;
    notify_on_completion: boolean;
    notify_on_failure: boolean;
  };
  
  // Safety & Compliance
  allow_during_business_hours: boolean;
  require_change_ticket: boolean;
  change_ticket_number: string;
  maintenance_window_buffer: number;
  impact_assessment: string;
}

const sanitizeMaxConcurrentUpdates = (value: number | undefined | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.floor(value));
};

const DEFAULT_FORM: ScheduleForm = {
  name: '',
  description: '',
  type: 'maintenance',
  priority: 'medium',
  scheduled_date: undefined,
  start_time: '02:00',
  end_time: '06:00',
  timezone: 'UTC',
  recurrence: 'none',
  recurrence_end: undefined,
  target_type: 'custom_selection',
  selected_servers: [],
  selected_datacenters: [],
  selected_environments: [],
  selected_models: [],
  max_concurrent_updates: 3,
  rollback_plan: '',
  pre_update_checks: ['connectivity', 'disk_space', 'backup_status'],
  post_update_validation: ['service_status', 'performance_check'],
  requires_approval: true,
  approver_emails: [],
  notification_settings: {
    notify_before: 24,
    notify_on_start: true,
    notify_on_completion: true,
    notify_on_failure: true
  },
  allow_during_business_hours: false,
  require_change_ticket: true,
  change_ticket_number: '',
  maintenance_window_buffer: 30,
  impact_assessment: ''
};

export function DetailedSchedulingDialog({ open, onOpenChange, onScheduleCreated }: DetailedSchedulingDialogProps) {
  const [form, setForm] = useState<ScheduleForm>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState('basic');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [estimatedImpact, setEstimatedImpact] = useState({ servers: 0, downtime: '0h', risk: 'low' });

  const { servers, datacenters } = useEnhancedServers();
  const { toast } = useToast();

  const safeMaxConcurrentUpdates = sanitizeMaxConcurrentUpdates(form.max_concurrent_updates);

  const updateForm = (updates: Partial<ScheduleForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const validateSchedule = async () => {
    setIsValidating(true);
    try {
      // Check for scheduling conflicts
      const { data: existingWindows, error } = await supabase
        .from('maintenance_windows')
        .select('*')
        .eq('status', 'scheduled');

      if (error) throw error;

      const newConflicts = existingWindows?.filter(window => {
        if (!form.scheduled_date) return false;
        const windowDate = new Date(window.scheduled_date);
        return windowDate.toDateString() === form.scheduled_date.toDateString();
      }) || [];

      setConflicts(newConflicts);

      // Calculate impact
      let affectedServers = [];
      switch (form.target_type) {
        case 'all_servers':
          affectedServers = servers;
          break;
        case 'custom_selection':
          affectedServers = servers.filter(s => form.selected_servers.includes(s.id));
          break;
        case 'by_datacenter':
          affectedServers = servers.filter(s => form.selected_datacenters.includes(s.datacenter || ''));
          break;
        case 'by_environment':
          affectedServers = servers.filter(s => form.selected_environments.includes(s.environment || ''));
          break;
      }

      const estimatedDowntime = Math.ceil(affectedServers.length / safeMaxConcurrentUpdates) * 30; // 30 min per batch
      const riskLevel = affectedServers.length > 50 ? 'high' : affectedServers.length > 20 ? 'medium' : 'low';

      setEstimatedImpact({
        servers: affectedServers.length,
        downtime: `${Math.floor(estimatedDowntime / 60)}h ${estimatedDowntime % 60}m`,
        risk: riskLevel
      });
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (form.scheduled_date && form.target_type) {
      validateSchedule();
    }
  }, [form.scheduled_date, form.target_type, form.selected_servers, form.selected_datacenters, form.max_concurrent_updates]);

  const handleSubmit = async () => {
    if (!form.name || !form.scheduled_date || !form.start_time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (form.requires_approval && form.approver_emails.length === 0) {
      toast({
        title: "Approval Required",
        description: "Please specify at least one approver email",
        variant: "destructive"
      });
      return;
    }

    try {
      const sanitizedMaxConcurrent = sanitizeMaxConcurrentUpdates(form.max_concurrent_updates);

      const scheduleData = {
        name: form.name,
        description: form.description,
        scheduled_date: format(form.scheduled_date, 'yyyy-MM-dd'),
        start_time: form.start_time,
        end_time: form.end_time,
        status: form.requires_approval ? 'pending_approval' : 'scheduled',
        max_concurrent_updates: sanitizedMaxConcurrent,
        metadata: {
          type: form.type,
          priority: form.priority,
          target_type: form.target_type,
          selected_servers: form.selected_servers,
          selected_datacenters: form.selected_datacenters,
          max_concurrent_updates: sanitizedMaxConcurrent,
          rollback_plan: form.rollback_plan,
          pre_update_checks: form.pre_update_checks,
          post_update_validation: form.post_update_validation,
          notification_settings: form.notification_settings,
          safety_settings: {
            allow_during_business_hours: form.allow_during_business_hours,
            require_change_ticket: form.require_change_ticket,
            change_ticket_number: form.change_ticket_number,
            maintenance_window_buffer: form.maintenance_window_buffer
          },
          impact_assessment: form.impact_assessment,
          estimated_impact: estimatedImpact,
          approver_emails: form.approver_emails
        }
      };

      const { data, error } = await supabase
        .from('maintenance_windows')
        .insert(scheduleData)
        .select()
        .single();

      if (error) throw error;

      // Log the scheduling event
      await supabase
        .from('system_events')
        .insert({
          title: `Maintenance Scheduled: ${form.name}`,
          description: `${form.type} scheduled for ${format(form.scheduled_date!, 'PPP')} affecting ${estimatedImpact.servers} servers`,
          event_type: 'maintenance_scheduled',
          severity: form.priority === 'critical' ? 'high' : 'info',
          metadata: { schedule_id: data?.id }
        });

      toast({
        title: "Schedule Created",
        description: `${form.name} has been ${form.requires_approval ? 'submitted for approval' : 'scheduled successfully'}`,
      });

      onOpenChange(false);
      setForm(DEFAULT_FORM);
      onScheduleCreated?.();

    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive"
      });
    }
  };

  const getUniqueValues = (key: keyof typeof servers[0]) => {
    return [...new Set(servers.map(s => s[key]).filter(Boolean))];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Schedule New Event
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic" className="gap-2">
              <FileText className="w-4 h-4" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="timing" className="gap-2">
              <Clock className="w-4 h-4" />
              Timing
            </TabsTrigger>
            <TabsTrigger value="targets" className="gap-2">
              <Target className="w-4 h-4" />
              Targets
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Settings className="w-4 h-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="approval" className="gap-2">
              <Users className="w-4 h-4" />
              Approval
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Review
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    placeholder="Monthly security patching"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Event Type *</Label>
                  <Select value={form.type} onValueChange={(value: any) => updateForm({ type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">General Maintenance</SelectItem>
                      <SelectItem value="firmware_update">Firmware Update</SelectItem>
                      <SelectItem value="security_patch">Security Patch</SelectItem>
                      <SelectItem value="system_reboot">System Reboot</SelectItem>
                      <SelectItem value="configuration_change">Configuration Change</SelectItem>
                      <SelectItem value="backup">Backup Operation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level *</Label>
                  <Select value={form.priority} onValueChange={(value: any) => updateForm({ priority: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of the maintenance event..."
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="impact">Impact Assessment</Label>
                  <Textarea
                    id="impact"
                    placeholder="Expected impact on services and users..."
                    value={form.impact_assessment}
                    onChange={(e) => updateForm({ impact_assessment: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timing & Scheduling Tab */}
          <TabsContent value="timing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Date & Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Scheduled Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.scheduled_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.scheduled_date ? format(form.scheduled_date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.scheduled_date}
                          onSelect={(date) => updateForm({ scheduled_date: date })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={form.start_time}
                        onChange={(e) => updateForm({ start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={form.end_time}
                        onChange={(e) => updateForm({ end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={form.timezone} onValueChange={(value) => updateForm({ timezone: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Recurrence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Repeat Schedule</Label>
                    <Select value={form.recurrence} onValueChange={(value: any) => updateForm({ recurrence: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-time event</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.recurrence !== 'none' && (
                    <div className="space-y-2">
                      <Label>Recurrence End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.recurrence_end && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.recurrence_end ? format(form.recurrence_end, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.recurrence_end}
                            onSelect={(date) => updateForm({ recurrence_end: date })}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="buffer">Buffer Time (minutes)</Label>
                    <Input
                      id="buffer"
                      type="number"
                      min="0"
                      value={form.maintenance_window_buffer}
                      onChange={(e) => updateForm({ maintenance_window_buffer: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Additional time buffer before and after the maintenance window
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {conflicts.length > 0 && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Scheduling Conflicts Detected:</strong> There are {conflicts.length} other maintenance window(s) scheduled for the same date.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Target Selection Tab */}
          <TabsContent value="targets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Target Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select value={form.target_type} onValueChange={(value: any) => updateForm({ target_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_servers">All Servers</SelectItem>
                      <SelectItem value="by_datacenter">By Datacenter</SelectItem>
                      <SelectItem value="by_environment">By Environment</SelectItem>
                      <SelectItem value="by_model">By Model</SelectItem>
                      <SelectItem value="custom_selection">Custom Selection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.target_type === 'by_datacenter' && (
                  <div className="space-y-2">
                    <Label>Select Datacenters</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {getUniqueValues('datacenter').map((datacenter) => (
                        <div key={String(datacenter)} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dc-${datacenter}`}
                            checked={form.selected_datacenters.includes(datacenter as string)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateForm({ selected_datacenters: [...form.selected_datacenters, datacenter as string] });
                              } else {
                                updateForm({ selected_datacenters: form.selected_datacenters.filter(d => d !== datacenter) });
                              }
                            }}
                          />
                          <Label htmlFor={`dc-${datacenter}`} className="text-sm">{String(datacenter)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {form.target_type === 'by_environment' && (
                  <div className="space-y-2">
                    <Label>Select Environments</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {getUniqueValues('environment').map((env) => (
                        <div key={String(env)} className="flex items-center space-x-2">
                          <Checkbox
                            id={`env-${env}`}
                            checked={form.selected_environments.includes(env as string)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateForm({ selected_environments: [...form.selected_environments, env as string] });
                              } else {
                                updateForm({ selected_environments: form.selected_environments.filter(e => e !== env) });
                              }
                            }}
                          />
                          <Label htmlFor={`env-${env}`} className="text-sm">{String(env)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {form.target_type === 'custom_selection' && (
                  <div className="space-y-2">
                    <Label>Select Servers ({form.selected_servers.length} selected)</Label>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                      {servers.map((server) => (
                        <div key={server.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            id={`server-${server.id}`}
                            checked={form.selected_servers.includes(server.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateForm({ selected_servers: [...form.selected_servers, server.id] });
                              } else {
                                updateForm({ selected_servers: form.selected_servers.filter(s => s !== server.id) });
                              }
                            }}
                          />
                          <Label htmlFor={`server-${server.id}`} className="flex-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{server.hostname}</span>
                              <Badge variant="outline" className="text-xs">{server.environment}</Badge>
                              <Badge variant="outline" className="text-xs">{server.datacenter}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{String(server.ip_address)} • {server.model}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <span>{estimatedImpact.servers} servers affected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      <span>~{estimatedImpact.downtime} estimated downtime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Risk level: {estimatedImpact.risk}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Execution Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="concurrent">Max Concurrent Updates</Label>
                    <Input
                      id="concurrent"
                      type="number"
                      min="1"
                      max="10"
                      value={form.max_concurrent_updates}
                      onChange={(e) => updateForm({ max_concurrent_updates: sanitizeMaxConcurrentUpdates(parseInt(e.target.value, 10)) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pre-Update Checks</Label>
                    <div className="space-y-2">
                      {['connectivity', 'disk_space', 'backup_status', 'service_health', 'load_average'].map((check) => (
                        <div key={check} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pre-${check}`}
                            checked={form.pre_update_checks.includes(check)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateForm({ pre_update_checks: [...form.pre_update_checks, check] });
                              } else {
                                updateForm({ pre_update_checks: form.pre_update_checks.filter(c => c !== check) });
                              }
                            }}
                          />
                          <Label htmlFor={`pre-${check}`} className="text-sm capitalize">{check.replace('_', ' ')}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Post-Update Validation</Label>
                    <div className="space-y-2">
                      {['service_status', 'performance_check', 'connectivity_test', 'application_health'].map((check) => (
                        <div key={check} className="flex items-center space-x-2">
                          <Checkbox
                            id={`post-${check}`}
                            checked={form.post_update_validation.includes(check)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateForm({ post_update_validation: [...form.post_update_validation, check] });
                              } else {
                                updateForm({ post_update_validation: form.post_update_validation.filter(c => c !== check) });
                              }
                            }}
                          />
                          <Label htmlFor={`post-${check}`} className="text-sm capitalize">{check.replace('_', ' ')}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Safety & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="business_hours">Allow During Business Hours</Label>
                    <Switch
                      id="business_hours"
                      checked={form.allow_during_business_hours}
                      onCheckedChange={(checked) => updateForm({ allow_during_business_hours: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="change_ticket">Require Change Ticket</Label>
                    <Switch
                      id="change_ticket"
                      checked={form.require_change_ticket}
                      onCheckedChange={(checked) => updateForm({ require_change_ticket: checked })}
                    />
                  </div>

                  {form.require_change_ticket && (
                    <div className="space-y-2">
                      <Label htmlFor="ticket_number">Change Ticket Number</Label>
                      <Input
                        id="ticket_number"
                        placeholder="CHG-2024-001234"
                        value={form.change_ticket_number}
                        onChange={(e) => updateForm({ change_ticket_number: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="rollback">Rollback Plan</Label>
                    <Textarea
                      id="rollback"
                      placeholder="Detailed rollback procedure if maintenance fails..."
                      value={form.rollback_plan}
                      onChange={(e) => updateForm({ rollback_plan: e.target.value })}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Approval & Notifications Tab */}
          <TabsContent value="approval" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Approval Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requires_approval">Requires Approval</Label>
                    <Switch
                      id="requires_approval"
                      checked={form.requires_approval}
                      onCheckedChange={(checked) => updateForm({ requires_approval: checked })}
                    />
                  </div>

                  {form.requires_approval && (
                    <div className="space-y-2">
                      <Label>Approver Emails</Label>
                      <div className="space-y-2">
                        {form.approver_emails.map((email, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="approver@company.com"
                              value={email}
                              onChange={(e) => {
                                const newEmails = [...form.approver_emails];
                                newEmails[index] = e.target.value;
                                updateForm({ approver_emails: newEmails });
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newEmails = form.approver_emails.filter((_, i) => i !== index);
                                updateForm({ approver_emails: newEmails });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          onClick={() => updateForm({ approver_emails: [...form.approver_emails, ''] })}
                        >
                          Add Approver
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notify_before">Notify Before (hours)</Label>
                    <Input
                      id="notify_before"
                      type="number"
                      min="1"
                      value={form.notification_settings.notify_before}
                      onChange={(e) => updateForm({
                        notification_settings: {
                          ...form.notification_settings,
                          notify_before: parseInt(e.target.value) || 1
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'notify_on_start', label: 'Notify on Start' },
                      { key: 'notify_on_completion', label: 'Notify on Completion' },
                      { key: 'notify_on_failure', label: 'Notify on Failure' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key}>{label}</Label>
                        <Switch
                          id={key}
                          checked={form.notification_settings[key as keyof typeof form.notification_settings] as boolean}
                          onCheckedChange={(checked) => updateForm({
                            notification_settings: {
                              ...form.notification_settings,
                              [key]: checked
                            }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Schedule Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Event Details</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Name:</strong> {form.name}</p>
                        <p><strong>Type:</strong> {form.type.replace('_', ' ')}</p>
                        <p><strong>Priority:</strong> {form.priority}</p>
                        <p><strong>Description:</strong> {form.description || 'None provided'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold">Schedule</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Date:</strong> {form.scheduled_date ? format(form.scheduled_date, 'PPP') : 'Not set'}</p>
                        <p><strong>Time:</strong> {form.start_time} - {form.end_time} ({form.timezone})</p>
                        <p><strong>Recurrence:</strong> {form.recurrence}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Impact Assessment</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Servers Affected:</strong> {estimatedImpact.servers}</p>
                        <p><strong>Estimated Downtime:</strong> {estimatedImpact.downtime}</p>
                        <p><strong>Risk Level:</strong> {estimatedImpact.risk}</p>
                        <p><strong>Concurrent Updates:</strong> {safeMaxConcurrentUpdates}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold">Approval & Notifications</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Requires Approval:</strong> {form.requires_approval ? 'Yes' : 'No'}</p>
                        {form.requires_approval && (
                          <p><strong>Approvers:</strong> {form.approver_emails.length} configured</p>
                        )}
                        <p><strong>Advance Notification:</strong> {form.notification_settings.notify_before} hours</p>
                      </div>
                    </div>
                  </div>
                </div>

                {conflicts.length > 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> This schedule conflicts with {conflicts.length} existing maintenance window(s). 
                      Please review and consider adjusting the timing.
                    </AlertDescription>
                  </Alert>
                )}

                {estimatedImpact.risk === 'high' && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>High Risk Detected:</strong> This maintenance affects a large number of servers ({estimatedImpact.servers}). 
                      Consider additional safety measures and approvals.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isValidating}>
                {form.requires_approval ? 'Submit for Approval' : 'Schedule Event'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}