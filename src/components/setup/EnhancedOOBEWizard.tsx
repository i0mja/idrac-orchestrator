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
import { CheckCircle, Server, Cloud, Building, AlertCircle, ArrowRight, ArrowLeft, Database, Network, Shield, TestTube, Plus, Trash2, X, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SetupConfig, SetupStep } from '@/types/setup';
import type { DatabaseConfig, InfrastructureConfig } from '@/types/database';
import { DatabaseAdapterFactory } from '@/adapters/DatabaseAdapterFactory';
import { SUPABASE_ENABLED } from '@/lib/env';
import { putSetup } from '@/lib/api';

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

export const EnhancedOOBEWizard = ({ onComplete }: OOBEWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<SetupConfig>({
    backend_mode: 'on_premise',
    organization_name: '',
    admin_email: '',
    deployment_type: 'on_premise',
    database: {
      type: 'mssql',
      host: '',
      port: 1433,
      database: 'idrac_orchestrator',
      username: '',
      password: '',
      ssl: true,
      trustServerCertificate: true,
      autoCreateDatabase: true
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

  const setupDatabase = async () => {
    if (!formData.database || formData.backend_mode === 'supabase') return;

    if (!SUPABASE_ENABLED) {
      toast({
        title: "Skipping Automated Setup",
        description: "Supabase integration is disabled. Configure the database manually in API mode.",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const adapter = DatabaseAdapterFactory.create(formData.database);
      
      // Step 1: Test connection to server
      toast({
        title: "Testing Connection",
        description: "Connecting to database server...",
      });
      
      const connectionResult = await adapter.testConnection();
      if (!connectionResult.success) {
        throw new Error(connectionResult.error);
      }
      
      // Step 2: Create database if needed
      toast({
        title: "Creating Database",
        description: "Setting up your database...",
      });
      
      const createResult = await adapter.createDatabase();
      if (!createResult.success) {
        throw new Error(createResult.error);
      }
      
      // Step 3: Initialize schema
      toast({
        title: "Initializing Schema", 
        description: "Creating tables and initial data...",
      });
      
      const schemaResult = await adapter.initializeSchema();
      if (!schemaResult.success) {
        throw new Error(schemaResult.error);
      }
      
      toast({
        title: "Database Setup Complete!",
        description: `${formData.database.database} is ready for use.`,
      });
      
    } catch (error) {
      toast({
        title: "Database Setup Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const addDatacenter = () => {
    if (!formData.infrastructure) return;
    
    setFormData({
      ...formData,
      infrastructure: {
        ...formData.infrastructure,
        datacenters: [
          ...formData.infrastructure.datacenters,
          {
            name: '',
            location: '',
            timezone: 'UTC',
            ipScopes: [{ subnet: '', description: '', credentialProfileId: '' }],
            maintenanceWindow: { start: '02:00', end: '06:00' }
          }
        ]
      }
    });
  };

  const addCredentialProfile = () => {
    if (!formData.infrastructure) return;
    
    setFormData({
      ...formData,
      infrastructure: {
        ...formData.infrastructure,
        credentialProfiles: [
          ...formData.infrastructure.credentialProfiles,
          {
            id: `profile-${Date.now()}`,
            name: '',
            username: '',
            password: '',
            port: 443,
            protocol: 'https' as const,
            isDefault: formData.infrastructure.credentialProfiles.length === 0,
            description: ''
          }
        ]
      }
    });
  };

  const addVCenter = () => {
    if (!formData.infrastructure) return;
    
    setFormData({
      ...formData,
      infrastructure: {
        ...formData.infrastructure,
        vcenters: [
          ...formData.infrastructure.vcenters,
          {
            name: '',
            hostname: '',
            username: '',
            password: '',
            port: 443,
            ignoreSsl: true
          }
        ]
      }
    });
  };

  const handleComplete = async () => {
    if (!canProceed()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsCompleting(true);
    try {
      if (!SUPABASE_ENABLED) {
        const finalConfig = {
          ...formData,
          setup_completed: true,
          setup_completed_at: new Date().toISOString()
        };
        await putSetup(finalConfig);
        toast({
          title: "Setup Complete!",
          description: "Saved to API (no Supabase).",
        });
        await onComplete(formData);
        return;
      }

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
            <h3 className="font-semibold">Dell Server Management</h3>
            <p className="text-sm text-muted-foreground">
              Centralized management of Dell servers with iDRAC integration
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
            <h3 className="font-semibold">Multi-Database Support</h3>
            <p className="text-sm text-muted-foreground">
              Works with Microsoft SQL Server, MySQL, PostgreSQL, and more
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBackendStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Backend Mode</h2>
        <p className="text-muted-foreground">
          Select your deployment architecture and infrastructure preference
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
                  <Badge variant="secondary">Quick Start</Badge>
                </div>
                <p className="text-muted-foreground mt-2">
                  Managed PostgreSQL database with built-in authentication and real-time features.
                </p>
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
                    On-Premises Database
                  </Label>
                  <Badge variant="outline">Enterprise Ready</Badge>
                </div>
                <p className="text-muted-foreground mt-2">
                  Connect to your existing Microsoft SQL Server, MySQL, PostgreSQL, or Oracle database.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );

  const renderDatabaseStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Database Configuration</h2>
        <p className="text-muted-foreground">
          Configure your database connection for data persistence
        </p>
      </div>

      {formData.backend_mode === 'supabase' ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Supabase configuration will be handled automatically. No database setup required.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="db-type">Database Type</Label>
                <Select 
                  value={formData.database?.type} 
                  onValueChange={(value: 'mssql' | 'mysql' | 'postgresql' | 'oracle') => 
                    setFormData({
                      ...formData,
                      database: {
                        ...formData.database!,
                        type: value,
                        port: value === 'mssql' ? 1433 : value === 'mysql' ? 3306 : value === 'oracle' ? 1521 : 5432
                      }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mssql">Microsoft SQL Server</SelectItem>
                    <SelectItem value="mysql">MySQL / MariaDB</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="oracle">Oracle Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="db-host">Host / Server</Label>
                <Input
                  id="db-host"
                  placeholder="localhost or IP address"
                  value={formData.database?.host || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    database: { ...formData.database!, host: e.target.value }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="db-port">Port</Label>
                <Input
                  id="db-port"
                  type="number"
                  value={formData.database?.port || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    database: { ...formData.database!, port: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="db-name">Database Name</Label>
                <Input
                  id="db-name"
                  placeholder="idrac_orchestrator"
                  value={formData.database?.database || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    database: { ...formData.database!, database: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Database will be created automatically if it doesn't exist
                </p>
              </div>

              <div>
                <Label htmlFor="db-username">Username</Label>
                <Input
                  id="db-username"
                  value={formData.database?.username || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    database: { ...formData.database!, username: e.target.value }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="db-password">Password</Label>
                <Input
                  id="db-password"
                  type="password"
                  value={formData.database?.password || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    database: { ...formData.database!, password: e.target.value }
                  })}
                />
              </div>
            </div>

            {formData.database?.type === 'mssql' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.database?.trustServerCertificate || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      database: { ...formData.database!, trustServerCertificate: checked }
                    })}
                  />
                  <Label>Trust Server Certificate (for self-signed certificates)</Label>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.database?.ssl || false}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  database: { ...formData.database!, ssl: checked }
                })}
              />
              <Label>Use SSL/TLS Encryption</Label>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.database?.autoCreateDatabase !== false}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    database: { ...formData.database!, autoCreateDatabase: checked }
                  })}
                />
                <Label>Automatically create database if it doesn't exist</Label>
              </div>
              
              <Button 
                onClick={setupDatabase}
                disabled={isTestingConnection}
                variant="default"
                className="w-full"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingConnection ? 'Setting up Database...' : 'Test & Setup Database'}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                This will test the connection, create the database if needed, and initialize all tables.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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

  const renderInfrastructureStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Infrastructure Setup</h2>
        <p className="text-muted-foreground">
          Configure your datacenters, IP ranges, and credential profiles
        </p>
      </div>

      <div className="space-y-6">
        {/* Credential Profiles Section - Show First */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Credential Profiles
              </CardTitle>
              <Button onClick={addCredentialProfile} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Profile
              </Button>
            </div>
            <CardDescription>
              Configure credential profiles for connecting to Dell iDRAC interfaces. Create these first, then assign them to datacenters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formData.infrastructure?.credentialProfiles.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium mb-2">No credential profiles configured</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create at least one credential profile to connect to Dell servers and assign to IP ranges.
                </p>
                <Button onClick={addCredentialProfile} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.infrastructure?.credentialProfiles.map((profile, index) => (
                   <Card key={index} className="p-4 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <Label htmlFor={`profile-name-${index}`}>Profile Name *</Label>
                         <Input 
                           id={`profile-name-${index}`}
                           placeholder="e.g., Production iDRAC, Lab Servers"
                           value={profile.name}
                           onChange={(e) => {
                             const newProfiles = [...formData.infrastructure!.credentialProfiles];
                             newProfiles[index].name = e.target.value;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                             });
                           }}
                         />
                       </div>
                       <div className="space-y-1">
                         <Label htmlFor={`profile-desc-${index}`}>Description</Label>
                         <Input 
                           id={`profile-desc-${index}`}
                           placeholder="e.g., Production environment credentials"
                           value={profile.description || ''}
                           onChange={(e) => {
                             const newProfiles = [...formData.infrastructure!.credentialProfiles];
                             newProfiles[index].description = e.target.value;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                             });
                           }}
                         />
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <Label htmlFor={`profile-username-${index}`}>iDRAC Username *</Label>
                         <Input 
                           id={`profile-username-${index}`}
                           placeholder="e.g., root, admin"
                           value={profile.username}
                           onChange={(e) => {
                             const newProfiles = [...formData.infrastructure!.credentialProfiles];
                             newProfiles[index].username = e.target.value;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                             });
                           }}
                         />
                       </div>
                       <div className="space-y-1">
                         <Label htmlFor={`profile-password-${index}`}>iDRAC Password *</Label>
                         <Input 
                           id={`profile-password-${index}`}
                           type="password"
                           placeholder="Enter iDRAC password"
                           value={profile.password}
                           onChange={(e) => {
                             const newProfiles = [...formData.infrastructure!.credentialProfiles];
                             newProfiles[index].password = e.target.value;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                             });
                           }}
                         />
                       </div>
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-1">
                         <Label htmlFor={`profile-port-${index}`}>Port</Label>
                         <Input 
                           id={`profile-port-${index}`}
                           type="number"
                           placeholder="443"
                           value={profile.port}
                           onChange={(e) => {
                             const newProfiles = [...formData.infrastructure!.credentialProfiles];
                             newProfiles[index].port = parseInt(e.target.value) || 443;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                             });
                           }}
                         />
                         <p className="text-xs text-muted-foreground">Default: 443 (HTTPS)</p>
                       </div>
                       <div className="space-y-1">
                         <Label htmlFor={`profile-protocol-${index}`}>Protocol</Label>
                         <select
                           id={`profile-protocol-${index}`}
                           className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                           value={profile.protocol}
                           onChange={(e) => {
                             const newProfiles = [...formData.infrastructure!.credentialProfiles];
                             newProfiles[index].protocol = e.target.value as 'https' | 'http';
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                             });
                           }}
                         >
                           <option value="https">HTTPS (Recommended)</option>
                           <option value="http">HTTP</option>
                         </select>
                       </div>
                       <div className="space-y-1 flex items-end">
                         <div className="flex items-center space-x-2">
                           <Switch
                             checked={profile.isDefault}
                             onCheckedChange={(checked) => {
                               const newProfiles = [...formData.infrastructure!.credentialProfiles];
                               // If setting as default, unset other defaults
                               if (checked) {
                                 newProfiles.forEach((p, i) => {
                                   p.isDefault = i === index;
                                 });
                               } else {
                                 newProfiles[index].isDefault = false;
                               }
                               setFormData({
                                 ...formData,
                                 infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                               });
                             }}
                           />
                           <Label>Default Profile</Label>
                         </div>
                       </div>
                     </div>

                     <div className="flex justify-between items-center pt-2 border-t">
                       <div className="text-sm text-muted-foreground">
                         {profile.isDefault && (
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                             <Star className="h-3 w-3 mr-1" />
                             Default Profile
                           </span>
                         )}
                       </div>
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => {
                           const newProfiles = formData.infrastructure!.credentialProfiles.filter((_, i) => i !== index);
                           setFormData({
                             ...formData,
                             infrastructure: { ...formData.infrastructure!, credentialProfiles: newProfiles }
                           });
                         }}
                       >
                         <X className="h-4 w-4 mr-2" />
                         Remove
                       </Button>
                     </div>
                   </Card>
                 ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datacenters Section - Show After Credentials */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Datacenters
              </CardTitle>
              <Button 
                onClick={addDatacenter} 
                size="sm"
                disabled={formData.infrastructure?.credentialProfiles.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Datacenter
              </Button>
            </div>
            <CardDescription>
              Define your datacenter locations and IP scopes. Servers will be automatically assigned based on IP ranges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formData.infrastructure?.credentialProfiles.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium mb-2">Create credential profiles first</p>
                <p className="text-sm text-muted-foreground">
                  You need to create at least one credential profile before configuring datacenters.
                </p>
              </div>
            ) : formData.infrastructure?.datacenters.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium mb-2">No datacenters configured</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first datacenter to organize servers by location and IP ranges.
                </p>
                <Button onClick={addDatacenter} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Datacenter
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                 {formData.infrastructure?.datacenters.map((dc, index) => (
                   <Card key={index} className="p-4 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <Label htmlFor={`dc-name-${index}`}>Datacenter Name *</Label>
                         <Input 
                           id={`dc-name-${index}`}
                           placeholder="e.g., NYC-DC1, West Coast"
                           value={dc.name}
                           onChange={(e) => {
                             const newDatacenters = [...formData.infrastructure!.datacenters];
                             newDatacenters[index].name = e.target.value;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                             });
                           }}
                         />
                       </div>
                       <div className="space-y-1">
                         <Label htmlFor={`dc-location-${index}`}>Physical Location *</Label>
                         <Input 
                           id={`dc-location-${index}`}
                           placeholder="e.g., New York, NY"
                           value={dc.location}
                           onChange={(e) => {
                             const newDatacenters = [...formData.infrastructure!.datacenters];
                             newDatacenters[index].location = e.target.value;
                             setFormData({
                               ...formData,
                               infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                             });
                           }}
                         />
                       </div>
                     </div>

                     <div className="space-y-3">
                       <Label>Network Configuration</Label>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <Label htmlFor={`dc-subnet-${index}`}>IP Subnet Range *</Label>
                           <Input 
                             id={`dc-subnet-${index}`}
                             placeholder="e.g., 192.168.1.0/24"
                             value={dc.ipScopes[0]?.subnet || ''}
                             onChange={(e) => {
                               const newDatacenters = [...formData.infrastructure!.datacenters];
                               if (!newDatacenters[index].ipScopes[0]) {
                                 newDatacenters[index].ipScopes[0] = { subnet: '', description: '', credentialProfileId: '' };
                               }
                               newDatacenters[index].ipScopes[0].subnet = e.target.value;
                               setFormData({
                                 ...formData,
                                 infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                               });
                             }}
                           />
                           <p className="text-xs text-muted-foreground">
                             Servers in this range will be auto-assigned to this datacenter
                           </p>
                         </div>
                         <div className="space-y-1">
                           <Label htmlFor={`dc-credentials-${index}`}>Default Credential Profile *</Label>
                           <select 
                             id={`dc-credentials-${index}`}
                             className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                             value={dc.ipScopes[0]?.credentialProfileId || ''}
                             onChange={(e) => {
                               const newDatacenters = [...formData.infrastructure!.datacenters];
                               if (!newDatacenters[index].ipScopes[0]) {
                                 newDatacenters[index].ipScopes[0] = { subnet: '', description: '', credentialProfileId: '' };
                               }
                               newDatacenters[index].ipScopes[0].credentialProfileId = e.target.value;
                               setFormData({
                                 ...formData,
                                 infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                               });
                             }}
                           >
                             <option value="">Choose a credential profile...</option>
                             {formData.infrastructure?.credentialProfiles.map((profile) => (
                               <option key={profile.id} value={profile.id}>
                                 {profile.name} - {profile.username}@{profile.protocol}:{profile.port}
                                 {profile.isDefault ? ' (Default)' : ''}
                               </option>
                             ))}
                           </select>
                           <p className="text-xs text-muted-foreground">
                             Which credential profile to use for connecting to servers in this IP range
                           </p>
                         </div>
                       </div>
                     </div>

                     <div className="space-y-3">
                       <Label>Maintenance Window</Label>
                       <div className="flex gap-4 items-center">
                         <div className="space-y-1">
                           <Label htmlFor={`dc-start-${index}`}>Start Time *</Label>
                           <Input 
                             id={`dc-start-${index}`}
                             placeholder="02:00"
                             value={dc.maintenanceWindow.start}
                             onChange={(e) => {
                               const newDatacenters = [...formData.infrastructure!.datacenters];
                               newDatacenters[index].maintenanceWindow.start = e.target.value;
                               setFormData({
                                 ...formData,
                                 infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                               });
                             }}
                           />
                         </div>
                         <div className="flex items-center pt-6">
                           <span className="text-muted-foreground">to</span>
                         </div>
                         <div className="space-y-1">
                           <Label htmlFor={`dc-end-${index}`}>End Time *</Label>
                           <Input 
                             id={`dc-end-${index}`}
                             placeholder="04:00"
                             value={dc.maintenanceWindow.end}
                             onChange={(e) => {
                               const newDatacenters = [...formData.infrastructure!.datacenters];
                               newDatacenters[index].maintenanceWindow.end = e.target.value;
                               setFormData({
                                 ...formData,
                                 infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                               });
                             }}
                           />
                         </div>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         Daily window when maintenance operations can be performed (24-hour format)
                       </p>
                     </div>

                     <div className="flex justify-end">
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => {
                           const newDatacenters = formData.infrastructure!.datacenters.filter((_, i) => i !== index);
                           setFormData({
                             ...formData,
                             infrastructure: { ...formData.infrastructure!, datacenters: newDatacenters }
                           });
                         }}
                       >
                         <X className="h-4 w-4 mr-2" />
                         Remove
                       </Button>
                     </div>
                   </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );

  const renderVCenterStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">vCenter Configuration</h2>
        <p className="text-muted-foreground">
          Connect to your VMware vCenter servers for cluster-aware operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              vCenter Servers
            </CardTitle>
            <Button onClick={addVCenter} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add vCenter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.infrastructure?.vcenters.length === 0 ? (
            <div className="text-center py-8">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No vCenter servers configured. This is optional but recommended for VMware environments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.infrastructure?.vcenters.map((vcenter, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="vCenter Name"
                      value={vcenter.name}
                      onChange={(e) => {
                        const newVCenters = [...formData.infrastructure!.vcenters];
                        newVCenters[index].name = e.target.value;
                        setFormData({
                          ...formData,
                          infrastructure: { ...formData.infrastructure!, vcenters: newVCenters }
                        });
                      }}
                    />
                    <Input 
                      placeholder="Hostname / IP"
                      value={vcenter.hostname}
                      onChange={(e) => {
                        const newVCenters = [...formData.infrastructure!.vcenters];
                        newVCenters[index].hostname = e.target.value;
                        setFormData({
                          ...formData,
                          infrastructure: { ...formData.infrastructure!, vcenters: newVCenters }
                        });
                      }}
                    />
                    <Input 
                      placeholder="Username"
                      value={vcenter.username}
                      onChange={(e) => {
                        const newVCenters = [...formData.infrastructure!.vcenters];
                        newVCenters[index].username = e.target.value;
                        setFormData({
                          ...formData,
                          infrastructure: { ...formData.infrastructure!, vcenters: newVCenters }
                        });
                      }}
                    />
                    <Input 
                      type="password"
                      placeholder="Password"
                      value={vcenter.password}
                      onChange={(e) => {
                        const newVCenters = [...formData.infrastructure!.vcenters];
                        newVCenters[index].password = e.target.value;
                        setFormData({
                          ...formData,
                          infrastructure: { ...formData.infrastructure!, vcenters: newVCenters }
                        });
                      }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDiscoveryStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Server Discovery</h2>
        <p className="text-muted-foreground">
          Configure automatic discovery of Dell servers in your network
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.infrastructure?.discoverySettings.enabled || false}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                infrastructure: {
                  ...formData.infrastructure!,
                  discoverySettings: {
                    ...formData.infrastructure!.discoverySettings,
                    enabled: checked
                  }
                }
              })}
            />
            <Label>Enable automatic server discovery</Label>
          </div>

          <div>
            <Label htmlFor="discovery-interval">Discovery Interval (hours)</Label>
            <Input
              id="discovery-interval"
              type="number"
              min="1"
              max="168"
              value={formData.infrastructure?.discoverySettings.intervalHours || 24}
              onChange={(e) => setFormData({
                ...formData,
                infrastructure: {
                  ...formData.infrastructure!,
                  discoverySettings: {
                    ...formData.infrastructure!.discoverySettings,
                    intervalHours: parseInt(e.target.value) || 24
                  }
                }
              })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.infrastructure?.discoverySettings.autoAssignDatacenters || false}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                infrastructure: {
                  ...formData.infrastructure!,
                  discoverySettings: {
                    ...formData.infrastructure!.discoverySettings,
                    autoAssignDatacenters: checked
                  }
                }
              })}
            />
            <Label>Automatically assign servers to datacenters based on IP ranges</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
      <div>
        <h2 className="text-2xl font-bold">Setup Complete!</h2>
        <p className="text-muted-foreground">
          Your iDRAC Updater Orchestrator is configured and ready for enterprise use
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 text-left max-w-2xl mx-auto">
        <h3 className="font-semibold mb-3">Configuration Summary:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Backend Mode:</span>
            <Badge variant={formData.backend_mode === 'supabase' ? 'default' : 'secondary'} className="ml-2">
              {formData.backend_mode === 'supabase' ? 'Supabase Cloud' : 'On-Premises'}
            </Badge>
          </div>
          <div>
            <span className="font-medium">Database:</span>
            <span className="ml-2">{formData.database?.type || 'Not configured'}</span>
          </div>
          <div>
            <span className="font-medium">Organization:</span>
            <span className="ml-2">{formData.organization_name}</span>
          </div>
          <div>
            <span className="font-medium">Datacenters:</span>
            <span className="ml-2">{formData.infrastructure?.datacenters.length || 0} configured</span>
          </div>
          <div>
            <span className="font-medium">vCenter Servers:</span>
            <span className="ml-2">{formData.infrastructure?.vcenters.length || 0} configured</span>
          </div>
          <div>
            <span className="font-medium">Credentials:</span>
            <span className="ml-2">{formData.infrastructure?.credentialProfiles.length || 0} profiles</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="font-medium">Next steps after setup:</p>
        <div className="space-y-1">
          <p>1. Test database connectivity and verify schema creation</p>
          <p>2. Run initial server discovery across your configured IP ranges</p>
          <p>3. Verify vCenter connections and host synchronization</p>
          <p>4. Configure maintenance windows and update policies</p>
          <p>5. Set up user accounts and role-based access control</p>
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
      case 'database':
        return renderDatabaseStep();
      case 'organization':
        return renderOrganizationStep();
      case 'infrastructure':
        return renderInfrastructureStep();
      case 'vcenter':
        return renderVCenterStep();
      case 'discovery':
        return renderDiscoveryStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    const step = STEPS[currentStep];
    
    if (!step.required) return true;
    
    switch (step.id) {
      case 'organization':
        return formData.organization_name.trim() && formData.admin_email.trim();
      case 'database':
        if (formData.backend_mode === 'supabase') return true;
        return formData.database?.host && formData.database?.database && 
               formData.database?.username && formData.database?.password;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader className="text-center">
          {!SUPABASE_ENABLED && (
            <div className="flex justify-center mb-2">
              <Badge variant="outline">API mode (no Supabase)</Badge>
            </div>
          )}
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
          <CardTitle className="flex items-center justify-center gap-2">
            {STEPS[currentStep].required && <span className="text-destructive">*</span>}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        
        <CardContent className="min-h-[500px]">
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
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isCompleting ? 'Completing...' : 'Complete Setup'}
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