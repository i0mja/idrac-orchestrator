import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useServers } from "@/hooks/useServers";
import { useVCenterIntegratedServers } from "@/hooks/useVCenterIntegratedServers";
import { useVCenterService } from "@/hooks/useVCenterService";
import { 
  Calendar,
  Clock,
  Monitor,
  Building2,
  Globe,
  Cpu,
  Settings,
  AlertTriangle,
  CheckCircle,
  Play,
  RefreshCw,
  Shield,
  HardDrive
} from "lucide-react";

interface TaskSchedulerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskSchedulerDialog({ open, onOpenChange }: TaskSchedulerDialogProps) {
  const { servers: basicServers } = useServers();
  const { servers: integratedServers, getVCenterManagedServers, getStandaloneServers } = useVCenterIntegratedServers();
  const { vcenters, clusters } = useVCenterService();
  
  // Use integrated servers that include vCenter information
  const servers = integratedServers.length > 0 ? integratedServers : basicServers;
  
  const [activeTab, setActiveTab] = useState("general");
  
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    target_type: 'datacenter' as 'datacenter' | 'cluster' | 'individual' | 'os_type',
    target_names: [] as string[],
    command_type: 'firmware_update' as 'firmware_update' | 'bios_update' | 'idrac_update' | 'reboot' | 'maintenance_mode' | 'health_check' | 'os_patch',
    target_components: [] as string[],
    trigger_type: 'manual' as 'manual' | 'scheduled' | 'maintenance',
    scheduled_at: '',
    maintenance_window: true,
    command_parameters: {}
  });

  const commandTypes = [
    { value: 'firmware_update', label: 'Update Firmware', icon: Settings, description: 'Update BIOS, iDRAC, and other components via out-of-band management' },
    { value: 'bios_update', label: 'Update BIOS Only', icon: Cpu, description: 'Update system BIOS firmware only' },
    { value: 'idrac_update', label: 'Update iDRAC', icon: Shield, description: 'Update Dell iDRAC firmware' },
    { value: 'reboot', label: 'System Reboot', icon: RefreshCw, description: 'Gracefully reboot target systems' },
    { value: 'maintenance_mode', label: 'Maintenance Mode', icon: Clock, description: 'Put systems into maintenance mode' },
    { value: 'health_check', label: 'Health Check', icon: CheckCircle, description: 'Run comprehensive hardware health checks' },
    { value: 'os_patch', label: 'OS Patching', icon: Monitor, description: 'Apply operating system patches (in-band)' }
  ];

  const componentTypes = [
    'BIOS',
    'iDRAC',
    'NIC/LOM',
    'Storage Controller',
    'Power Supply',
    'System CPLD',
    'Lifecycle Controller'
  ];

  const vCenterClusters = [...new Set(servers.filter(s => s.cluster_name).map(s => s.cluster_name!))];
  const uniqueDatacenters = [...new Set(servers.map(s => (s as any).datacenter || (s as any).site_id).filter(Boolean))];
  const osTypes = [...new Set(servers.map(s => s.operating_system).filter(Boolean))];

  const handleSubmit = () => {
    if (!newTask.name || !newTask.target_names.length) return;
    
    // Mock submit - in real app this would create the task
    console.log('Creating task:', newTask);
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Scheduled Task
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="triggers">Triggers</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
          </TabsList>

          <div className="mt-6 max-h-[60vh] overflow-y-auto">
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-name">Name *</Label>
                      <Input
                        id="task-name"
                        placeholder="e.g., Monthly BIOS Updates - DC1"
                        value={newTask.name}
                        onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-description">Description</Label>
                      <Input
                        id="task-description"
                        placeholder="Optional description"
                        value={newTask.description}
                        onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="triggers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    When to Run This Task
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select 
                      value={newTask.trigger_type} 
                      onValueChange={(value: any) => setNewTask(prev => ({ ...prev, trigger_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            Run manually (one-time execution)
                          </div>
                        </SelectItem>
                        <SelectItem value="scheduled">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Schedule for specific date/time
                          </div>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            During next maintenance window
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newTask.trigger_type === 'scheduled' && (
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time">Schedule Date & Time</Label>
                      <Input
                        id="scheduled-time"
                        type="datetime-local"
                        min={new Date().toISOString().slice(0, 16)}
                        value={newTask.scheduled_at}
                        onChange={(e) => setNewTask(prev => ({ ...prev, scheduled_at: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Task will run at the specified time in the datacenter's local timezone
                      </p>
                    </div>
                  )}

                  {newTask.trigger_type === 'maintenance' && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Task will be scheduled automatically during the next maintenance window for the selected datacenter(s).
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Target Selection - What should this task manage?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>vCenter Environments</Label>
                        <div className="text-sm text-muted-foreground">
                          Select vCenter managed systems
                        </div>
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                          {vcenters.map(vc => (
                            <div key={vc.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`vc-${vc.id}`}
                                className="rounded"
                              />
                              <Label htmlFor={`vc-${vc.id}`} className="text-sm">
                                {vc.name} ({servers.filter(s => s.vcenter_id === vc.id).length} hosts)
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>vCenter Clusters</Label>
                        <div className="text-sm text-muted-foreground">
                          Select specific clusters within vCenter
                        </div>
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                          {clusters.map(cluster => (
                            <div key={cluster.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`cluster-${cluster.id}`}
                                className="rounded"
                              />
                              <Label htmlFor={`cluster-${cluster.id}`} className="text-sm">
                                {cluster.name} ({cluster.total_hosts} hosts)
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Datacenters</Label>
                        <div className="text-sm text-muted-foreground">
                          Select specific datacenters to target
                        </div>
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                          {uniqueDatacenters.map(dc => (
                            <div key={dc} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`dc-${dc}`}
                                className="rounded"
                              />
                              <Label htmlFor={`dc-${dc}`} className="text-sm">
                                {dc} ({servers.filter(s => (s as any).datacenter === dc || (s as any).site_id === dc).length} servers)
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Management Type</Label>
                        <div className="text-sm text-muted-foreground">
                          Filter by management type
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="vcenter-managed"
                              className="rounded"
                            />
                            <Label htmlFor="vcenter-managed" className="text-sm">
                              vCenter Managed ({getVCenterManagedServers().length} hosts)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="standalone"
                              className="rounded"
                            />
                            <Label htmlFor="standalone" className="text-sm">
                              Standalone ({getStandaloneServers().length} hosts)
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  
                    <div className="space-y-2">
                      <Label>Individual Servers</Label>
                      <div className="text-sm text-muted-foreground">
                        Select specific servers to target
                      </div>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                        {servers.slice(0, 10).map(server => (
                          <div key={server.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`server-${server.id}`}
                              className="rounded"
                            />
                            <Label htmlFor={`server-${server.id}`} className="text-sm">
                              {server.hostname} ({(server as any).vcenter_name ? 'vCenter' : 'Standalone'})
                            </Label>
                          </div>
                        ))}
                        {servers.length > 10 && (
                          <div className="text-xs text-muted-foreground">
                            And {servers.length - 10} more servers...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select
                      value={newTask.command_type}
                      onValueChange={(value: any) => setNewTask(prev => ({ ...prev, command_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {commandTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {commandTypes.find(t => t.value === newTask.command_type)?.description}
                    </p>
                  </div>

                  {(newTask.command_type === 'firmware_update' || newTask.command_type === 'bios_update' || newTask.command_type === 'idrac_update') && (
                    <div className="space-y-2">
                      <Label>Hardware Components to Update</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {componentTypes.map((component) => (
                          <div key={component} className="flex items-center space-x-2 p-2 rounded border bg-card">
                            <input
                              type="checkbox"
                              id={`component-${component}`}
                              checked={newTask.target_components.includes(component)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTask(prev => ({ 
                                    ...prev, 
                                    target_components: [...prev.target_components, component] 
                                  }));
                                } else {
                                  setNewTask(prev => ({ 
                                    ...prev, 
                                    target_components: prev.target_components.filter(comp => comp !== component) 
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`component-${component}`} className="text-sm cursor-pointer">
                              {component}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Summary & Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/20 rounded-lg p-4 border">
                    <h4 className="font-medium mb-3">Task Configuration Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Task Name:</span>
                        <span>{newTask.name || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Action:</span>
                        <span>{commandTypes.find(t => t.value === newTask.command_type)?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">vCenter Integration:</span>
                        <span>{vcenters.length} vCenters, {getVCenterManagedServers().length} managed hosts</span>
                      </div>
                      {newTask.target_components.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Components:</span>
                          <span>{newTask.target_components.join(', ')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Execution:</span>
                        <span>
                          {newTask.trigger_type === 'manual' ? 'Run immediately' :
                           newTask.trigger_type === 'scheduled' ? `Scheduled for ${newTask.scheduled_at ? new Date(newTask.scheduled_at).toLocaleString() : 'Not set'}` :
                           'Next maintenance window'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This task will integrate with vCenter APIs for cluster-aware operations and use Dell iDRAC out-of-band management when possible for maximum reliability. 
                      Maintenance windows will be respected for scheduled operations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!newTask.name}
            >
              {newTask.trigger_type === 'manual' ? 'Run Task Now' : 'Create Scheduled Task'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}