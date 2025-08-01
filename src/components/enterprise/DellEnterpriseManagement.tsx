import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useDellEnterprise } from "@/hooks/useDellEnterprise";
import { useVMwareIntegration } from "@/hooks/useVMwareIntegration";
import { useServers } from "@/hooks/useServers";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  HardDrive,
  Shield,
  Calendar,
  Play,
  Pause,
  Settings,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  Network,
  Cpu,
  Monitor,
  RotateCw,
  FileText,
  Target
} from "lucide-react";

export function DellEnterpriseManagement() {
  const { dellPackages, orchestrationPlans, loading: dellLoading, createOrchestrationPlan, executeOrchestrationPlan } = useDellEnterprise();
  const { virtualMachines, serverBackups, createServerBackup, enterMaintenanceMode, exitMaintenanceMode, syncVMsFromHost } = useVMwareIntegration();
  const { servers } = useServers();
  const { toast } = useToast();

  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [newOrchestrationPlan, setNewOrchestrationPlan] = useState({
    name: '',
    vmware_settings: {
      enable_maintenance_mode: true,
      evacuate_vms: true,
      drs_enabled: true,
      migration_policy: 'automatic' as const,
      max_concurrent_hosts: 1,
      wait_for_vm_migration: true
    },
    safety_checks: {
      verify_backups: true,
      check_vmware_compatibility: true,
      validate_checksums: true,
      ensure_cluster_health: true,
      minimum_healthy_hosts: 2,
      max_downtime_minutes: 120
    }
  });

  const dellServers = servers.filter(server => 
    server.model?.toLowerCase().includes('dell') || 
    server.service_tag?.match(/^[A-Z0-9]{7}$/)
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      online: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      offline: { variant: "destructive" as const, icon: AlertTriangle, color: "text-red-600" },
      maintenance: { variant: "secondary" as const, icon: Settings, color: "text-yellow-600" },
      updating: { variant: "secondary" as const, icon: RotateCw, color: "text-blue-600" },
      unknown: { variant: "outline" as const, icon: AlertTriangle, color: "text-gray-600" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.unknown;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getPlanStatusBadge = (status: string) => {
    const variants = {
      planned: { variant: "outline" as const, icon: Calendar },
      running: { variant: "default" as const, icon: Play },
      paused: { variant: "secondary" as const, icon: Pause },
      completed: { variant: "default" as const, icon: CheckCircle },
      failed: { variant: "destructive" as const, icon: AlertTriangle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.planned;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const handleCreateOrchestrationPlan = async () => {
    if (!newOrchestrationPlan.name || selectedServers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide a plan name and select at least one server",
        variant: "destructive",
      });
      return;
    }

    await createOrchestrationPlan({
      name: newOrchestrationPlan.name,
      server_ids: selectedServers,
      vmware_settings: newOrchestrationPlan.vmware_settings,
      safety_checks: newOrchestrationPlan.safety_checks
    });

    setNewOrchestrationPlan({
      ...newOrchestrationPlan,
      name: ''
    });
    setSelectedServers([]);
  };

  const handleServerBackup = async (serverId: string, backupType: 'idrac_config' | 'bios_profile' | 'esxi_config') => {
    await createServerBackup(serverId, backupType);
  };

  const handleMaintenanceMode = async (serverId: string, enter: boolean) => {
    if (enter) {
      await enterMaintenanceMode(serverId, true);
    } else {
      await exitMaintenanceMode(serverId);
    }
  };

  const compatibilityChecks = dellServers.map(server => {
    const compatiblePackages = dellPackages.filter(pkg => 
      pkg.service_tag_compatibility.length === 0 || 
      pkg.service_tag_compatibility.includes(server.service_tag || '')
    );
    
    return {
      server,
      total_packages: dellPackages.length,
      compatible_packages: compatiblePackages.length,
      compatibility_score: Math.round((compatiblePackages.length / Math.max(dellPackages.length, 1)) * 100)
    };
  });

  if (dellLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RotateCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading enterprise features...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dell Enterprise Management</h2>
          <p className="text-muted-foreground">
            Professional Dell PowerEdge + VMware ESXi firmware management
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                <Zap className="w-4 h-4 mr-2" />
                Create Orchestration Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Update Orchestration Plan</DialogTitle>
                <DialogDescription>
                  Plan and execute coordinated firmware updates across Dell servers with VMware integration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    value={newOrchestrationPlan.name}
                    onChange={(e) => setNewOrchestrationPlan(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Q1 2024 Production Updates"
                  />
                </div>

                <div>
                  <Label>Target Servers</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {dellServers.map((server) => (
                      <div key={server.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`server-${server.id}`}
                          checked={selectedServers.includes(server.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedServers(prev => [...prev, server.id]);
                            } else {
                              setSelectedServers(prev => prev.filter(id => id !== server.id));
                            }
                          }}
                        />
                        <Label htmlFor={`server-${server.id}`} className="text-sm">
                          {server.hostname}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {selectedServers.length} servers
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>VMware Settings</Label>
                    <div className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Maintenance Mode</span>
                        <Checkbox
                          checked={newOrchestrationPlan.vmware_settings.enable_maintenance_mode}
                          onCheckedChange={(checked) => 
                            setNewOrchestrationPlan(prev => ({
                              ...prev,
                              vmware_settings: { ...prev.vmware_settings, enable_maintenance_mode: !!checked }
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Evacuate VMs</span>
                        <Checkbox
                          checked={newOrchestrationPlan.vmware_settings.evacuate_vms}
                          onCheckedChange={(checked) => 
                            setNewOrchestrationPlan(prev => ({
                              ...prev,
                              vmware_settings: { ...prev.vmware_settings, evacuate_vms: !!checked }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Safety Checks</Label>
                    <div className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Verify Backups</span>
                        <Checkbox
                          checked={newOrchestrationPlan.safety_checks.verify_backups}
                          onCheckedChange={(checked) => 
                            setNewOrchestrationPlan(prev => ({
                              ...prev,
                              safety_checks: { ...prev.safety_checks, verify_backups: !!checked }
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">VMware Compatibility</span>
                        <Checkbox
                          checked={newOrchestrationPlan.safety_checks.check_vmware_compatibility}
                          onCheckedChange={(checked) => 
                            setNewOrchestrationPlan(prev => ({
                              ...prev,
                              safety_checks: { ...prev.safety_checks, check_vmware_compatibility: !!checked }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleCreateOrchestrationPlan} className="w-full">
                  <Target className="w-4 h-4 mr-2" />
                  Create Orchestration Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enterprise Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dell Servers</p>
                <p className="text-2xl font-bold">{dellServers.length}</p>
              </div>
              <HardDrive className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Update Packages</p>
                <p className="text-2xl font-bold">{dellPackages.length}</p>
              </div>
              <Download className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Virtual Machines</p>
                <p className="text-2xl font-bold">{virtualMachines.length}</p>
              </div>
              <Monitor className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orchestration Plans</p>
                <p className="text-2xl font-bold">{orchestrationPlans.length}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orchestration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orchestration">Orchestration Plans</TabsTrigger>
          <TabsTrigger value="dell-packages">Dell Update Packages</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility Matrix</TabsTrigger>
          <TabsTrigger value="enterprise-servers">Enterprise Servers</TabsTrigger>
        </TabsList>

        <TabsContent value="orchestration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Update Orchestration Plans
              </CardTitle>
              <CardDescription>
                Coordinated firmware updates with VMware integration and safety checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orchestrationPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Orchestration Plans</h3>
                  <p>Create your first enterprise update orchestration plan above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orchestrationPlans.map((plan) => (
                    <Card key={plan.id} className="relative">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{plan.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            {getPlanStatusBadge(plan.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Target Servers</p>
                            <p className="font-medium">{plan.server_ids.length} servers</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Progress</p>
                            <div className="flex items-center gap-2">
                              <Progress value={(plan.current_step / plan.total_steps) * 100} className="flex-1" />
                              <span className="text-sm">{plan.current_step}/{plan.total_steps}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {plan.status === 'planned' && (
                              <Button 
                                size="sm"
                                onClick={() => executeOrchestrationPlan(plan.id)}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Execute
                              </Button>
                            )}
                            {plan.status === 'running' && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dell-packages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Dell Update Packages (DUPs)
              </CardTitle>
              <CardDescription>
                Available Dell firmware packages with proper sequencing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Sequence Order</TableHead>
                    <TableHead>Requires Reboot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dellPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.package_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pkg.component_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{pkg.version}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={pkg.criticality === 'critical' ? 'destructive' : 
                                   pkg.criticality === 'recommended' ? 'default' : 'outline'}
                        >
                          {pkg.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>{pkg.update_sequence_order}</TableCell>
                      <TableCell>
                        {pkg.requires_reboot ? (
                          <CheckCircle className="w-4 h-4 text-orange-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dellPackages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No Dell update packages available. Check Dell support site for updates.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compatibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Dell + VMware Compatibility Matrix
              </CardTitle>
              <CardDescription>
                Server compatibility with available Dell firmware packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {compatibilityChecks.map((check) => (
                  <div key={check.server.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{check.server.hostname}</h4>
                        <p className="text-sm text-muted-foreground">
                          {check.server.model} • Service Tag: {check.server.service_tag || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Progress value={check.compatibility_score} className="w-20" />
                          <span className="text-sm font-medium">{check.compatibility_score}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {check.compatible_packages}/{check.total_packages} packages compatible
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enterprise-servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Enterprise Server Operations
              </CardTitle>
              <CardDescription>
                Advanced Dell server management with VMware integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Virtual Machines</TableHead>
                    <TableHead>Backups</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dellServers.map((server) => {
                    const serverVMs = virtualMachines.filter(vm => vm.server_id === server.id);
                    const serverBackupsCount = serverBackups.filter(backup => backup.server_id === server.id).length;
                    
                    return (
                      <TableRow key={server.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{server.hostname}</p>
                            <p className="text-sm text-muted-foreground">{server.model}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(server.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            <span>{serverVMs.length} VMs</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => syncVMsFromHost(server.id)}
                            >
                              <RotateCw className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{serverBackupsCount} backups</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleServerBackup(server.id, 'idrac_config')}
                              title="Backup iDRAC Config"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMaintenanceMode(server.id, server.status !== 'maintenance')}
                              title={server.status === 'maintenance' ? 'Exit Maintenance' : 'Enter Maintenance'}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}