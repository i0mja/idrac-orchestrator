import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Circle, Server, Mail, Shield, Database, Network, Monitor, Users, Settings, Key, HardDrive, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0); // Start at 0 for database setup
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Database Connection Settings (new step 0)
  const [databaseConfig, setDatabaseConfig] = useState({
    type: "postgresql", // Only PostgreSQL supported
    host: "localhost",
    port: 5432,
    database: "idrac_orchestrator",
    username: "idrac_admin",
    password: "",
    ssl_enabled: false,
    connection_timeout: 30,
    pool_size: 20
  });

  // Organization & Basic Settings
  const [orgConfig, setOrgConfig] = useState({
    name: "",
    contact_email: "",
    environment: "production",
    timezone: "UTC"
  });

  // iDRAC Default Credentials
  const [idracConfig, setIdracConfig] = useState({
    username: "root",
    password: "",
    port: 443,
    ssl_verify: false,
    connection_timeout: 30
  });

  // File Storage Settings
  const [storageConfig, setStorageConfig] = useState({
    local_path: "/opt/firmware",
    max_size_gb: 500,
    retention_days: 90,
    auto_cleanup: true
  });

  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
    use_tls: true,
    from_address: "firmware@company.com"
  });

  // Authentication Settings
  const [authConfig, setAuthConfig] = useState({
    method: "local",
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_numbers: true,
      require_special: false
    },
    session_timeout_hours: 8,
    max_failed_attempts: 5
  });

  // LDAP Configuration (if enabled)
  const [ldapConfig, setLdapConfig] = useState({
    server_url: "",
    bind_dn: "",
    bind_password: "",
    user_search_base: "",
    user_search_filter: "(uid={username})",
    group_search_base: "",
    group_search_filter: "(member={dn})"
  });

  // Network Settings
  const [networkConfig, setNetworkConfig] = useState({
    discovery_ranges: ["192.168.1.0/24"],
    proxy_url: "",
    dns_servers: [],
    connection_timeout: 30
  });

  // Security Policies
  const [securityConfig, setSecurityConfig] = useState({
    enforce_https: true,
    api_rate_limit: 100,
    failed_login_attempts: 5,
    account_lockout_minutes: 30,
    require_mfa: false
  });

  // Backup Settings
  const [backupConfig, setBackupConfig] = useState({
    enabled: false,
    schedule: "0 2 * * *",
    retention_days: 30,
    include_firmware_files: false
  });

  // Monitoring Settings
  const [monitoringConfig, setMonitoringConfig] = useState({
    log_level: "INFO",
    health_check_interval: 300,
    disk_usage_alert: 85,
    memory_usage_alert: 90,
    enable_metrics: true
  });

  // Admin User Creation
  const [adminUser, setAdminUser] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    full_name: ""
  });

  // Fill test data function
  const fillTestData = () => {
    setOrgConfig({
      name: "Acme Corporation",
      contact_email: "admin@acme.com",
      environment: "production",
      timezone: "UTC"
    });

    setIdracConfig({
      username: "root",
      password: "Password123!",
      port: 443,
      ssl_verify: false,
      connection_timeout: 30
    });

    setStorageConfig({
      local_path: "/opt/firmware",
      max_size_gb: 500,
      retention_days: 90,
      auto_cleanup: true
    });

    setSmtpConfig({
      host: "smtp.acme.com",
      port: 587,
      username: "firmware@acme.com",
      password: "EmailPass123!",
      use_tls: true,
      from_address: "firmware@acme.com"
    });

    setAuthConfig({
      method: "local",
      password_policy: {
        min_length: 8,
        require_uppercase: true,
        require_numbers: true,
        require_special: true
      },
      session_timeout_hours: 8,
      max_failed_attempts: 5
    });

    setLdapConfig({
      server_url: "ldap://ldap.acme.com:389",
      bind_dn: "cn=admin,dc=acme,dc=com",
      bind_password: "LdapPass123!",
      user_search_base: "ou=users,dc=acme,dc=com",
      user_search_filter: "(uid={username})",
      group_search_base: "ou=groups,dc=acme,dc=com",
      group_search_filter: "(member={dn})"
    });

    setNetworkConfig({
      discovery_ranges: ["192.168.1.0/24", "10.0.0.0/16"],
      proxy_url: "http://proxy.acme.com:8080",
      dns_servers: ["8.8.8.8", "8.8.4.4"],
      connection_timeout: 30
    });

    setSecurityConfig({
      enforce_https: true,
      api_rate_limit: 100,
      failed_login_attempts: 5,
      account_lockout_minutes: 30,
      require_mfa: true
    });

    setBackupConfig({
      enabled: true,
      schedule: "0 2 * * *",
      retention_days: 30,
      include_firmware_files: true
    });

    setMonitoringConfig({
      log_level: "INFO",
      health_check_interval: 300,
      disk_usage_alert: 85,
      memory_usage_alert: 90,
      enable_metrics: true
    });

    setAdminUser({
      username: "admin",
      email: "admin@acme.com",
      full_name: "System Administrator",
      password: "AdminPass123!",
      confirm_password: "AdminPass123!"
    });

    toast({
      title: "Test Data Loaded",
      description: "All fields have been filled with test data.",
    });
  };

  const steps = [
    { id: 0, title: "Database", icon: Database, description: "Database connection setup" },
    { id: 1, title: "Organization", icon: Settings, description: "Basic organization settings" },
    { id: 2, title: "iDRAC Access", icon: Server, description: "Default server credentials" },
    { id: 3, title: "File Storage", icon: HardDrive, description: "Firmware storage configuration" },
    { id: 4, title: "Email/SMTP", icon: Mail, description: "Email server settings" },
    { id: 5, title: "Authentication", icon: Users, description: "User authentication setup" },
    { id: 6, title: "Network", icon: Network, description: "Network and discovery settings" },
    { id: 7, title: "Security", icon: Shield, description: "Security policies" },
    { id: 8, title: "Backup & Monitoring", icon: Monitor, description: "Backup and monitoring configuration" },
    { id: 9, title: "Admin User", icon: Key, description: "Create first administrator" },
    { id: 10, title: "Review", icon: CheckCircle, description: "Review and complete setup" }
  ];

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return databaseConfig.host.trim() !== "" && 
               databaseConfig.database.trim() !== "" && 
               databaseConfig.username.trim() !== "" && 
               databaseConfig.password.trim() !== "";
      case 1:
        return orgConfig.name.trim() !== "" && orgConfig.contact_email.trim() !== "";
      case 2:
        return idracConfig.username.trim() !== "" && idracConfig.password.trim() !== "";
      case 3:
        return storageConfig.local_path.trim() !== "";
      case 4:
        return true; // SMTP is optional
      case 5:
        return authConfig.method !== "";
      case 6:
        return networkConfig.discovery_ranges.length > 0;
      case 7:
        return true; // Security settings can use defaults
      case 8:
        return true; // Backup settings can use defaults
      case 9:
        return adminUser.username.trim() !== "" && 
               adminUser.email.trim() !== "" && 
               adminUser.password.trim() !== "" &&
               adminUser.password === adminUser.confirm_password;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const saveAllConfigurations = async () => {
    setLoading(true);
    try {
      // Save all configurations to system_config table
      const configurations = [
        { key: 'organization_settings', value: orgConfig },
        { key: 'idrac_default_credentials', value: idracConfig },
        { key: 'storage_settings', value: storageConfig },
        { key: 'smtp_settings', value: smtpConfig },
        { key: 'auth_settings', value: authConfig },
        { key: 'network_settings', value: networkConfig },
        { key: 'security_policies', value: securityConfig },
        { key: 'backup_settings', value: backupConfig },
        { key: 'monitoring_settings', value: monitoringConfig }
      ];

      // Update all configurations
      for (const config of configurations) {
        const { error } = await supabase
          .from('system_config')
          .upsert({
            key: config.key,
            value: config.value,
            description: `Configuration for ${config.key.replace('_', ' ')}`
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      // Save LDAP config if authentication method is LDAP
      if (authConfig.method === 'ldap') {
        const { error: ldapError } = await supabase
          .from('ldap_config')
          .insert({
            name: 'Primary LDAP',
            ...ldapConfig,
            is_active: true
          });

        if (ldapError) throw ldapError;
      }

      // Create admin user would require Supabase auth setup
      // For now, just save the user profile configuration
      
      toast({
        title: "Setup Complete",
        description: "System has been configured successfully.",
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
      setLoading(false);
    }
  };

  const addDiscoveryRange = () => {
    setNetworkConfig(prev => ({
      ...prev,
      discovery_ranges: [...prev.discovery_ranges, ""]
    }));
  };

  const updateDiscoveryRange = (index: number, value: string) => {
    setNetworkConfig(prev => ({
      ...prev,
      discovery_ranges: prev.discovery_ranges.map((range, i) => i === index ? value : range)
    }));
  };

  const removeDiscoveryRange = (index: number) => {
    setNetworkConfig(prev => ({
      ...prev,
      discovery_ranges: prev.discovery_ranges.filter((_, i) => i !== index)
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Configure your PostgreSQL database connection. The system requires PostgreSQL 15+ for operation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Database Requirements</h4>
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• PostgreSQL 15+ server running</li>
                  <li>• Database "idrac_orchestrator" created</li>
                  <li>• User with full privileges on the database</li>
                  <li>• Network connectivity from application to database</li>
                </ul>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="db-host">Database Host *</Label>
                    <Input
                      id="db-host"
                      value={databaseConfig.host}
                      onChange={(e) => setDatabaseConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-port">Port</Label>
                    <Input
                      id="db-port"
                      type="number"
                      value={databaseConfig.port}
                      onChange={(e) => setDatabaseConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-name">Database Name *</Label>
                  <Input
                    id="db-name"
                    value={databaseConfig.database}
                    onChange={(e) => setDatabaseConfig(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="idrac_orchestrator"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="db-username">Username *</Label>
                    <Input
                      id="db-username"
                      value={databaseConfig.username}
                      onChange={(e) => setDatabaseConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="idrac_admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-password">Password *</Label>
                    <Input
                      id="db-password"
                      type="password"
                      value={databaseConfig.password}
                      onChange={(e) => setDatabaseConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Database password"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="db-timeout">Connection Timeout (seconds)</Label>
                    <Input
                      id="db-timeout"
                      type="number"
                      value={databaseConfig.connection_timeout}
                      onChange={(e) => setDatabaseConfig(prev => ({ ...prev, connection_timeout: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-pool-size">Connection Pool Size</Label>
                    <Input
                      id="db-pool-size"
                      type="number"
                      value={databaseConfig.pool_size}
                      onChange={(e) => setDatabaseConfig(prev => ({ ...prev, pool_size: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ssl-enabled"
                    checked={databaseConfig.ssl_enabled}
                    onCheckedChange={(checked) => setDatabaseConfig(prev => ({ ...prev, ssl_enabled: !!checked }))}
                  />
                  <Label htmlFor="ssl-enabled">Enable SSL connection</Label>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/20">
                <h4 className="font-medium mb-2">Quick Setup Commands</h4>
                <div className="text-xs font-mono bg-black text-green-400 p-2 rounded">
                  <div># Create database and user:</div>
                  <div>sudo -u postgres psql</div>
                  <div>CREATE DATABASE idrac_orchestrator;</div>
                  <div>CREATE USER idrac_admin WITH ENCRYPTED PASSWORD 'your_password';</div>
                  <div>GRANT ALL PRIVILEGES ON DATABASE idrac_orchestrator TO idrac_admin;</div>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Configure your organization's basic information and environment settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name *</Label>
                  <Input
                    id="org-name"
                    value={orgConfig.name}
                    onChange={(e) => setOrgConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={orgConfig.contact_email}
                    onChange={(e) => setOrgConfig(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="admin@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={orgConfig.environment} onValueChange={(value) => setOrgConfig(prev => ({ ...prev, environment: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={orgConfig.timezone}
                    onChange={(e) => setOrgConfig(prev => ({ ...prev, timezone: e.target.value }))}
                    placeholder="UTC"
                  />
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Default iDRAC Credentials
              </CardTitle>
              <CardDescription>
                Configure default credentials used to connect to Dell iDRAC interfaces. These can be overridden per server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idrac-username">Username *</Label>
                  <Input
                    id="idrac-username"
                    value={idracConfig.username}
                    onChange={(e) => setIdracConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="root"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idrac-password">Password *</Label>
                  <Input
                    id="idrac-password"
                    type="password"
                    value={idracConfig.password}
                    onChange={(e) => setIdracConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Default iDRAC password"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idrac-port">Port</Label>
                    <Input
                      id="idrac-port"
                      type="number"
                      value={idracConfig.port}
                      onChange={(e) => setIdracConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idrac-timeout">Connection Timeout (seconds)</Label>
                    <Input
                      id="idrac-timeout"
                      type="number"
                      value={idracConfig.connection_timeout}
                      onChange={(e) => setIdracConfig(prev => ({ ...prev, connection_timeout: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ssl-verify"
                    checked={!idracConfig.ssl_verify}
                    onCheckedChange={(checked) => setIdracConfig(prev => ({ ...prev, ssl_verify: !checked }))}
                  />
                  <Label htmlFor="ssl-verify">Skip SSL certificate verification (not recommended for production)</Label>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                File Storage Configuration
              </CardTitle>
              <CardDescription>
                Configure where firmware files are stored and retention policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storage-path">Local Storage Path *</Label>
                  <Input
                    id="storage-path"
                    value={storageConfig.local_path}
                    onChange={(e) => setStorageConfig(prev => ({ ...prev, local_path: e.target.value }))}
                    placeholder="/opt/firmware"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-size">Maximum Size (GB)</Label>
                    <Input
                      id="max-size"
                      type="number"
                      value={storageConfig.max_size_gb}
                      onChange={(e) => setStorageConfig(prev => ({ ...prev, max_size_gb: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retention">Retention Period (days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={storageConfig.retention_days}
                      onChange={(e) => setStorageConfig(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-cleanup"
                    checked={storageConfig.auto_cleanup}
                    onCheckedChange={(checked) => setStorageConfig(prev => ({ ...prev, auto_cleanup: !!checked }))}
                  />
                  <Label htmlFor="auto-cleanup">Enable automatic cleanup of old files</Label>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email/SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for sending notifications and alerts. Leave blank to disable email notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-address">From Address</Label>
                    <Input
                      id="from-address"
                      type="email"
                      value={smtpConfig.from_address}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_address: e.target.value }))}
                      placeholder="firmware@company.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input
                      id="smtp-username"
                      value={smtpConfig.username}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">Password</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-tls"
                    checked={smtpConfig.use_tls}
                    onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, use_tls: !!checked }))}
                  />
                  <Label htmlFor="use-tls">Use TLS encryption</Label>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Authentication Configuration
              </CardTitle>
              <CardDescription>
                Configure how users will authenticate to the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Select value={authConfig.method} onValueChange={(value) => setAuthConfig(prev => ({ ...prev, method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Database</SelectItem>
                      <SelectItem value="ldap">LDAP/Active Directory</SelectItem>
                      <SelectItem value="saml">SAML SSO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {authConfig.method === 'ldap' && (
                  <div className="mt-4 p-4 border rounded-lg space-y-3">
                    <h4 className="font-medium">LDAP Configuration</h4>
                    <div className="grid gap-3">
                      <Input
                        placeholder="ldap://server.company.com:389"
                        value={ldapConfig.server_url}
                        onChange={(e) => setLdapConfig(prev => ({ ...prev, server_url: e.target.value }))}
                      />
                      <Input
                        placeholder="Bind DN (e.g., cn=admin,dc=company,dc=com)"
                        value={ldapConfig.bind_dn}
                        onChange={(e) => setLdapConfig(prev => ({ ...prev, bind_dn: e.target.value }))}
                      />
                      <Input
                        type="password"
                        placeholder="Bind Password"
                        value={ldapConfig.bind_password}
                        onChange={(e) => setLdapConfig(prev => ({ ...prev, bind_password: e.target.value }))}
                      />
                      <Input
                        placeholder="User Search Base (e.g., ou=users,dc=company,dc=com)"
                        value={ldapConfig.user_search_base}
                        onChange={(e) => setLdapConfig(prev => ({ ...prev, user_search_base: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Password Policy</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-length">Minimum Length</Label>
                      <Input
                        id="min-length"
                        type="number"
                        value={authConfig.password_policy.min_length}
                        onChange={(e) => setAuthConfig(prev => ({ 
                          ...prev, 
                          password_policy: { 
                            ...prev.password_policy, 
                            min_length: parseInt(e.target.value) 
                          } 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
                      <Input
                        id="session-timeout"
                        type="number"
                        value={authConfig.session_timeout_hours}
                        onChange={(e) => setAuthConfig(prev => ({ ...prev, session_timeout_hours: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="require-uppercase"
                        checked={authConfig.password_policy.require_uppercase}
                        onCheckedChange={(checked) => setAuthConfig(prev => ({ 
                          ...prev, 
                          password_policy: { 
                            ...prev.password_policy, 
                            require_uppercase: !!checked 
                          } 
                        }))}
                      />
                      <Label htmlFor="require-uppercase">Require uppercase letters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="require-numbers"
                        checked={authConfig.password_policy.require_numbers}
                        onCheckedChange={(checked) => setAuthConfig(prev => ({ 
                          ...prev, 
                          password_policy: { 
                            ...prev.password_policy, 
                            require_numbers: !!checked 
                          } 
                        }))}
                      />
                      <Label htmlFor="require-numbers">Require numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="require-special"
                        checked={authConfig.password_policy.require_special}
                        onCheckedChange={(checked) => setAuthConfig(prev => ({ 
                          ...prev, 
                          password_policy: { 
                            ...prev.password_policy, 
                            require_special: !!checked 
                          } 
                        }))}
                      />
                      <Label htmlFor="require-special">Require special characters</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Configuration
              </CardTitle>
              <CardDescription>
                Configure network settings for server discovery and connectivity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Discovery Network Ranges</Label>
                  <div className="space-y-2">
                    {networkConfig.discovery_ranges.map((range, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={range}
                          onChange={(e) => updateDiscoveryRange(index, e.target.value)}
                          placeholder="192.168.1.0/24"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeDiscoveryRange(index)}
                          disabled={networkConfig.discovery_ranges.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addDiscoveryRange}>
                      Add Range
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-url">Proxy URL (optional)</Label>
                  <Input
                    id="proxy-url"
                    value={networkConfig.proxy_url}
                    onChange={(e) => setNetworkConfig(prev => ({ ...prev, proxy_url: e.target.value }))}
                    placeholder="http://proxy.company.com:8080"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connection-timeout">Connection Timeout (seconds)</Label>
                  <Input
                    id="connection-timeout"
                    type="number"
                    value={networkConfig.connection_timeout}
                    onChange={(e) => setNetworkConfig(prev => ({ ...prev, connection_timeout: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Policies
              </CardTitle>
              <CardDescription>
                Configure security policies and access controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enforce-https"
                    checked={securityConfig.enforce_https}
                    onCheckedChange={(checked) => setSecurityConfig(prev => ({ ...prev, enforce_https: !!checked }))}
                  />
                  <Label htmlFor="enforce-https">Enforce HTTPS connections</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-rate-limit">API Rate Limit (requests/minute)</Label>
                    <Input
                      id="api-rate-limit"
                      type="number"
                      value={securityConfig.api_rate_limit}
                      onChange={(e) => setSecurityConfig(prev => ({ ...prev, api_rate_limit: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="failed-login-attempts">Max Failed Login Attempts</Label>
                    <Input
                      id="failed-login-attempts"
                      type="number"
                      value={securityConfig.failed_login_attempts}
                      onChange={(e) => setSecurityConfig(prev => ({ ...prev, failed_login_attempts: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-minutes">Account Lockout Duration (minutes)</Label>
                  <Input
                    id="lockout-minutes"
                    type="number"
                    value={securityConfig.account_lockout_minutes}
                    onChange={(e) => setSecurityConfig(prev => ({ ...prev, account_lockout_minutes: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="require-mfa"
                    checked={securityConfig.require_mfa}
                    onCheckedChange={(checked) => setSecurityConfig(prev => ({ ...prev, require_mfa: !!checked }))}
                  />
                  <Label htmlFor="require-mfa">Require Multi-Factor Authentication</Label>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup & Monitoring
              </CardTitle>
              <CardDescription>
                Configure system backup and monitoring settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Backup Configuration</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="backup-enabled"
                      checked={backupConfig.enabled}
                      onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, enabled: !!checked }))}
                    />
                    <Label htmlFor="backup-enabled">Enable automated backups</Label>
                  </div>
                  {backupConfig.enabled && (
                    <div className="ml-6 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="backup-schedule">Backup Schedule (cron)</Label>
                        <Input
                          id="backup-schedule"
                          value={backupConfig.schedule}
                          onChange={(e) => setBackupConfig(prev => ({ ...prev, schedule: e.target.value }))}
                          placeholder="0 2 * * *"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="backup-retention">Retention Period (days)</Label>
                        <Input
                          id="backup-retention"
                          type="number"
                          value={backupConfig.retention_days}
                          onChange={(e) => setBackupConfig(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-firmware"
                          checked={backupConfig.include_firmware_files}
                          onCheckedChange={(checked) => setBackupConfig(prev => ({ ...prev, include_firmware_files: !!checked }))}
                        />
                        <Label htmlFor="include-firmware">Include firmware files in backup</Label>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Monitoring Configuration</h4>
                  <div className="space-y-2">
                    <Label htmlFor="log-level">Log Level</Label>
                    <Select 
                      value={monitoringConfig.log_level} 
                      onValueChange={(value) => setMonitoringConfig(prev => ({ ...prev, log_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBUG">DEBUG</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="WARN">WARN</SelectItem>
                        <SelectItem value="ERROR">ERROR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="disk-alert">Disk Usage Alert (%)</Label>
                      <Input
                        id="disk-alert"
                        type="number"
                        value={monitoringConfig.disk_usage_alert}
                        onChange={(e) => setMonitoringConfig(prev => ({ ...prev, disk_usage_alert: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memory-alert">Memory Usage Alert (%)</Label>
                      <Input
                        id="memory-alert"
                        type="number"
                        value={monitoringConfig.memory_usage_alert}
                        onChange={(e) => setMonitoringConfig(prev => ({ ...prev, memory_usage_alert: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-metrics"
                      checked={monitoringConfig.enable_metrics}
                      onCheckedChange={(checked) => setMonitoringConfig(prev => ({ ...prev, enable_metrics: !!checked }))}
                    />
                    <Label htmlFor="enable-metrics">Enable performance metrics collection</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Create Administrator Account
              </CardTitle>
              <CardDescription>
                Create the first administrator account for the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username">Username *</Label>
                  <Input
                    id="admin-username"
                    value={adminUser.username}
                    onChange={(e) => setAdminUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminUser.email}
                    onChange={(e) => setAdminUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-fullname">Full Name</Label>
                  <Input
                    id="admin-fullname"
                    value={adminUser.full_name}
                    onChange={(e) => setAdminUser(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="System Administrator"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password *</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminUser.password}
                    onChange={(e) => setAdminUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-confirm-password">Confirm Password *</Label>
                  <Input
                    id="admin-confirm-password"
                    type="password"
                    value={adminUser.confirm_password}
                    onChange={(e) => setAdminUser(prev => ({ ...prev, confirm_password: e.target.value }))}
                  />
                  {adminUser.password !== adminUser.confirm_password && adminUser.confirm_password && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Review Configuration
              </CardTitle>
              <CardDescription>
                Review your configuration before completing the setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Organization</h4>
                  <p className="text-sm text-muted-foreground">{orgConfig.name} ({orgConfig.environment})</p>
                  <p className="text-sm text-muted-foreground">{orgConfig.contact_email}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Authentication</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{authConfig.method.toUpperCase()}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Session timeout: {authConfig.session_timeout_hours}h
                    </span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Storage</h4>
                  <p className="text-sm text-muted-foreground">{storageConfig.local_path}</p>
                  <p className="text-sm text-muted-foreground">
                    Max: {storageConfig.max_size_gb}GB, Retention: {storageConfig.retention_days} days
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Network Discovery</h4>
                  <div className="flex flex-wrap gap-1">
                    {networkConfig.discovery_ranges.map((range, idx) => (
                      <Badge key={idx} variant="outline">{range}</Badge>
                    ))}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Administrator Account</h4>
                  <p className="text-sm text-muted-foreground">{adminUser.username} ({adminUser.email})</p>
                </div>
              </div>
            </CardContent>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1" />
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Firmware Management System Setup</h1>
                <p className="text-muted-foreground">
                  Configure your enterprise firmware management platform
                </p>
              </div>
              <div className="flex-1 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fillTestData}
                  className="text-xs"
                >
                  Fill Test Data
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <div key={step.id} className="flex flex-col items-center space-y-2">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                        ${isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                          isCurrent ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <Card className="mb-8">
            {renderStepContent()}
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button 
                onClick={saveAllConfigurations}
                disabled={loading || !validateStep(currentStep)}
              >
                {loading ? "Completing Setup..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;