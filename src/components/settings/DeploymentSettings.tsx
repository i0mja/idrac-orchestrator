import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Server, Database, Cloud, Globe, Key, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeploymentConfig {
  deployment_mode: 'cloud' | 'self_hosted' | 'hybrid';
  api_base_url: string;
  database_url: string;
  storage_endpoint: string;
  auth_provider: 'supabase' | 'ldap' | 'local';
  enable_external_apis: boolean;
  dell_api_endpoint: string;
  vmware_api_endpoint: string;
  custom_domain: string;
  ssl_enabled: boolean;
  cors_origins: string[];
}

export function DeploymentSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<DeploymentConfig>({
    deployment_mode: 'cloud',
    api_base_url: 'https://hrqzmjjpnylcmunyaovj.supabase.co',
    database_url: 'postgresql://localhost:5432/idrac_orchestrator',
    storage_endpoint: 'https://hrqzmjjpnylcmunyaovj.supabase.co/storage/v1',
    auth_provider: 'supabase',
    enable_external_apis: true,
    dell_api_endpoint: 'https://api.dell.com',
    vmware_api_endpoint: 'https://your-vcenter.domain.com',
    custom_domain: '',
    ssl_enabled: true,
    cors_origins: ['http://localhost:3000', 'https://localhost:3000']
  });

  const [corsInput, setCorsInput] = useState('');

  useEffect(() => {
    setCorsInput(config.cors_origins.join('\n'));
  }, [config.cors_origins]);

  const handleSave = async () => {
    try {
      // In a real implementation, this would save to system_config
      console.log('Saving deployment config:', config);
      
      toast({
        title: "Configuration saved",
        description: "Deployment settings have been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save deployment configuration",
        variant: "destructive"
      });
    }
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText(config.api_base_url);
    toast({
      title: "Copied to clipboard",
      description: "API base URL copied to clipboard"
    });
  };

  const updateCorsOrigins = (value: string) => {
    setCorsInput(value);
    const origins = value.split('\n').filter(line => line.trim().length > 0);
    setConfig(prev => ({ ...prev, cors_origins: origins }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Deployment Configuration
          </CardTitle>
          <CardDescription>
            Configure API endpoints and deployment settings for local, cloud, or hybrid hosting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="deployment-mode">Deployment Mode</Label>
            <select
              id="deployment-mode"
              className="w-full mt-1 p-2 border rounded-md"
              value={config.deployment_mode}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                deployment_mode: e.target.value as 'cloud' | 'self_hosted' | 'hybrid'
              }))}
            >
              <option value="cloud">Cloud (Supabase)</option>
              <option value="self_hosted">Self-Hosted</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          {config.deployment_mode !== 'cloud' && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  Self-Hosted Configuration
                </span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                When self-hosting, make sure to update your environment variables and configure your infrastructure accordingly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api-base-url">API Base URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="api-base-url"
                value={config.api_base_url}
                onChange={(e) => setConfig(prev => ({ ...prev, api_base_url: e.target.value }))}
                placeholder="https://your-api-domain.com"
              />
              <Button variant="outline" size="sm" onClick={copyApiUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Base URL for all API endpoints. Update this for self-hosted deployments.
            </p>
          </div>

          <div>
            <Label htmlFor="custom-domain">Custom Domain</Label>
            <Input
              id="custom-domain"
              value={config.custom_domain}
              onChange={(e) => setConfig(prev => ({ ...prev, custom_domain: e.target.value }))}
              placeholder="api.yourdomain.com"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ssl-enabled">Enable SSL/TLS</Label>
              <p className="text-sm text-muted-foreground">
                Enforce HTTPS for all API communications
              </p>
            </div>
            <Switch
              id="ssl-enabled"
              checked={config.ssl_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, ssl_enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Database Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="database-url">Database Connection URL</Label>
            <Input
              id="database-url"
              type="password"
              value={config.database_url}
              onChange={(e) => setConfig(prev => ({ ...prev, database_url: e.target.value }))}
              placeholder="postgresql://user:password@localhost:5432/database"
            />
            <p className="text-sm text-muted-foreground mt-1">
              PostgreSQL connection string for self-hosted deployments
            </p>
          </div>

          <div>
            <Label htmlFor="storage-endpoint">Storage Endpoint</Label>
            <Input
              id="storage-endpoint"
              value={config.storage_endpoint}
              onChange={(e) => setConfig(prev => ({ ...prev, storage_endpoint: e.target.value }))}
              placeholder="https://your-storage-endpoint.com"
            />
          </div>

          <div>
            <Label htmlFor="auth-provider">Authentication Provider</Label>
            <select
              id="auth-provider"
              className="w-full mt-1 p-2 border rounded-md"
              value={config.auth_provider}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                auth_provider: e.target.value as 'supabase' | 'ldap' | 'local'
              }))}
            >
              <option value="supabase">Supabase Auth</option>
              <option value="ldap">LDAP/Active Directory</option>
              <option value="local">Local Authentication</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* External APIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            External API Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-external-apis">Enable External API Integration</Label>
              <p className="text-sm text-muted-foreground">
                Connect to Dell and VMware APIs for enhanced functionality
              </p>
            </div>
            <Switch
              id="enable-external-apis"
              checked={config.enable_external_apis}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_external_apis: checked }))}
            />
          </div>

          {config.enable_external_apis && (
            <div className="space-y-4">
              <Separator />
              
              <div>
                <Label htmlFor="dell-api">Dell API Endpoint</Label>
                <Input
                  id="dell-api"
                  value={config.dell_api_endpoint}
                  onChange={(e) => setConfig(prev => ({ ...prev, dell_api_endpoint: e.target.value }))}
                  placeholder="https://api.dell.com"
                />
              </div>

              <div>
                <Label htmlFor="vmware-api">VMware vCenter Endpoint</Label>
                <Input
                  id="vmware-api"
                  value={config.vmware_api_endpoint}
                  onChange={(e) => setConfig(prev => ({ ...prev, vmware_api_endpoint: e.target.value }))}
                  placeholder="https://your-vcenter.domain.com"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CORS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>CORS Configuration</CardTitle>
          <CardDescription>
            Configure allowed origins for cross-origin requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="cors-origins">Allowed Origins (one per line)</Label>
            <textarea
              id="cors-origins"
              className="w-full mt-1 p-2 border rounded-md h-24 font-mono text-sm"
              value={corsInput}
              onChange={(e) => updateCorsOrigins(e.target.value)}
              placeholder={`http://localhost:3000\nhttps://yourdomain.com\nhttps://api.yourdomain.com`}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Add domains that should be allowed to make API requests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Deployment Mode:</span>
              <Badge variant="outline" className="ml-2">
                {config.deployment_mode}
              </Badge>
            </div>
            <div>
              <span className="font-medium">API Base URL:</span>
              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                {config.api_base_url}
              </code>
            </div>
            <div>
              <span className="font-medium">Auth Provider:</span>
              <Badge variant="secondary" className="ml-2">
                {config.auth_provider}
              </Badge>
            </div>
            <div>
              <span className="font-medium">SSL Enabled:</span>
              <Badge variant={config.ssl_enabled ? "default" : "destructive"} className="ml-2">
                {config.ssl_enabled ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Configuration
      </Button>
    </div>
  );
}