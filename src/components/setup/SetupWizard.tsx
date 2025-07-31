import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  Network, 
  Shield, 
  Database, 
  CheckCircle,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

interface SetupWizardProps {
  onComplete: () => void;
}

interface VCenterConfig {
  name: string;
  hostname: string;
  username: string;
  password: string;
  port: number;
  ignore_ssl: boolean;
}

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

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    organization_name: '',
    admin_email: '',
    timezone: 'UTC',
    notification_settings: {
      email_alerts: true,
    },
    auto_discovery: {
      enabled: true,
      interval_hours: 24,
      ip_ranges: ['192.168.1.0/24']
    },
    security: {
      require_approval: true,
      backup_before_update: true,
      max_concurrent_updates: 5
    }
  });

  const [vcenterConfig, setVCenterConfig] = useState<VCenterConfig>({
    name: '',
    hostname: '',
    username: '',
    password: '',
    port: 443,
    ignore_ssl: true
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { id: 1, title: "Organization Setup", icon: Settings },
    { id: 2, title: "vCenter Configuration", icon: Network },
    { id: 3, title: "Security & Automation", icon: Shield },
    { id: 4, title: "Complete Setup", icon: Database }
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return systemConfig.organization_name.trim() !== '' && systemConfig.admin_email.trim() !== '';
      case 2:
        return vcenterConfig.name.trim() !== '' && vcenterConfig.hostname.trim() !== '';
      case 3:
        return true; // Optional configurations
      default:
        return true;
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save system configuration
      const configEntries = [
        { key: 'organization_name', value: systemConfig.organization_name },
        { key: 'admin_email', value: systemConfig.admin_email },
        { key: 'timezone', value: systemConfig.timezone },
        { key: 'notification_settings', value: systemConfig.notification_settings },
        { key: 'auto_discovery', value: systemConfig.auto_discovery },
        { key: 'security_settings', value: systemConfig.security },
        { key: 'setup_completed', value: true }
      ];

      for (const entry of configEntries) {
        await supabase
          .from('system_config')
          .upsert({
            key: entry.key,
            value: entry.value,
            description: `Setup wizard configuration for ${entry.key}`
          });
      }

      // Save vCenter configuration if provided
      if (vcenterConfig.hostname.trim()) {
        await supabase
          .from('vcenters')
          .insert({
            name: vcenterConfig.name,
            hostname: vcenterConfig.hostname,
            username: vcenterConfig.username,
            port: vcenterConfig.port,
            ignore_ssl: vcenterConfig.ignore_ssl
          });
      }

      toast({
        title: "Setup Complete",
        description: "Your iDRAC Updater has been configured successfully.",
      });

      onComplete();
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to iDRAC Updater</h1>
          <p className="text-muted-foreground">Let's get your system configured in just a few steps</p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  currentStep >= step.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const IconComponent = steps[currentStep - 1].icon;
                return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
              })()}
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organization Name *</Label>
                  <Input
                    id="org-name"
                    value={systemConfig.organization_name}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, organization_name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-email">Administrator Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={systemConfig.admin_email}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, admin_email: e.target.value }))}
                    placeholder="admin@yourcompany.com"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={systemConfig.timezone}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, timezone: e.target.value }))}
                    placeholder="UTC"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure your vCenter server connection (optional but recommended for automatic server discovery)
                </p>
                <div>
                  <Label htmlFor="vcenter-name">vCenter Name</Label>
                  <Input
                    id="vcenter-name"
                    value={vcenterConfig.name}
                    onChange={(e) => setVCenterConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Production vCenter"
                  />
                </div>
                <div>
                  <Label htmlFor="vcenter-hostname">vCenter Hostname/IP</Label>
                  <Input
                    id="vcenter-hostname"
                    value={vcenterConfig.hostname}
                    onChange={(e) => setVCenterConfig(prev => ({ ...prev, hostname: e.target.value }))}
                    placeholder="vcenter.yourcompany.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vcenter-username">Username</Label>
                    <Input
                      id="vcenter-username"
                      value={vcenterConfig.username}
                      onChange={(e) => setVCenterConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="administrator@vsphere.local"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vcenter-port">Port</Label>
                    <Input
                      id="vcenter-port"
                      type="number"
                      value={vcenterConfig.port}
                      onChange={(e) => setVCenterConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ignore-ssl"
                    checked={vcenterConfig.ignore_ssl}
                    onCheckedChange={(checked) => setVCenterConfig(prev => ({ ...prev, ignore_ssl: checked }))}
                  />
                  <Label htmlFor="ignore-ssl">Ignore SSL certificate errors</Label>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Auto Discovery Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-discovery"
                        checked={systemConfig.auto_discovery.enabled}
                        onCheckedChange={(checked) => setSystemConfig(prev => ({
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
                        value={systemConfig.auto_discovery.interval_hours}
                        onChange={(e) => setSystemConfig(prev => ({
                          ...prev,
                          auto_discovery: { ...prev.auto_discovery, interval_hours: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ip-ranges">IP Ranges to Scan</Label>
                      <Textarea
                        id="ip-ranges"
                        value={systemConfig.auto_discovery.ip_ranges.join('\n')}
                        onChange={(e) => setSystemConfig(prev => ({
                          ...prev,
                          auto_discovery: { ...prev.auto_discovery, ip_ranges: e.target.value.split('\n').filter(Boolean) }
                        }))}
                  placeholder="192.168.1.0/24
10.0.0.0/16"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Security Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="require-approval"
                        checked={systemConfig.security.require_approval}
                        onCheckedChange={(checked) => setSystemConfig(prev => ({
                          ...prev,
                          security: { ...prev.security, require_approval: checked }
                        }))}
                      />
                      <Label htmlFor="require-approval">Require manual approval for firmware updates</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="backup-before-update"
                        checked={systemConfig.security.backup_before_update}
                        onCheckedChange={(checked) => setSystemConfig(prev => ({
                          ...prev,
                          security: { ...prev.security, backup_before_update: checked }
                        }))}
                      />
                      <Label htmlFor="backup-before-update">Create backup before firmware updates</Label>
                    </div>
                    <div>
                      <Label htmlFor="max-concurrent">Maximum Concurrent Updates</Label>
                      <Input
                        id="max-concurrent"
                        type="number"
                        value={systemConfig.security.max_concurrent_updates}
                        onChange={(e) => setSystemConfig(prev => ({
                          ...prev,
                          security: { ...prev.security, max_concurrent_updates: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-success mx-auto" />
                <h3 className="text-xl font-semibold">Ready to Complete Setup</h3>
                <p className="text-muted-foreground">
                  Your iDRAC Updater is configured and ready to use. You can change these settings later in the Settings page.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold">Organization</h4>
                    <p className="text-sm text-muted-foreground">{systemConfig.organization_name}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold">vCenter</h4>
                    <p className="text-sm text-muted-foreground">
                      {vcenterConfig.hostname || 'Not configured'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep) || isLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="bg-gradient-primary"
                >
                  {isLoading ? 'Completing...' : 'Complete Setup'}
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}