import React, { useState } from 'react';
import { useAdvancedIntegrations } from '@/hooks/useAdvancedIntegrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plug, Shield, Key, Bell, Settings, Plus, Edit, Trash2, 
  Copy, Eye, EyeOff, TestTube, CheckCircle, AlertTriangle,
  Link2, Webhook, Mail, MessageSquare, Zap
} from 'lucide-react';
import { format } from 'date-fns';

export function AdvancedIntegrationsHub() {
  const {
    ssoProviders,
    apiKeys,
    notificationChannels,
    loading,
    createSSOProvider,
    updateSSOProvider,
    deleteSSOProvider,
    generateAPIKey,
    revokeAPIKey,
    deleteAPIKey,
    createNotificationChannel,
    updateNotificationChannel,
    deleteNotificationChannel,
    testNotificationChannel
  } = useAdvancedIntegrations();

  // Dialog states
  const [isSSODialogOpen, setIsSSODialogOpen] = useState(false);
  const [isAPIKeyDialogOpen, setIsAPIKeyDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [showAPIKeys, setShowAPIKeys] = useState<Record<string, boolean>>({});
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Form states
  const [ssoForm, setSsoForm] = useState({
    provider_name: '',
    provider_type: 'saml' as const,
    configuration: {}
  });

  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    permissions: [] as string[]
  });

  const [notificationForm, setNotificationForm] = useState({
    name: '',
    channel_type: 'email' as const,
    configuration: {}
  });

  const handleCreateSSO = async () => {
    try {
      await createSSOProvider({
        organization_id: '', // Will be set by the hook
        is_active: true,
        ...ssoForm
      });
      setIsSSODialogOpen(false);
      setSsoForm({ provider_name: '', provider_type: 'saml', configuration: {} });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleGenerateAPIKey = async () => {
    try {
      const result = await generateAPIKey(apiKeyForm.name, apiKeyForm.permissions);
      setGeneratedKey(result.key);
      setApiKeyForm({ name: '', permissions: [] });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCreateNotification = async () => {
    try {
      await createNotificationChannel({
        organization_id: '', // Will be set by the hook
        is_active: true,
        ...notificationForm
      });
      setIsNotificationDialogOpen(false);
      setNotificationForm({ name: '', channel_type: 'email', configuration: {} });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'saml': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'oidc': return <Link2 className="w-5 h-5 text-green-500" />;
      case 'ldap': return <Settings className="w-5 h-5 text-purple-500" />;
      default: return <Plug className="w-5 h-5" />;
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'slack': return <MessageSquare className="w-4 h-4" />;
      case 'webhook': return <Webhook className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Plug className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Advanced Integrations</h1>
            <p className="text-muted-foreground text-lg">
              Configure SSO, API access, and notification channels
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SSO Providers</p>
                <h3 className="text-2xl font-bold">{ssoProviders.length}</h3>
              </div>
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Keys</p>
                <h3 className="text-2xl font-bold">{apiKeys.filter(k => k.is_active).length}</h3>
              </div>
              <Key className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notification Channels</p>
                <h3 className="text-2xl font-bold">{notificationChannels.filter(c => c.is_active).length}</h3>
              </div>
              <Bell className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sso" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sso">SSO Providers</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="sso">
          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Single Sign-On Providers
              </CardTitle>
              <Dialog open={isSSODialogOpen} onOpenChange={setIsSSODialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add SSO Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configure SSO Provider</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="providerName">Provider Name</Label>
                        <Input
                          id="providerName"
                          value={ssoForm.provider_name}
                          onChange={(e) => setSsoForm(prev => ({ ...prev, provider_name: e.target.value }))}
                          placeholder="Corporate SSO"
                        />
                      </div>
                      <div>
                        <Label htmlFor="providerType">Provider Type</Label>
                        <Select 
                          value={ssoForm.provider_type} 
                          onValueChange={(value: any) => setSsoForm(prev => ({ ...prev, provider_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="saml">SAML 2.0</SelectItem>
                            <SelectItem value="oidc">OpenID Connect</SelectItem>
                            <SelectItem value="ldap">LDAP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="configuration">Configuration (JSON)</Label>
                      <Textarea
                        id="configuration"
                        placeholder='{"issuer": "https://your-sso-provider.com", "audience": "your-app"}'
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            setSsoForm(prev => ({ ...prev, configuration: config }));
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsSSODialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSSO}>
                        Create Provider
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ssoProviders.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      {getProviderIcon(provider.provider_type)}
                      <div>
                        <h4 className="font-medium">{provider.provider_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {provider.provider_type.toUpperCase()} • Created {format(new Date(provider.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteSSOProvider(provider.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {ssoProviders.length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No SSO Providers</h3>
                    <p className="text-muted-foreground">
                      Configure single sign-on to enable seamless authentication.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <Dialog open={isAPIKeyDialogOpen} onOpenChange={setIsAPIKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New API Key</DialogTitle>
                  </DialogHeader>
                  {generatedKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <h3 className="font-semibold text-success">API Key Generated</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Copy this key now. For security reasons, it won't be shown again.
                        </p>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                          <code className="flex-1">{generatedKey}</code>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Button onClick={() => {
                        setGeneratedKey(null);
                        setIsAPIKeyDialogOpen(false);
                      }}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="keyName">Key Name</Label>
                        <Input
                          id="keyName"
                          value={apiKeyForm.name}
                          onChange={(e) => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Production API Key"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAPIKeyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleGenerateAPIKey}>
                          Generate Key
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Key className="w-5 h-5 text-warning" />
                      <div>
                        <h4 className="font-medium">{apiKey.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <code>{apiKey.key_prefix}***</code>
                          {apiKey.last_used_at && (
                            <span>• Last used {format(new Date(apiKey.last_used_at), 'MMM dd')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={apiKey.is_active ? 'default' : 'destructive'}>
                        {apiKey.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                      {apiKey.is_active && (
                        <Button size="sm" variant="outline" onClick={() => revokeAPIKey(apiKey.id)}>
                          Revoke
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => deleteAPIKey(apiKey.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {apiKeys.length === 0 && (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                    <p className="text-muted-foreground">
                      Generate API keys to enable programmatic access to your organization.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Channels
              </CardTitle>
              <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Channel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Notification Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="channelName">Channel Name</Label>
                        <Input
                          id="channelName"
                          value={notificationForm.name}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Production Alerts"
                        />
                      </div>
                      <div>
                        <Label htmlFor="channelType">Channel Type</Label>
                        <Select 
                          value={notificationForm.channel_type} 
                          onValueChange={(value: any) => setNotificationForm(prev => ({ ...prev, channel_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="slack">Slack</SelectItem>
                            <SelectItem value="teams">Microsoft Teams</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                            <SelectItem value="pagerduty">PagerDuty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateNotification}>
                        Create Channel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notificationChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      {getChannelIcon(channel.channel_type)}
                      <div>
                        <h4 className="font-medium">{channel.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {channel.channel_type} • Created {format(new Date(channel.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                        {channel.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => testNotificationChannel(channel.id)}>
                        <TestTube className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteNotificationChannel(channel.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {notificationChannels.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Notification Channels</h3>
                    <p className="text-muted-foreground">
                      Configure notification channels to receive alerts and updates.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}