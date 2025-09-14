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
  Calendar,
  Clock,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Settings,
  Users,
  Building2,
  Target,
  Zap
} from "lucide-react";

interface ScheduledUpdate {
  id: string;
  name: string;
  type: 'cluster' | 'host_group' | 'individual';
  target_ids: string[];
  target_names: string[];
  firmware_package_id: string;
  firmware_package_name: string;
  scheduled_at: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_by: string;
  created_at: string;
  progress?: number;
  maintenance_window?: {
    start: string;
    end: string;
  };
}

interface ClusterInfo {
  name: string;
  host_count: number;
  vcenter_managed: boolean;
}

interface HostGroupInfo {
  name: string;
  host_count: number;
  environment: string;
}

interface ServerInfo {
  id: string;
  hostname: string;
  cluster_name?: string;
  environment: string;
  vcenter_id?: string;
  host_type: string;
  status: string;
}

export function UpdateSchedulingCenter() {
  const [scheduledUpdates, setScheduledUpdates] = useState<ScheduledUpdate[]>([]);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [hostGroups, setHostGroups] = useState<HostGroupInfo[]>([]);
  const [firmwarePackages, setFirmwarePackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("cluster");
  
  const { toast } = useToast();

  const [newSchedule, setNewSchedule] = useState({
    name: '',
    type: 'cluster' as 'cluster' | 'host_group' | 'individual',
    target_ids: [] as string[],
    firmware_package_id: '',
    scheduled_at: '',
    maintenance_window_start: '',
    maintenance_window_end: '',
    auto_approve: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load servers
      const { data: serversData, error: serversError } = await supabase
        .from('servers')
        .select('id, hostname, cluster_name, environment, vcenter_id, host_type, status');
      
      if (serversError) throw serversError;
      setServers(serversData || []);

      // Process clusters
      const clusterData = serversData?.reduce((acc: Record<string, ClusterInfo>, server) => {
        if (server.cluster_name) {
          if (!acc[server.cluster_name]) {
            acc[server.cluster_name] = {
              name: server.cluster_name,
              host_count: 0,
              vcenter_managed: !!server.vcenter_id
            };
          }
          acc[server.cluster_name].host_count++;
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
            environment: server.environment
          };
        }
        acc[key].host_count++;
        return acc;
      }, {});
      
      setHostGroups(Object.values(hostGroupData || {}));

      // Load firmware packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('firmware_packages')
        .select('id, name, version, firmware_type');
      
      if (packagesError) throw packagesError;
      setFirmwarePackages(packagesData || []);

      // Load scheduled updates (mock for now)
      const mockScheduledUpdates: ScheduledUpdate[] = [
        {
          id: '1',
          name: 'Production Cluster BIOS Update',
          type: 'cluster',
          target_ids: ['production'],
          target_names: ['Production'],
          firmware_package_id: '1',
          firmware_package_name: 'Dell PowerEdge BIOS v2.15.0',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          status: 'scheduled',
          created_by: 'admin',
          created_at: new Date().toISOString(),
          maintenance_window: {
            start: '02:00',
            end: '06:00'
          }
        }
      ];
      
      setScheduledUpdates(mockScheduledUpdates);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduling data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateIndividualHostScheduling = (serverId: string): { allowed: boolean; reason?: string } => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return { allowed: false, reason: "Server not found" };

    // Block if server is part of a VMware cluster
    if (server.cluster_name && server.vcenter_id) {
      return { 
        allowed: false, 
        reason: `Host is part of VMware cluster "${server.cluster_name}". Schedule updates at cluster level instead.` 
      };
    }

    // Block if server is part of a host group (multiple servers in same environment)
    const environmentServers = servers.filter(s => s.environment === server.environment);
    if (environmentServers.length > 1) {
      return { 
        allowed: false, 
        reason: `Host is part of environment group "${server.environment}" with ${environmentServers.length} servers. Schedule updates at group level instead.` 
      };
    }

    return { allowed: true };
  };

  const scheduleUpdate = async () => {
    if (!newSchedule.name || !newSchedule.firmware_package_id || !newSchedule.scheduled_at) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (newSchedule.target_ids.length === 0) {
      toast({
        title: "No Targets Selected",
        description: "Please select at least one target",
        variant: "destructive"
      });
      return;
    }

    // Validate individual host scheduling
    if (newSchedule.type === 'individual') {
      for (const serverId of newSchedule.target_ids) {
        const validation = validateIndividualHostScheduling(serverId);
        if (!validation.allowed) {
          toast({
            title: "Scheduling Blocked",
            description: validation.reason,
            variant: "destructive"
          });
          return;
        }
      }
    }

    try {
      // Get target names
      let targetNames: string[] = [];
      if (newSchedule.type === 'cluster') {
        targetNames = clusters.filter(c => newSchedule.target_ids.includes(c.name)).map(c => c.name);
      } else if (newSchedule.type === 'host_group') {
        targetNames = hostGroups.filter(g => newSchedule.target_ids.includes(g.name)).map(g => g.name);
      } else {
        targetNames = servers.filter(s => newSchedule.target_ids.includes(s.id)).map(s => s.hostname);
      }

      const firmwarePackage = firmwarePackages.find(p => p.id === newSchedule.firmware_package_id);

      const scheduledUpdate: ScheduledUpdate = {
        id: Date.now().toString(),
        name: newSchedule.name,
        type: newSchedule.type,
        target_ids: newSchedule.target_ids,
        target_names: targetNames,
        firmware_package_id: newSchedule.firmware_package_id,
        firmware_package_name: firmwarePackage?.name || 'Unknown Package',
        scheduled_at: newSchedule.scheduled_at,
        status: 'scheduled',
        created_by: 'current_user',
        created_at: new Date().toISOString(),
        ...(newSchedule.maintenance_window_start && newSchedule.maintenance_window_end && {
          maintenance_window: {
            start: newSchedule.maintenance_window_start,
            end: newSchedule.maintenance_window_end
          }
        })
      };

      setScheduledUpdates(prev => [...prev, scheduledUpdate]);
      setIsScheduleDialogOpen(false);
      
      // Reset form
      setNewSchedule({
        name: '',
        type: 'cluster',
        target_ids: [],
        firmware_package_id: '',
        scheduled_at: '',
        maintenance_window_start: '',
        maintenance_window_end: '',
        auto_approve: false
      });

      toast({
        title: "Update Scheduled",
        description: `${newSchedule.type} update has been scheduled successfully`,
      });

    } catch (error) {
      console.error('Error scheduling update:', error);
      toast({
        title: "Error",
        description: "Failed to schedule update",
        variant: "destructive"
      });
    }
  };

  const cancelScheduledUpdate = async (id: string) => {
    setScheduledUpdates(prev => prev.map(update => 
      update.id === id ? { ...update, status: 'cancelled' as const } : update
    ));
    
    toast({
      title: "Update Cancelled",
      description: "Scheduled update has been cancelled",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'running': return <Badge className="bg-purple-500">Running</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cluster': return <Building2 className="w-4 h-4" />;
      case 'host_group': return <Users className="w-4 h-4" />;
      case 'individual': return <Server className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
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
          <h2 className="text-2xl font-bold">Update Scheduling Center</h2>
          <p className="text-muted-foreground">Schedule firmware updates for clusters, host groups, and individual servers</p>
        </div>
        <Button onClick={() => setIsScheduleDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Update
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VMware Clusters</CardTitle>
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
            <p className="text-xs text-muted-foreground">
              Environment-based groups
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Updates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledUpdates.filter(u => u.status === 'scheduled').length}</div>
            <p className="text-xs text-muted-foreground">
              Active schedules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Updates Table */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Scheduled Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduledUpdates.map((update) => (
                <TableRow key={update.id}>
                  <TableCell className="font-medium">{update.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(update.type)}
                      <span className="capitalize">{update.type.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {update.target_names.map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{update.firmware_package_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(update.scheduled_at).toLocaleString()}
                      {update.maintenance_window && (
                        <div className="text-xs text-muted-foreground">
                          MW: {update.maintenance_window.start}-{update.maintenance_window.end}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(update.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {update.status === 'scheduled' && (
                        <>
                          <Button size="sm" variant="outline">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => cancelScheduledUpdate(update.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {update.status === 'running' && (
                        <Button size="sm" variant="outline">
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Update Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Firmware Update</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Update Name</Label>
                <Input
                  id="name"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Q1 BIOS Updates"
                />
              </div>
              <div>
                <Label htmlFor="firmware">Firmware Package</Label>
                <Select 
                  value={newSchedule.firmware_package_id} 
                  onValueChange={(value) => setNewSchedule(prev => ({ ...prev, firmware_package_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select firmware package" />
                  </SelectTrigger>
                  <SelectContent>
                    {firmwarePackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} v{pkg.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Target Type</Label>
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger 
                    value="cluster" 
                    onClick={() => setNewSchedule(prev => ({ ...prev, type: 'cluster', target_ids: [] }))}
                  >
                    VMware Clusters
                  </TabsTrigger>
                  <TabsTrigger 
                    value="host_group"
                    onClick={() => setNewSchedule(prev => ({ ...prev, type: 'host_group', target_ids: [] }))}
                  >
                    Host Groups
                  </TabsTrigger>
                  <TabsTrigger 
                    value="individual"
                    onClick={() => setNewSchedule(prev => ({ ...prev, type: 'individual', target_ids: [] }))}
                  >
                    Individual Hosts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cluster" className="space-y-2">
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {clusters.map((cluster) => (
                      <div key={cluster.name} className="flex items-center space-x-2 p-2 border rounded">
                        <input
                          type="checkbox"
                          id={`cluster-${cluster.name}`}
                          checked={newSchedule.target_ids.includes(cluster.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSchedule(prev => ({ 
                                ...prev, 
                                target_ids: [...prev.target_ids, cluster.name] 
                              }));
                            } else {
                              setNewSchedule(prev => ({ 
                                ...prev, 
                                target_ids: prev.target_ids.filter(id => id !== cluster.name) 
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`cluster-${cluster.name}`} className="flex-1">
                          <div className="font-medium">{cluster.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {cluster.host_count} hosts • {cluster.vcenter_managed ? 'vCenter Managed' : 'Standalone'}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="host_group" className="space-y-2">
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {hostGroups.map((group) => (
                      <div key={group.name} className="flex items-center space-x-2 p-2 border rounded">
                        <input
                          type="checkbox"
                          id={`group-${group.name}`}
                          checked={newSchedule.target_ids.includes(group.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSchedule(prev => ({ 
                                ...prev, 
                                target_ids: [...prev.target_ids, group.name] 
                              }));
                            } else {
                              setNewSchedule(prev => ({ 
                                ...prev, 
                                target_ids: prev.target_ids.filter(id => id !== group.name) 
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`group-${group.name}`} className="flex-1">
                          <div className="font-medium">{group.name} Environment</div>
                          <div className="text-sm text-muted-foreground">{group.host_count} hosts</div>
                        </label>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="individual" className="space-y-2">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Individual host scheduling is blocked if the host is part of a VMware cluster or host group. 
                      Use cluster or group scheduling instead for better coordination.
                    </AlertDescription>
                  </Alert>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {servers.map((server) => {
                      const validation = validateIndividualHostScheduling(server.id);
                      return (
                        <div key={server.id} className={`flex items-center space-x-2 p-2 border rounded ${!validation.allowed ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            id={`server-${server.id}`}
                            checked={newSchedule.target_ids.includes(server.id)}
                            disabled={!validation.allowed}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSchedule(prev => ({ 
                                  ...prev, 
                                  target_ids: [...prev.target_ids, server.id] 
                                }));
                              } else {
                                setNewSchedule(prev => ({ 
                                  ...prev, 
                                  target_ids: prev.target_ids.filter(id => id !== server.id) 
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`server-${server.id}`} className="flex-1">
                            <div className="font-medium">{server.hostname}</div>
                            <div className="text-sm text-muted-foreground">
                              {server.environment} • {server.status}
                              {!validation.allowed && (
                                <span className="text-destructive ml-2">• {validation.reason}</span>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_at">Scheduled Date & Time</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={newSchedule.scheduled_at}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, scheduled_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Maintenance Window (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={newSchedule.maintenance_window_start}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, maintenance_window_start: e.target.value }))}
                    placeholder="Start"
                  />
                  <Input
                    type="time"
                    value={newSchedule.maintenance_window_end}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, maintenance_window_end: e.target.value }))}
                    placeholder="End"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_approve"
                checked={newSchedule.auto_approve}
                onCheckedChange={(checked) => setNewSchedule(prev => ({ ...prev, auto_approve: checked }))}
              />
              <Label htmlFor="auto_approve">Auto-approve update execution</Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={scheduleUpdate}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}