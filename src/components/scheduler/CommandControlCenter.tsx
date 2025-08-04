import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Terminal,
  Play,
  Pause,
  Settings,
  Calendar,
  Users,
  Building2,
  Command,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Send
} from "lucide-react";

interface UpdateCommand {
  id: string;
  name: string;
  target_type: 'cluster' | 'host_group' | 'individual';
  target_names: string[];
  command_type: 'update_firmware' | 'reboot' | 'maintenance_mode' | 'health_check';
  command_parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  scheduled_at?: string;
  executed_at?: string;
  created_by: string;
  created_at: string;
}

interface RotationPolicy {
  id: string;
  name: string;
  target_type: 'cluster' | 'host_group';
  target_groups: string[];
  rotation_interval_days: number;
  maintenance_window_start: string;
  maintenance_window_end: string;
  command_template: Record<string, any>;
  enabled: boolean;
  last_executed?: string;
  next_execution: string;
}

interface ClusterInfo {
  name: string;
  host_count: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface HostGroupInfo {
  name: string;
  host_count: number;
  environment: string;
  status: 'healthy' | 'warning' | 'critical';
}

export function CommandControlCenter() {
  const [commands, setCommands] = useState<UpdateCommand[]>([]);
  const [rotationPolicies, setRotationPolicies] = useState<RotationPolicy[]>([]);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [hostGroups, setHostGroups] = useState<HostGroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandDialogOpen, setIsCommandDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const [newCommand, setNewCommand] = useState({
    name: '',
    target_type: 'cluster' as 'cluster' | 'host_group' | 'individual',
    target_names: [] as string[],
    command_type: 'update_firmware' as 'update_firmware' | 'reboot' | 'maintenance_mode' | 'health_check',
    command_parameters: {},
    scheduled_at: ''
  });

  const [newPolicy, setNewPolicy] = useState({
    name: '',
    target_type: 'cluster' as 'cluster' | 'host_group',
    target_groups: [] as string[],
    rotation_interval_days: 30,
    maintenance_window_start: '02:00',
    maintenance_window_end: '06:00',
    command_template: { command_type: 'update_firmware', version_target: 'latest' },
    enabled: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load servers and build cluster/group info
      const { data: serversData, error: serversError } = await supabase
        .from('servers')
        .select('id, hostname, cluster_name, environment, status, vcenter_id');
      
      if (serversError) throw serversError;

      // Process clusters
      const clusterData = serversData?.reduce((acc: Record<string, ClusterInfo>, server) => {
        if (server.cluster_name) {
          if (!acc[server.cluster_name]) {
            acc[server.cluster_name] = {
              name: server.cluster_name,
              host_count: 0,
              status: 'healthy'
            };
          }
          acc[server.cluster_name].host_count++;
          // Update status based on server health
          if (server.status !== 'online' && acc[server.cluster_name].status === 'healthy') {
            acc[server.cluster_name].status = 'warning';
          }
        }
        return acc;
      }, {});
      
      setClusters(Object.values(clusterData || {}));

      // Process host groups by environment
      const hostGroupData = serversData?.reduce((acc: Record<string, HostGroupInfo>, server) => {
        const key = server.environment;
        if (!acc[key]) {
          acc[key] = {
            name: server.environment,
            host_count: 0,
            environment: server.environment,
            status: 'healthy'
          };
        }
        acc[key].host_count++;
        if (server.status !== 'online' && acc[key].status === 'healthy') {
          acc[key].status = 'warning';
        }
        return acc;
      }, {});
      
      setHostGroups(Object.values(hostGroupData || {}));

      // Load mock commands and policies
      setCommands([
        {
          id: '1',
          name: 'Production Cluster Firmware Update',
          target_type: 'cluster',
          target_names: ['Production'],
          command_type: 'update_firmware',
          command_parameters: { version_target: 'latest', reboot_required: true },
          status: 'pending',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          created_by: 'admin',
          created_at: new Date().toISOString()
        }
      ]);

      setRotationPolicies([
        {
          id: '1',
          name: 'Quarterly Cluster Updates',
          target_type: 'cluster',
          target_groups: ['Production', 'Staging', 'Development'],
          rotation_interval_days: 90,
          maintenance_window_start: '02:00',
          maintenance_window_end: '06:00',
          command_template: { command_type: 'update_firmware', version_target: 'latest' },
          enabled: true,
          next_execution: new Date(Date.now() + 2592000000).toISOString()
        }
      ]);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load command center data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendCommand = async () => {
    if (!newCommand.name || !newCommand.target_names.length) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const command: UpdateCommand = {
        id: Date.now().toString(),
        name: newCommand.name,
        target_type: newCommand.target_type,
        target_names: newCommand.target_names,
        command_type: newCommand.command_type,
        command_parameters: newCommand.command_parameters,
        status: newCommand.scheduled_at ? 'pending' : 'executing',
        scheduled_at: newCommand.scheduled_at || undefined,
        created_by: 'current_user',
        created_at: new Date().toISOString(),
        executed_at: newCommand.scheduled_at ? undefined : new Date().toISOString()
      };

      // Call command execution edge function
      const { error } = await supabase.functions.invoke('execute-remote-command', {
        body: {
          command: command,
          immediate_execution: !newCommand.scheduled_at
        }
      });

      if (error) throw error;

      setCommands(prev => [...prev, command]);
      setIsCommandDialogOpen(false);
      
      // Reset form
      setNewCommand({
        name: '',
        target_type: 'cluster',
        target_names: [],
        command_type: 'update_firmware',
        command_parameters: {},
        scheduled_at: ''
      });

      toast({
        title: "Command Sent",
        description: `${newCommand.command_type} command sent to ${newCommand.target_names.join(', ')}`,
      });

    } catch (error) {
      console.error('Error sending command:', error);
      toast({
        title: "Error",
        description: "Failed to send command",
        variant: "destructive"
      });
    }
  };

  const createRotationPolicy = async () => {
    if (!newPolicy.name || !newPolicy.target_groups.length) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const policy: RotationPolicy = {
        id: Date.now().toString(),
        name: newPolicy.name,
        target_type: newPolicy.target_type,
        target_groups: newPolicy.target_groups,
        rotation_interval_days: newPolicy.rotation_interval_days,
        maintenance_window_start: newPolicy.maintenance_window_start,
        maintenance_window_end: newPolicy.maintenance_window_end,
        command_template: newPolicy.command_template,
        enabled: newPolicy.enabled,
        next_execution: new Date(Date.now() + newPolicy.rotation_interval_days * 24 * 60 * 60 * 1000).toISOString()
      };

      setRotationPolicies(prev => [...prev, policy]);
      setIsPolicyDialogOpen(false);
      
      // Reset form
      setNewPolicy({
        name: '',
        target_type: 'cluster',
        target_groups: [],
        rotation_interval_days: 30,
        maintenance_window_start: '02:00',
        maintenance_window_end: '06:00',
        command_template: { command_type: 'update_firmware', version_target: 'latest' },
        enabled: true
      });

      toast({
        title: "Policy Created",
        description: "Rotation policy has been created successfully",
      });

    } catch (error) {
      console.error('Error creating policy:', error);
      toast({
        title: "Error",
        description: "Failed to create rotation policy",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-blue-500">Pending</Badge>;
      case 'executing': return <Badge className="bg-purple-500">Executing</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCommandTypeIcon = (type: string) => {
    switch (type) {
      case 'update_firmware': return <Settings className="w-4 h-4" />;
      case 'reboot': return <Play className="w-4 h-4" />;
      case 'maintenance_mode': return <Pause className="w-4 h-4" />;
      case 'health_check': return <CheckCircle className="w-4 h-4" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-muted/20 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Command className="w-6 h-6" />
            Command & Control Center
          </h2>
          <p className="text-muted-foreground">Send commands to remote hosts and configure automation policies</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCommandDialogOpen(true)}>
            <Send className="w-4 h-4 mr-2" />
            Send Command
          </Button>
          <Button variant="outline" onClick={() => setIsPolicyDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Policy
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clusters</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clusters.length}</div>
            <p className="text-xs text-muted-foreground">
              {clusters.reduce((sum, c) => sum + c.host_count, 0)} total hosts
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Host Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hostGroups.length}</div>
            <p className="text-xs text-muted-foreground">Environment groups</p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Commands</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commands.filter(c => c.status === 'executing' || c.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotation Policies</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rotationPolicies.filter(p => p.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Active policies</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="commands" className="space-y-6">
        <TabsList>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="policies">Rotation Policies</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="space-y-6">
          {/* Recent Commands */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Command History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Command</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Targets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Executed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.map((command) => (
                    <TableRow key={command.id}>
                      <TableCell className="font-medium">{command.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCommandTypeIcon(command.command_type)}
                          <span className="capitalize">{command.command_type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {command.target_names.map((name) => (
                            <Badge key={name} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(command.status)}</TableCell>
                      <TableCell>
                        {command.executed_at ? new Date(command.executed_at).toLocaleString() : 
                         command.scheduled_at ? `Scheduled for ${new Date(command.scheduled_at).toLocaleString()}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          {/* Rotation Policies */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Automated Rotation Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Target Groups</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Maintenance Window</TableHead>
                    <TableHead>Next Execution</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotationPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {policy.target_groups.map((group) => (
                            <Badge key={group} variant="outline" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{policy.rotation_interval_days} days</TableCell>
                      <TableCell>{policy.maintenance_window_start} - {policy.maintenance_window_end}</TableCell>
                      <TableCell>{new Date(policy.next_execution).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={policy.enabled ? "default" : "secondary"}>
                          {policy.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clusters */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Clusters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clusters.map((cluster) => (
                    <div key={cluster.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{cluster.name}</div>
                        <div className="text-sm text-muted-foreground">{cluster.host_count} hosts</div>
                      </div>
                      <Badge variant={cluster.status === 'healthy' ? 'default' : 'secondary'}>
                        {cluster.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Host Groups */}
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Host Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hostGroups.map((group) => (
                    <div key={group.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-muted-foreground">{group.host_count} hosts</div>
                      </div>
                      <Badge variant={group.status === 'healthy' ? 'default' : 'secondary'}>
                        {group.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Send Command Dialog */}
      <Dialog open={isCommandDialogOpen} onOpenChange={setIsCommandDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Remote Command</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="command-name">Command Name</Label>
                <Input
                  id="command-name"
                  value={newCommand.name}
                  onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Production Firmware Update"
                />
              </div>
              
              <div>
                <Label htmlFor="command-type">Command Type</Label>
                <Select value={newCommand.command_type} onValueChange={(value: any) =>
                  setNewCommand(prev => ({ ...prev, command_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update_firmware">Update Firmware</SelectItem>
                    <SelectItem value="reboot">Reboot</SelectItem>
                    <SelectItem value="maintenance_mode">Maintenance Mode</SelectItem>
                    <SelectItem value="health_check">Health Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-type">Target Type</Label>
                <Select value={newCommand.target_type} onValueChange={(value: any) =>
                  setNewCommand(prev => ({ ...prev, target_type: value, target_names: [] }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cluster">Cluster</SelectItem>
                    <SelectItem value="host_group">Host Group</SelectItem>
                    <SelectItem value="individual">Individual Host</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schedule-time">Schedule Time (Optional)</Label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={newCommand.scheduled_at}
                  onChange={(e) => setNewCommand(prev => ({ ...prev, scheduled_at: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Select Targets</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {(newCommand.target_type === 'cluster' ? clusters.map(c => c.name) : 
                  newCommand.target_type === 'host_group' ? hostGroups.map(g => g.name) : 
                  []).map((target) => (
                  <label key={target} className="flex items-center space-x-2 p-2 hover:bg-muted/20 rounded">
                    <input
                      type="checkbox"
                      checked={newCommand.target_names.includes(target)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCommand(prev => ({ ...prev, target_names: [...prev.target_names, target] }));
                        } else {
                          setNewCommand(prev => ({ ...prev, target_names: prev.target_names.filter(n => n !== target) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{target}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCommandDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendCommand}>
                Send Command
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Policy Dialog */}
      <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Rotation Policy</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="policy-name">Policy Name</Label>
                <Input
                  id="policy-name"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Quarterly Updates"
                />
              </div>
              
              <div>
                <Label htmlFor="rotation-interval">Rotation Interval (Days)</Label>
                <Input
                  id="rotation-interval"
                  type="number"
                  value={newPolicy.rotation_interval_days}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, rotation_interval_days: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="policy-target-type">Target Type</Label>
                <Select value={newPolicy.target_type} onValueChange={(value: any) =>
                  setNewPolicy(prev => ({ ...prev, target_type: value, target_groups: [] }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cluster">Clusters</SelectItem>
                    <SelectItem value="host_group">Host Groups</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maintenance-start">Maintenance Start</Label>
                <Input
                  id="maintenance-start"
                  type="time"
                  value={newPolicy.maintenance_window_start}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, maintenance_window_start: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="maintenance-end">Maintenance End</Label>
                <Input
                  id="maintenance-end"
                  type="time"
                  value={newPolicy.maintenance_window_end}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, maintenance_window_end: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Target Groups</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {(newPolicy.target_type === 'cluster' ? clusters.map(c => c.name) : 
                  hostGroups.map(g => g.name)).map((target) => (
                  <label key={target} className="flex items-center space-x-2 p-2 hover:bg-muted/20 rounded">
                    <input
                      type="checkbox"
                      checked={newPolicy.target_groups.includes(target)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewPolicy(prev => ({ ...prev, target_groups: [...prev.target_groups, target] }));
                        } else {
                          setNewPolicy(prev => ({ ...prev, target_groups: prev.target_groups.filter(n => n !== target) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{target}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newPolicy.enabled}
                onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, enabled: checked }))}
              />
              <Label>Enable policy immediately</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createRotationPolicy}>
                Create Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}