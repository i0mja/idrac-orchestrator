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
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: any) => void;
  servers: any[];
  datacenters: any[];
  supportedOSTypes: string[];
}

export function TaskSchedulerDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  servers, 
  datacenters, 
  supportedOSTypes 
}: TaskSchedulerDialogProps) {
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

  const clusters = [...new Set(servers.filter(s => s.cluster_name).map(s => s.cluster_name))];

  const handleSubmit = () => {
    if (!newTask.name || !newTask.target_names.length) return;
    
    onSubmit({
      id: Date.now().toString(),
      name: newTask.name,
      description: newTask.description,
      target_type: newTask.target_type,
      target_names: newTask.target_names,
      command_type: newTask.command_type,
      target_components: newTask.target_components,
      status: newTask.scheduled_at ? 'pending' : 'executing',
      scheduled_at: newTask.scheduled_at || undefined,
      created_by: 'current_user',
      created_at: new Date().toISOString(),
      executed_at: newTask.scheduled_at ? undefined : new Date().toISOString(),
      command_parameters: {
        ...newTask.command_parameters,
        trigger_type: newTask.trigger_type,
        maintenance_window: newTask.maintenance_window
      }
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                    What Action Should This Task Perform
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  <div className="space-y-2">
                    <Label>Target Scope</Label>
                    <Select
                      value={newTask.target_type}
                      onValueChange={(value: any) => setNewTask(prev => ({ ...prev, target_type: value, target_names: [] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="datacenter">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Entire Datacenter
                          </div>
                        </SelectItem>
                        <SelectItem value="cluster">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            VMware ESXi Cluster
                          </div>
                        </SelectItem>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Specific Servers
                          </div>
                        </SelectItem>
                        <SelectItem value="os_type">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4" />
                            All Servers by OS Type
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select {newTask.target_type === 'datacenter' ? 'Datacenters' : 
                                     newTask.target_type === 'cluster' ? 'Clusters' :
                                     newTask.target_type === 'individual' ? 'Servers' : 'OS Types'}</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/20 space-y-2">
                      {newTask.target_type === 'datacenter' && datacenters.map((dc) => (
                        <div key={dc.id} className="flex items-center space-x-3 p-2 rounded border bg-card">
                          <input
                            type="checkbox"
                            id={`dc-${dc.id}`}
                            checked={newTask.target_names.includes(dc.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: [...prev.target_names, dc.name] 
                                }));
                              } else {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: prev.target_names.filter(name => name !== dc.name) 
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`dc-${dc.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                <span className="font-medium">{dc.name}</span>
                              </div>
                              <Badge variant="secondary">
                                {servers.filter(s => s.site_id === dc.id).length} servers
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {dc.location} • Maintenance: {dc.maintenance_window_start} - {dc.maintenance_window_end}
                            </div>
                          </Label>
                        </div>
                      ))}

                      {newTask.target_type === 'cluster' && clusters.map((cluster) => (
                        <div key={cluster} className="flex items-center space-x-3 p-2 rounded border bg-card">
                          <input
                            type="checkbox"
                            id={`cluster-${cluster}`}
                            checked={newTask.target_names.includes(cluster!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: [...prev.target_names, cluster!] 
                                }));
                              } else {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: prev.target_names.filter(name => name !== cluster) 
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`cluster-${cluster}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                <span className="font-medium">{cluster}</span>
                              </div>
                              <Badge variant="secondary">
                                {servers.filter(s => s.cluster_name === cluster).length} ESXi hosts
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              VMware cluster with HA/DRS coordination
                            </div>
                          </Label>
                        </div>
                      ))}

                      {newTask.target_type === 'individual' && servers.map((server) => (
                        <div key={server.id} className="flex items-center space-x-3 p-2 rounded border bg-card">
                          <input
                            type="checkbox"
                            id={`server-${server.id}`}
                            checked={newTask.target_names.includes(server.hostname)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: [...prev.target_names, server.hostname] 
                                }));
                              } else {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: prev.target_names.filter(name => name !== server.hostname) 
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`server-${server.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                <span className="font-medium">{server.hostname}</span>
                              </div>
                              <Badge variant="outline">{server.model}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {server.operating_system} • {server.environment}
                            </div>
                          </Label>
                        </div>
                      ))}

                      {newTask.target_type === 'os_type' && supportedOSTypes.map((os) => (
                        <div key={os} className="flex items-center space-x-3 p-2 rounded border bg-card">
                          <input
                            type="checkbox"
                            id={`os-${os}`}
                            checked={newTask.target_names.includes(os)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: [...prev.target_names, os] 
                                }));
                              } else {
                                setNewTask(prev => ({ 
                                  ...prev, 
                                  target_names: prev.target_names.filter(name => name !== os) 
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`os-${os}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4" />
                                <span className="font-medium">{os}</span>
                              </div>
                              <Badge variant="secondary">
                                {servers.filter(s => s.operating_system === os).length} servers
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
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
                        <span className="text-muted-foreground">Targets:</span>
                        <span>{newTask.target_names.length || 0} selected</span>
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
                      This task will use Dell iDRAC out-of-band management when possible for maximum reliability and OS independence. 
                      Maintenance windows will be respected for scheduled operations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!newTask.name || !newTask.target_names.length}
            >
              {newTask.trigger_type === 'manual' ? 'Run Task Now' : 'Create Scheduled Task'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}