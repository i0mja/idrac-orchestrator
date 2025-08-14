import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { IdmConfiguration } from "./IdmConfiguration";
import { SecuritySettings } from "./SecuritySettings";
import { 
  Settings, 
  Network, 
  Shield, 
  Bell, 
  Database, 
  HardDrive,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react";
import { TimezoneSelect } from "@/components/ui/timezone-select";

interface SystemConfig {
  organization_name: string;
  admin_email: string;
  timezone: string;
  notification_settings: {
    email_alerts: boolean;
    slack_webhook?: string;
  };
  auto_discovery: {
    enabled: boolean;
    interval_hours: number;
    ip_ranges: string[];
  };
  security: {
    require_approval: boolean;
    backup_before_update: boolean;
    max_concurrent_updates: number;
  };
}

interface VCenter {
  id: string;
  name: string;
  hostname: string;
  username: string;
  port: number;
  ignore_ssl: boolean;
  created_at: string;
}

export function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>({
    organization_name: '',
    admin_email: '',
    timezone: 'UTC',
    notification_settings: { email_alerts: true },
    auto_discovery: { enabled: true, interval_hours: 24, ip_ranges: ['192.168.1.0/24'] },
    security: { require_approval: true, backup_before_update: true, max_concurrent_updates: 5 }
  });

  const [vcenters, setVCenters] = useState<VCenter[]>([]);
  const [newVCenter, setNewVCenter] = useState({
    name: '',
    hostname: '',
    username: '',
    password: '',
    port: 443,
    ignore_ssl: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadVCenters();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value');

      if (error) throw error;

      const configMap = new Map(data?.map(item => [item.key, item.value]) || []);
      
      setConfig({
        organization_name: (configMap.get('organization_name') as string) || '',
        admin_email: (configMap.get('admin_email') as string) || '',
        timezone: (configMap.get('timezone') as string) || 'UTC',
        notification_settings: (configMap.get('notification_settings') as { email_alerts: boolean; slack_webhook?: string; }) || { email_alerts: true },
        auto_discovery: (configMap.get('auto_discovery') as { enabled: boolean; interval_hours: number; ip_ranges: string[]; }) || { enabled: true, interval_hours: 24, ip_ranges: ['192.168.1.0/24'] },
        security: (configMap.get('security_settings') as { require_approval: boolean; backup_before_update: boolean; max_concurrent_updates: number; }) || { require_approval: true, backup_before_update: true, max_concurrent_updates: 5 }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('vcenters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVCenters(data || []);
    } catch (error) {
      console.error('Error loading vCenters:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const configEntries = [
        { key: 'organization_name', value: config.organization_name },
        { key: 'admin_email', value: config.admin_email },
        { key: 'timezone', value: config.timezone },
        { key: 'notification_settings', value: config.notification_settings },
        { key: 'auto_discovery', value: config.auto_discovery },
        { key: 'security_settings', value: config.security }
      ];

      for (const entry of configEntries) {
        await supabase
          .from('system_config')
          .upsert({
            key: entry.key,
            value: entry.value,
            description: `System configuration for ${entry.key}`
          });
      }

      toast({
        title: "Settings Saved",
        description: "Your configuration has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!newVCenter.hostname || !newVCenter.username || !newVCenter.password) {
      toast({
        title: "Missing Information",
        description: "Hostname, username, and password are required for testing",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-vcenter-connection', {
        body: {
          hostname: newVCenter.hostname,
          username: newVCenter.username,
          password: newVCenter.password,
          port: newVCenter.port,
          ignore_ssl: newVCenter.ignore_ssl
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to vCenter successfully. Version: ${data.version || 'Unknown'}`,
        });
      } else if (data.isPrivateNetwork) {
        toast({
          title: "Private Network Detected",
          description: data.error,
          variant: "default",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to vCenter",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection Error",
        description: "Unable to test vCenter connection",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const addVCenter = async () => {
    if (!newVCenter.name || !newVCenter.hostname || !newVCenter.username || !newVCenter.password) {
      toast({
        title: "Validation Error",
        description: "Name, hostname, username, and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vcenters')
        .insert({
          name: newVCenter.name,
          hostname: newVCenter.hostname,
          username: newVCenter.username,
          password: newVCenter.password,
          port: newVCenter.port,
          ignore_ssl: newVCenter.ignore_ssl
        });

      if (error) throw error;

      setNewVCenter({
        name: '',
        hostname: '',
        username: '',
        password: '',
        port: 443,
        ignore_ssl: true
      });

      await loadVCenters();
      toast({
        title: "vCenter Added",
        description: "vCenter configuration has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding vCenter:', error);
      toast({
        title: "Error",
        description: "Failed to add vCenter configuration",
        variant: "destructive",
      });
    }
  };

  const removeVCenter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vcenters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadVCenters();
      toast({
        title: "vCenter Removed",
        description: "vCenter configuration has been removed.",
      });
    } catch (error) {
      console.error('Error removing vCenter:', error);
      toast({
        title: "Error",
        description: "Failed to remove vCenter configuration",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your iDRAC Updater configuration</p>
        </div>
        <Button onClick={saveSettings} disabled={isSaving} className="bg-gradient-primary">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="idm">IDM</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={config.organization_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, organization_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="admin-email">Administrator Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={config.admin_email}
                  onChange={(e) => setConfig(prev => ({ ...prev, admin_email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <TimezoneSelect
                  value={config.timezone}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, timezone: value }))}
                  placeholder="Select timezone..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Auto Discovery Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-discovery"
                  checked={config.auto_discovery.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    auto_discovery: { ...prev.auto_discovery, enabled: checked }
                  }))}
                />
                <Label htmlFor="auto-discovery">Enable automatic server discovery</Label>
              </div>
              <div>
                <Label htmlFor="discovery-interval">Discovery Interval (hours)</Label>
                <Input
                  id="discovery-interval"
                  type="number"
                  value={config.auto_discovery.interval_hours}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    auto_discovery: { ...prev.auto_discovery, interval_hours: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="ip-ranges">IP Ranges to Scan</Label>
                <Textarea
                  id="ip-ranges"
                  value={config.auto_discovery.ip_ranges.join('\n')}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    auto_discovery: { ...prev.auto_discovery, ip_ranges: e.target.value.split('\n').filter(Boolean) }
                  }))}
                  placeholder="192.168.1.0/24&#10;10.0.0.0/16"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idm" className="space-y-6">
          <IdmConfiguration />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-alerts"
                  checked={config.notification_settings.email_alerts}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    notification_settings: { ...prev.notification_settings, email_alerts: checked }
                  }))}
                />
                <Label htmlFor="email-alerts">Enable email alerts</Label>
              </div>
              <div>
                <Label htmlFor="slack-webhook">Slack Webhook URL (optional)</Label>
                <Input
                  id="slack-webhook"
                  value={config.notification_settings.slack_webhook || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notification_settings: { ...prev.notification_settings, slack_webhook: e.target.value }
                  }))}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}