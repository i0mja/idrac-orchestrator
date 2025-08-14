import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";

interface SecurityConfig {
  require_approval: boolean;
  backup_before_update: boolean;
  max_concurrent_updates: number;
  mfa_enabled: boolean;
  session_timeout_minutes: number;
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special: boolean;
  };
  audit_logging: boolean;
  failed_login_attempts: number;
  account_lockout_duration: number;
}

export function SecuritySettings() {
  const [config, setConfig] = useState<SecurityConfig>({
    require_approval: true,
    backup_before_update: true,
    max_concurrent_updates: 5,
    mfa_enabled: false,
    session_timeout_minutes: 480,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special: true
    },
    audit_logging: true,
    failed_login_attempts: 5,
    account_lockout_duration: 30
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState('sk-prod-1a2b3c4d5e6f7g8h9i0j');
  const { toast } = useToast();

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .eq('key', 'security_settings');

      if (error) throw error;

      if (data && data.length > 0) {
        setConfig({ ...config, ...(data[0].value as Partial<SecurityConfig>) });
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
      toast({
        title: "Error",
        description: "Failed to load security settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    setIsSaving(true);
    try {
      await supabase
        .from('system_config')
        .upsert({
          key: 'security_settings',
          value: config as any,
          description: 'Security configuration settings'
        });

      toast({
        title: "Security Settings Saved",
        description: "Your security configuration has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: "Error",
        description: "Failed to save security settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig({
      require_approval: true,
      backup_before_update: true,
      max_concurrent_updates: 5,
      mfa_enabled: false,
      session_timeout_minutes: 480,
      password_policy: {
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special: true
      },
      audit_logging: true,
      failed_login_attempts: 5,
      account_lockout_duration: 30
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Settings className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading security settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Security Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure security policies and access controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={saveSecuritySettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Update Security */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Update Security Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require-approval">Require approval for updates</Label>
              <p className="text-sm text-muted-foreground">
                All firmware updates must be approved before execution
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={config.require_approval}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_approval: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="backup-before-update">Backup before updates</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create configuration backups before updates
              </p>
            </div>
            <Switch
              id="backup-before-update"
              checked={config.backup_before_update}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, backup_before_update: checked }))}
            />
          </div>

          <div>
            <Label htmlFor="max-concurrent">Maximum concurrent updates</Label>
            <Input
              id="max-concurrent"
              type="number"
              min="1"
              max="20"
              value={config.max_concurrent_updates}
              onChange={(e) => setConfig(prev => ({ ...prev, max_concurrent_updates: parseInt(e.target.value) }))}
              className="w-24 mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Limit simultaneous firmware updates to prevent system overload
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Authentication & Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mfa-enabled">Multi-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require MFA for all user accounts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="mfa-enabled"
                checked={config.mfa_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mfa_enabled: checked }))}
              />
              {config.mfa_enabled ? (
                <Badge variant="default" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Disabled
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="session-timeout">Session timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              min="30"
              max="1440"
              value={config.session_timeout_minutes}
              onChange={(e) => setConfig(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) }))}
              className="w-32 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="failed-attempts">Failed login attempts before lockout</Label>
            <Input
              id="failed-attempts"
              type="number"
              min="3"
              max="10"
              value={config.failed_login_attempts}
              onChange={(e) => setConfig(prev => ({ ...prev, failed_login_attempts: parseInt(e.target.value) }))}
              className="w-24 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="lockout-duration">Account lockout duration (minutes)</Label>
            <Input
              id="lockout-duration"
              type="number"
              min="5"
              max="120"
              value={config.account_lockout_duration}
              onChange={(e) => setConfig(prev => ({ ...prev, account_lockout_duration: parseInt(e.target.value) }))}
              className="w-24 mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Password Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="min-length">Minimum password length</Label>
            <Input
              id="min-length"
              type="number"
              min="6"
              max="32"
              value={config.password_policy.min_length}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                password_policy: { ...prev.password_policy, min_length: parseInt(e.target.value) }
              }))}
              className="w-24 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="require-uppercase"
                checked={config.password_policy.require_uppercase}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  password_policy: { ...prev.password_policy, require_uppercase: checked }
                }))}
              />
              <Label htmlFor="require-uppercase">Require uppercase letters</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="require-lowercase"
                checked={config.password_policy.require_lowercase}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  password_policy: { ...prev.password_policy, require_lowercase: checked }
                }))}
              />
              <Label htmlFor="require-lowercase">Require lowercase letters</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="require-numbers"
                checked={config.password_policy.require_numbers}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  password_policy: { ...prev.password_policy, require_numbers: checked }
                }))}
              />
              <Label htmlFor="require-numbers">Require numbers</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="require-special"
                checked={config.password_policy.require_special}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  password_policy: { ...prev.password_policy, require_special: checked }
                }))}
              />
              <Label htmlFor="require-special">Require special characters</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Security */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audit-logging">Enable audit logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all user actions and system changes
              </p>
            </div>
            <Switch
              id="audit-logging"
              checked={config.audit_logging}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, audit_logging: checked }))}
            />
          </div>

          <div>
            <Label htmlFor="api-key">API Access Key</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm">
                Regenerate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Used for API access and external integrations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}