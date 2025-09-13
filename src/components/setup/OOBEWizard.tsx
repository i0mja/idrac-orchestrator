import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Server, Cloud, Building, AlertCircle, ArrowRight, ArrowLeft, Database, Network, Shield, TestTube, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SetupConfig, SetupStep } from '@/types/setup';
import type { DatabaseConfig, InfrastructureConfig } from '@/types/database';
import { DatabaseAdapterFactory } from '@/adapters/DatabaseAdapterFactory';

const STEPS: SetupStep[] = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with iDRAC Updater Orchestrator' },
  { id: 'backend', title: 'Backend Mode', description: 'Choose your deployment architecture' },
  { id: 'database', title: 'Database', description: 'Configure your database connection', required: true },
  { id: 'organization', title: 'Organization', description: 'Set up your organization details', required: true },
  { id: 'infrastructure', title: 'Infrastructure', description: 'Configure datacenters and credentials' },
  { id: 'vcenter', title: 'vCenter', description: 'Connect to VMware vCenter servers' },
  { id: 'discovery', title: 'Discovery', description: 'Configure automatic server discovery' },
  { id: 'complete', title: 'Complete', description: 'Finish setup and start using the system' }
];

interface OOBEWizardProps {
  onComplete: (config: SetupConfig) => Promise<void>;
}

export const OOBEWizard = ({ onComplete }: OOBEWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<SetupConfig>({
    backend_mode: 'supabase',
    organization_name: '',
    admin_email: '',
    deployment_type: 'cloud',
    database: {
      type: 'postgresql',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl: true
    },
    infrastructure: {
      datacenters: [],
      credentialProfiles: [],
      vcenters: [],
      discoverySettings: {
        enabled: true,
        intervalHours: 24,
        autoAssignDatacenters: true
      }
    }
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!formData.organization_name || !formData.admin_email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsCompleting(true);
    try {
      await onComplete(formData);
      toast({
        title: "Setup Complete!",
        description: "Your iDRAC Updater Orchestrator is ready to use"
      });
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "An unexpected error occurred during setup",
        variant: "destructive"
      });
      setIsCompleting(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <Server className="h-16 w-16 mx-auto text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Welcome to iDRAC Updater Orchestrator</h1>
          <p className="text-muted-foreground mt-2">
            Enterprise-grade firmware management and server orchestration platform
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <Card>
          <CardContent className="p-4">
            <Server className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Server Management</h3>
            <p className="text-sm text-muted-foreground">
              Centralized management of Dell servers and firmware updates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Cloud className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">vCenter Integration</h3>
            <p className="text-sm text-muted-foreground">
              Seamless integration with VMware vCenter for cluster-aware updates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Building className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Enterprise Ready</h3>
            <p className="text-sm text-muted-foreground">
              Role-based access, audit logs, and compliance reporting
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        This setup wizard will guide you through the initial configuration in just a few steps.
      </p>
    </div>
  );

  const renderBackendStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Backend Mode</h2>
        <p className="text-muted-foreground">
          Select how you want to deploy and manage your data
        </p>
      </div>

      <RadioGroup 
        value={formData.backend_mode} 
        onValueChange={(value: 'supabase' | 'on_premise') => 
          setFormData({ ...formData, backend_mode: value })
        }
        className="space-y-4"
      >
        <Card className={`cursor-pointer transition-all ${formData.backend_mode === 'supabase' ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <RadioGroupItem value="supabase" id="supabase" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Cloud className="h-5 w-5 text-primary" />
                  <Label htmlFor="supabase" className="text-lg font-semibold cursor-pointer">
                    Supabase Cloud
                  </Label>
                  <Badge variant="secondary">Recommended for Development</Badge>
                </div>
                <p className="text-muted-foreground mt-2">
                  Quick setup with managed database, authentication, and real-time features. 
                  Perfect for development, testing, and getting started quickly.
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Automatic backups and scaling
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Built-in authentication and security
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Real-time updates and collaboration
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${formData.backend_mode === 'on_premise' ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <RadioGroupItem value="on_premise" id="on_premise" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Server className="h-5 w-5 text-primary" />
                  <Label htmlFor="on_premise" className="text-lg font-semibold cursor-pointer">
                    On-Premises
                  </Label>
                  <Badge variant="outline">Enterprise Ready</Badge>
                </div>
                <p className="text-muted-foreground mt-2">
                  Self-hosted deployment with full control over your data and infrastructure. 
                  Ideal for production environments and security-sensitive deployments.
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Complete data sovereignty
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Customizable security policies
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Air-gapped deployment support
                  </div>
                </div>
                {formData.backend_mode === 'on_premise' && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      On-premises mode requires additional setup including database configuration, 
                      authentication provider setup, and network configuration.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );

  const renderOrganizationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Organization Setup</h2>
        <p className="text-muted-foreground">
          Configure your organization details and admin account
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name *</Label>
          <Input
            id="org-name"
            placeholder="e.g., Acme Corporation"
            value={formData.organization_name}
            onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email">Administrator Email *</Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@company.com"
            value={formData.admin_email}
            onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            This email will be used for system notifications and admin access
          </p>
        </div>
      </div>
    </div>
  );

  const renderDeploymentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Deployment Configuration</h2>
        <p className="text-muted-foreground">
          Set your deployment type and environment settings
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="deployment-type">Deployment Type</Label>
          <Select 
            value={formData.deployment_type} 
            onValueChange={(value: 'cloud' | 'on_premise' | 'hybrid') => 
              setFormData({ ...formData, deployment_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cloud">Cloud</SelectItem>
              <SelectItem value="on_premise">On-Premise</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This affects logging levels, security settings, and default configurations
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can modify these settings later in the system configuration section.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
      <div>
        <h2 className="text-2xl font-bold">Setup Complete!</h2>
        <p className="text-muted-foreground">
          Your iDRAC Updater Orchestrator is ready to use
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 text-left max-w-md mx-auto">
        <h3 className="font-semibold mb-3">Configuration Summary:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Backend Mode:</span>
            <Badge variant={formData.backend_mode === 'supabase' ? 'default' : 'secondary'}>
              {formData.backend_mode === 'supabase' ? 'Supabase Cloud' : 'On-Premises'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Organization:</span>
            <span className="font-medium">{formData.organization_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Admin Email:</span>
            <span className="font-medium">{formData.admin_email}</span>
          </div>
          <div className="flex justify-between">
            <span>Environment:</span>
            <Badge variant="outline">{formData.deployment_type}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Next steps:</p>
        <div className="space-y-1">
          <p>1. Configure vCenter connections</p>
          <p>2. Set up server discovery</p>
          <p>3. Configure maintenance windows</p>
          <p>4. Add users and assign roles</p>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return renderWelcomeStep();
      case 'backend':
        return renderBackendStep();
      case 'organization':
        return renderOrganizationStep();
      case 'deployment':
        return renderDeploymentStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'organization':
        return formData.organization_name.trim() && formData.admin_email.trim();
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        
        <CardContent className="min-h-[400px]">
          {renderStepContent()}
        </CardContent>

        <div className="flex justify-between items-center p-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </div>

          {currentStep === STEPS.length - 1 ? (
            <Button 
              onClick={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? 'Completing...' : 'Finish Setup'}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};