import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  Clock, 
  Bell, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Server,
  Calendar,
  Zap
} from "lucide-react";

interface SchedulerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SchedulerSettings {
  auto_orchestration_enabled: boolean;
  max_concurrent_jobs: number;
  job_timeout_minutes: number;
  retry_failed_jobs: boolean;
  max_retry_attempts: number;
  maintenance_window_buffer_minutes: number;
  notification_settings: {
    email_notifications: boolean;
    slack_notifications: boolean;
    job_start_notifications: boolean;
    job_completion_notifications: boolean;
    job_failure_notifications: boolean;
  };
  safety_settings: {
    require_approval_for_critical: boolean;
    prevent_concurrent_updates_same_server: boolean;
    enforce_maintenance_windows: boolean;
    rollback_on_failure: boolean;
  };
}

const DEFAULT_SETTINGS: SchedulerSettings = {
  auto_orchestration_enabled: true,
  max_concurrent_jobs: 5,
  job_timeout_minutes: 60,
  retry_failed_jobs: true,
  max_retry_attempts: 3,
  maintenance_window_buffer_minutes: 30,
  notification_settings: {
    email_notifications: true,
    slack_notifications: false,
    job_start_notifications: true,
    job_completion_notifications: true,
    job_failure_notifications: true,
  },
  safety_settings: {
    require_approval_for_critical: true,
    prevent_concurrent_updates_same_server: true,
    enforce_maintenance_windows: false,
    rollback_on_failure: true,
  }
};

export function SchedulerSettingsDialog({ open, onOpenChange }: SchedulerSettingsDialogProps) {
  const [settings, setSettings] = useState<SchedulerSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'scheduler_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.value as any) });
      }
    } catch (error) {
      console.error('Error loading scheduler settings:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduler settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'scheduler_settings',
          value: settings as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Log the settings change
      await supabase
        .from('system_events')
        .insert({
          title: 'Scheduler Settings Updated',
          description: 'Scheduler configuration has been updated',
          event_type: 'settings_change',
          severity: 'info',
          metadata: { settings: JSON.stringify(settings) } as any
        });

      toast({
        title: "Settings Saved",
        description: "Scheduler settings have been updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving scheduler settings:', error);
      toast({
        title: "Error",
        description: "Failed to save scheduler settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<SchedulerSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updateNotificationSettings = (updates: Partial<SchedulerSettings['notification_settings']>) => {
    setSettings(prev => ({
      ...prev,
      notification_settings: { ...prev.notification_settings, ...updates }
    }));
  };

  const updateSafetySettings = (updates: Partial<SchedulerSettings['safety_settings']>) => {
    setSettings(prev => ({
      ...prev,
      safety_settings: { ...prev.safety_settings, ...updates }
    }));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Settings className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading settings...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Settings className="w-6 h-6 text-primary" />
            Scheduler Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-2">
              <Shield className="w-4 h-4" />
              Safety
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Zap className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Job Execution Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-orchestration">Auto-Orchestration</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically process and execute queued jobs
                    </p>
                  </div>
                  <Switch
                    id="auto-orchestration"
                    checked={settings.auto_orchestration_enabled}
                    onCheckedChange={(checked) => updateSettings({ auto_orchestration_enabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-concurrent">Max Concurrent Jobs</Label>
                    <Input
                      id="max-concurrent"
                      type="number"
                      min="1"
                      max="20"
                      value={settings.max_concurrent_jobs}
                      onChange={(e) => updateSettings({ max_concurrent_jobs: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Job Timeout (minutes)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="15"
                      max="480"
                      value={settings.job_timeout_minutes}
                      onChange={(e) => updateSettings({ job_timeout_minutes: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="retry-failed">Retry Failed Jobs</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed jobs with exponential backoff
                    </p>
                  </div>
                  <Switch
                    id="retry-failed"
                    checked={settings.retry_failed_jobs}
                    onCheckedChange={(checked) => updateSettings({ retry_failed_jobs: checked })}
                  />
                </div>

                {settings.retry_failed_jobs && (
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">Max Retry Attempts</Label>
                    <Select 
                      value={settings.max_retry_attempts.toString()} 
                      onValueChange={(value) => updateSettings({ max_retry_attempts: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 attempt</SelectItem>
                        <SelectItem value="2">2 attempts</SelectItem>
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Maintenance Windows
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buffer">Buffer Time (minutes)</Label>
                  <p className="text-sm text-muted-foreground">
                    Time buffer before and after maintenance windows
                  </p>
                  <Input
                    id="buffer"
                    type="number"
                    min="0"
                    max="120"
                    value={settings.maintenance_window_buffer_minutes}
                    onChange={(e) => updateSettings({ maintenance_window_buffer_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.notification_settings.email_notifications}
                    onCheckedChange={(checked) => updateNotificationSettings({ email_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="slack-notifications">Slack Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications to Slack channels</p>
                  </div>
                  <Switch
                    id="slack-notifications"
                    checked={settings.notification_settings.slack_notifications}
                    onCheckedChange={(checked) => updateNotificationSettings({ slack_notifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="job-start">Job Start Notifications</Label>
                  <Switch
                    id="job-start"
                    checked={settings.notification_settings.job_start_notifications}
                    onCheckedChange={(checked) => updateNotificationSettings({ job_start_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="job-completion">Job Completion Notifications</Label>
                  <Switch
                    id="job-completion"
                    checked={settings.notification_settings.job_completion_notifications}
                    onCheckedChange={(checked) => updateNotificationSettings({ job_completion_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="job-failure">Job Failure Notifications</Label>
                  <Switch
                    id="job-failure"
                    checked={settings.notification_settings.job_failure_notifications}
                    onCheckedChange={(checked) => updateNotificationSettings({ job_failure_notifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Settings */}
          <TabsContent value="safety" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Safety Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-approval">Require Approval for Critical Operations</Label>
                    <p className="text-sm text-muted-foreground">
                      Critical operations need manual approval before execution
                    </p>
                  </div>
                  <Switch
                    id="require-approval"
                    checked={settings.safety_settings.require_approval_for_critical}
                    onCheckedChange={(checked) => updateSafetySettings({ require_approval_for_critical: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="prevent-concurrent">Prevent Concurrent Updates on Same Server</Label>
                    <p className="text-sm text-muted-foreground">
                      Only allow one update operation per server at a time
                    </p>
                  </div>
                  <Switch
                    id="prevent-concurrent"
                    checked={settings.safety_settings.prevent_concurrent_updates_same_server}
                    onCheckedChange={(checked) => updateSafetySettings({ prevent_concurrent_updates_same_server: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enforce-windows">Enforce Maintenance Windows</Label>
                    <p className="text-sm text-muted-foreground">
                      Only execute jobs during designated maintenance windows
                    </p>
                  </div>
                  <Switch
                    id="enforce-windows"
                    checked={settings.safety_settings.enforce_maintenance_windows}
                    onCheckedChange={(checked) => updateSafetySettings({ enforce_maintenance_windows: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="rollback-failure">Auto-Rollback on Failure</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically rollback changes when operations fail
                    </p>
                  </div>
                  <Switch
                    id="rollback-failure"
                    checked={settings.safety_settings.rollback_on_failure}
                    onCheckedChange={(checked) => updateSafetySettings({ rollback_on_failure: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {settings.safety_settings.require_approval_for_critical && (
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Critical operations will be queued for approval. Configure approval workflows in the system settings.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Advanced Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Advanced scheduler configuration</p>
                  <p className="text-sm">Additional settings for power users</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}