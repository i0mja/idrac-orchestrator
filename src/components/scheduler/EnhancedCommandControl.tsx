// Enhanced: OS-agnostic command control with multi-datacenter orchestration
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { AutomationPolicies } from "@/components/scheduler/AutomationPolicies";
import { TaskSchedulerDialog } from "@/components/scheduler/TaskSchedulerDialog";
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
  Send,
  Monitor,
  Shield,
  Globe,
  Zap,
  HardDrive,
  Cpu,
  RefreshCw
} from "lucide-react";

interface EnhancedCommand {
  id: string;
  name: string;
  target_type: 'datacenter' | 'cluster' | 'host_group' | 'individual' | 'os_type';
  target_names: string[];
  command_type: 'firmware_update' | 'bios_update' | 'idrac_update' | 'reboot' | 'maintenance_mode' | 'health_check' | 'os_patch';
  target_components?: string[]; // Enhanced: Specific components (BIOS, iDRAC, NIC, Storage)
  os_compatibility?: string[]; // Enhanced: OS restrictions
  start_date?: string; // Enhanced: Specific start date
  command_parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  scheduled_at?: string;
  executed_at?: string;
  created_by: string;
  created_at: string;
}

interface EnhancedAutomationPolicy {
  id: string;
  name: string;
  target_type: 'datacenter' | 'cluster' | 'host_group' | 'os_type';
  target_groups: string[];
  target_components: string[]; // Enhanced: What to update (BIOS, iDRAC, etc.)
  rotation_interval_days: number;
  start_date: string; // Enhanced: When to start
  maintenance_window_start: string;
  maintenance_window_end: string;
  timezone: string; // Enhanced: Datacenter-specific timezone
  command_template: Record<string, any>;
  os_restrictions?: string[]; // Enhanced: OS compatibility
  enabled: boolean;
  last_executed?: string;
  next_execution: string;
}

export function EnhancedCommandControl() {
  const [commands, setCommands] = useState<EnhancedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandDialogOpen, setIsCommandDialogOpen] = useState(false);
  
  const { servers, datacenters, osCompatibility } = useEnhancedServers();
  const { toast } = useToast();

  const [newCommand, setNewCommand] = useState({
    name: '',
    target_type: 'datacenter' as const,
    target_names: [] as string[],
    command_type: 'firmware_update' as const,
    target_components: [] as string[],
    os_compatibility: [] as string[],
    start_date: '',
    command_parameters: {},
    scheduled_at: ''
  });

  // Enhanced: Component types for Dell servers
  const componentTypes = [
    'BIOS',
    'iDRAC',
    'NIC/LOM',
    'Storage Controller',
    'Power Supply',
    'System CPLD',
    'Lifecycle Controller'
  ];

  // Enhanced: Command types with OS-agnostic focus
  const commandTypes = [
    { value: 'firmware_update', label: 'Firmware Update (Out-of-band)', icon: Settings },
    { value: 'bios_update', label: 'BIOS Update (iDRAC)', icon: Cpu },
    { value: 'idrac_update', label: 'iDRAC Update', icon: Shield },
    { value: 'reboot', label: 'System Reboot', icon: RefreshCw },
    { value: 'maintenance_mode', label: 'Maintenance Mode', icon: Pause },
    { value: 'health_check', label: 'Health Check', icon: CheckCircle },
    { value: 'os_patch', label: 'OS Patching (In-band)', icon: Monitor }
  ];

  // Enhanced: OS types from compatibility matrix
  const supportedOSTypes = [...new Set(osCompatibility.map(os => os.operating_system))];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Enhanced: Load sample data with new structure
      setCommands([
        {
          id: '1',
          name: 'DC1 BIOS & iDRAC Update',
          target_type: 'datacenter',
          target_names: ['DC1-East'],
          command_type: 'firmware_update',
          target_components: ['BIOS', 'iDRAC'],
          os_compatibility: ['VMware ESXi', 'CentOS', 'RHEL'],
          start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          command_parameters: { 
            out_of_band_only: true, 
            reboot_required: true,
            max_simultaneous: 1 
          },
          status: 'pending',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          created_by: 'admin',
          created_at: new Date().toISOString()
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

  const sendEnhancedCommand = async (taskData: any) => {
    if (!taskData.name || !taskData.target_names.length) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const command: EnhancedCommand = {
        id: Date.now().toString(),
        name: taskData.name,
        target_type: taskData.target_type,
        target_names: taskData.target_names,
        command_type: taskData.command_type,
        target_components: taskData.target_components || [],
        os_compatibility: taskData.os_compatibility || [],
        start_date: taskData.start_date,
        command_parameters: {
          ...taskData.command_parameters,
          out_of_band_preferred: true,
          eol_handling: 'force_out_of_band'
        },
        status: taskData.scheduled_at ? 'pending' : 'executing',
        scheduled_at: taskData.scheduled_at || undefined,
        created_by: 'current_user',
        created_at: new Date().toISOString(),
        executed_at: taskData.scheduled_at ? undefined : new Date().toISOString()
      };

      // Enhanced: Call enhanced command execution
      const { error } = await supabase.functions.invoke('execute-remote-command', {
        body: {
          command: command,
          immediate_execution: !newCommand.scheduled_at,
          enhanced_mode: true
        }
      });

      if (error) throw error;

      setCommands(prev => [...prev, command]);
      setIsCommandDialogOpen(false);
      
      // Reset form
      setNewCommand({
        name: '',
        target_type: 'datacenter',
        target_names: [],
        command_type: 'firmware_update',
        target_components: [],
        os_compatibility: [],
        start_date: '',
        command_parameters: {},
        scheduled_at: ''
      });

      toast({
        title: "Enhanced Command Sent",
        description: `${command.target_components.join(', ')} update sent to ${command.target_names.join(', ')}`,
      });

    } catch (error) {
      console.error('Error sending command:', error);
      toast({
        title: "Error",
        description: "Failed to send enhanced command",
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
    const commandType = commandTypes.find(ct => ct.value === type);
    const Icon = commandType?.icon || Terminal;
    return <Icon className="w-4 h-4" />;
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
            Enhanced Command & Control Center
          </h2>
          <p className="text-muted-foreground">OS-agnostic orchestration with multi-datacenter support</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCommandDialogOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Enhanced: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Datacenters</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datacenters.length}</div>
            <p className="text-xs text-muted-foreground">
              {servers.length} total servers
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OS Types</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportedOSTypes.length}</div>
            <p className="text-xs text-muted-foreground">Supported variants</p>
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
            <CardTitle className="text-sm font-medium">Automation Policies</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Active policies</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="commands" className="space-y-6">
        <TabsList>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="policies">Automation Policies</TabsTrigger>
          <TabsTrigger value="targets">Target Management</TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="space-y-6">
          {/* Enhanced: Command History */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Enhanced Command History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Command</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Targets</TableHead>
                    <TableHead>OS Compatibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.map((command) => (
                    <TableRow key={command.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getCommandTypeIcon(command.command_type)}
                          <span>{command.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {command.target_components?.map((component) => (
                            <Badge key={component} variant="outline" className="text-xs">
                              {component}
                            </Badge>
                          ))}
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
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {command.os_compatibility?.slice(0, 2).map((os) => (
                            <Badge key={os} variant="secondary" className="text-xs">
                              {os}
                            </Badge>
                          ))}
                          {command.os_compatibility && command.os_compatibility.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{command.os_compatibility.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(command.status)}</TableCell>
                      <TableCell>
                        {command.start_date ? new Date(command.start_date).toLocaleDateString() : 
                         command.executed_at ? new Date(command.executed_at).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          {/* Use the proper AutomationPolicies component with clear explanations */}
          <AutomationPolicies servers={servers} />
        </TabsContent>

        <TabsContent value="targets" className="space-y-6">
          {/* Enhanced: Target Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Datacenter Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {datacenters.map((dc) => (
                    <div key={dc.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-subtle border border-border/50">
                      <div>
                        <div className="font-medium">{dc.name}</div>
                        <div className="text-sm text-muted-foreground">{dc.location}</div>
                        <div className="text-xs text-muted-foreground">
                          Window: {dc.maintenance_window_start} - {dc.maintenance_window_end} ({dc.timezone})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {servers.filter(s => s.site_id === dc.id).length}
                        </div>
                        <div className="text-xs text-muted-foreground">servers</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  OS Type Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supportedOSTypes.map((osType) => {
                    const osServers = servers.filter(s => s.operating_system === osType);
                    const eolRisk = osCompatibility.find(os => 
                      os.operating_system === osType && os.support_status === 'eol'
                    );
                    
                    return (
                      <div key={osType} className="flex items-center justify-between p-3 rounded-lg bg-gradient-subtle border border-border/50">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{osType}</div>
                            <div className="text-xs text-muted-foreground">
                              {osServers.filter(s => s.ism_installed).length} with iSM
                            </div>
                          </div>
                          {eolRisk && (
                            <Badge variant="destructive" className="text-xs">EOL Risk</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{osServers.length}</div>
                          <div className="text-xs text-muted-foreground">servers</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Scheduler Dialog */}
      <TaskSchedulerDialog
        isOpen={isCommandDialogOpen}
        onClose={() => setIsCommandDialogOpen(false)}
        onSubmit={sendEnhancedCommand}
        servers={servers}
        datacenters={datacenters}
        supportedOSTypes={supportedOSTypes}
      />
    </div>
  );
}