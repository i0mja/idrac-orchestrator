import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Bell,
  Mail,
  MessageSquare,
  Slack,
  Send,
  Settings,
  Plus,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'teams' | 'webhook';
  config: any;
  enabled: boolean;
  lastUsed?: string;
}

interface NotificationRule {
  id: string;
  name: string;
  events: string[];
  channels: string[];
  template: string;
  enabled: boolean;
}

export function NotificationHub() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isTestingChannel, setIsTestingChannel] = useState<string | null>(null);
  const [newChannel, setNewChannel] = useState<{
    name: string;
    type: 'email' | 'slack' | 'teams' | 'webhook';
    config: any;
  }>({
    name: '',
    type: 'email',
    config: {}
  });
  const { toast } = useToast();

  useEffect(() => {
    loadChannels();
    loadRules();
  }, []);

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const mappedChannels = (data || []).map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.channel_type as 'email' | 'slack' | 'teams' | 'webhook',
        config: channel.configuration as any,
        enabled: channel.is_active
      }));
      
      setChannels(mappedChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadRules = async () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('notification-rules');
    if (saved) {
      try {
        setRules(JSON.parse(saved));
      } catch {
        setRules([]);
      }
    }
  };

  const createChannel = async () => {
    if (!newChannel.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          name: newChannel.name,
          channel_type: newChannel.type,
          configuration: newChannel.config,
          organization_id: '00000000-0000-0000-0000-000000000000' // Use proper org ID in production
        })
        .select()
        .single();

      if (error) throw error;

      const mappedChannel = {
        id: data.id,
        name: data.name,
        type: data.channel_type as 'email' | 'slack' | 'teams' | 'webhook',
        config: data.configuration as any,
        enabled: data.is_active
      };

      setChannels(prev => [...prev, mappedChannel]);
      setNewChannel({ name: '', type: 'email', config: {} });
      
      toast({
        title: "Channel Created",
        description: `${newChannel.name} notification channel created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create notification channel",
        variant: "destructive",
      });
    }
  };

  const testChannel = async (channel: NotificationChannel) => {
    setIsTestingChannel(channel.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          channelId: channel.id,
          message: {
            title: 'Test Notification',
            body: 'This is a test notification from Dell Server Management System',
            priority: 'info'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Test Successful",
        description: `Test notification sent via ${channel.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsTestingChannel(null);
    }
  };

  const channelIcons = {
    email: Mail,
    slack: MessageSquare,
    teams: MessageSquare,
    webhook: Bell
  };

  const eventTypes = [
    'server_discovered',
    'update_started',
    'update_completed',
    'update_failed',
    'maintenance_mode_entered',
    'maintenance_mode_exited',
    'critical_alert',
    'firmware_compliance_issue'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Hub</h2>
          <p className="text-muted-foreground">
            Configure notification channels and alert rules
          </p>
        </div>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          {/* Create New Channel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Notification Channel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Channel Name</Label>
                  <Input
                    value={newChannel.name}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., DevOps Team Slack"
                  />
                </div>
                
                <div>
                  <Label>Channel Type</Label>
                  <Select
                    value={newChannel.type}
                    onValueChange={(value: any) => setNewChannel(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={createChannel} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Channel
                  </Button>
                </div>
              </div>

              {/* Configuration based on type */}
              {newChannel.type === 'email' && (
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="admin@company.com"
                    onChange={(e) => setNewChannel(prev => ({
                      ...prev,
                      config: { ...prev.config, email: e.target.value }
                    }))}
                  />
                </div>
              )}

              {newChannel.type !== 'email' && newChannel.type !== 'webhook' && (
                <div>
                  <Label>{newChannel.type === 'slack' ? 'Slack' : 'Teams'} Webhook URL</Label>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                    onChange={(e) => setNewChannel(prev => ({
                      ...prev,
                      config: { ...prev.config, webhookUrl: e.target.value }
                    }))}
                  />
                </div>
              )}

              {newChannel.type === 'webhook' && (
                <div className="space-y-4">
                  <div>
                    <Label>Webhook URL</Label>
                    <Input
                      placeholder="https://api.example.com/notifications"
                      onChange={(e) => setNewChannel(prev => ({
                        ...prev,
                        config: { ...prev.config, url: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>HTTP Method</Label>
                    <Select
                      defaultValue="POST"
                      onValueChange={(value) => setNewChannel(prev => ({
                        ...prev,
                        config: { ...prev.config, method: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Channels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const Icon = channelIcons[channel.type];
              
              return (
                <Card key={channel.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4" />
                      {channel.name}
                      <Badge variant={channel.enabled ? "default" : "secondary"}>
                        {channel.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Type: {channel.type}
                      </div>
                      
                      {channel.lastUsed && (
                        <div className="text-xs text-muted-foreground">
                          Last used: {new Date(channel.lastUsed).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testChannel(channel)}
                          disabled={isTestingChannel === channel.id}
                        >
                          {isTestingChannel === channel.id ? (
                            <TestTube className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Notification rules configuration coming soon...</p>
                <p className="text-sm">Configure when and how notifications are sent</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notification history available</p>
                <p className="text-sm">Recent notification deliveries will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
