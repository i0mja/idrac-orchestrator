import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAutoOrchestration } from "@/hooks/useAutoOrchestration";
import { useServers } from "@/hooks/useServers";
import { useSystemEvents } from "@/hooks/useSystemEvents";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Download,
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Filter,
  RefreshCw,
  Play,
  Pause,
  Shield,
  Server,
  Zap,
  Calendar,
  Bot,
  Plus,
  Edit2,
  Trash2,
  Info
} from "lucide-react";

interface UpdateGroup {
  id: string;
  name: string;
  description: string;
  updateCount: number;
  criticalCount: number;
  approvedCount: number;
  status: 'pending' | 'approved' | 'scheduled' | 'installing' | 'completed' | 'failed';
  lastModified: string;
  targetGroups: string[];
}

interface UpdatePolicy {
  id: string;
  name: string;
  description: string;
  targetType: 'all' | 'cluster' | 'group' | 'manual';
  targets: string[];
  schedule: {
    type: 'automatic' | 'manual' | 'scheduled';
    time?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    maintenanceWindow?: boolean;
  };
  approvalRequired: boolean;
  testingRequired: boolean;
  rollbackEnabled: boolean;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface ServerUpdateStatus {
  serverId: string;
  hostname: string;
  status: 'compliant' | 'missing_updates' | 'installing' | 'failed' | 'pending_reboot';
  availableUpdates: number;
  criticalUpdates: number;
  lastChecked: string;
  lastInstalled?: string;
  progress?: number;
}

export function UpdateManagementCenter() {
  const [updateGroups, setUpdateGroups] = useState<UpdateGroup[]>([]);
  const [updatePolicies, setUpdatePolicies] = useState<UpdatePolicy[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerUpdateStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isCreatePolicyDialogOpen, setIsCreatePolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<UpdatePolicy | null>(null);
  
  const { config: autoConfig, updateConfig, toggleAutoOrchestration } = useAutoOrchestration();
  const { servers } = useServers();
  const { events } = useSystemEvents();
  const { toast } = useToast();

  const [newPolicy, setNewPolicy] = useState<Partial<UpdatePolicy>>({
    name: '',
    description: '',
    targetType: 'all',
    targets: [],
    schedule: {
      type: 'manual',
      maintenanceWindow: true
    },
    approvalRequired: true,
    testingRequired: false,
    rollbackEnabled: true,
    isActive: true
  });

  useEffect(() => {
    loadUpdateData();
  }, [servers, events]);

  const loadUpdateData = async () => {
    setIsLoading(true);
    try {
      // Generate mock update groups
      const mockGroups: UpdateGroup[] = [
        {
          id: '1',
          name: 'Critical Security Updates - January 2024',
          description: 'Critical BIOS and iDRAC security patches',
          updateCount: 8,
          criticalCount: 8,
          approvedCount: 6,
          status: 'approved',
          lastModified: new Date(Date.now() - 86400000).toISOString(),
          targetGroups: ['Production', 'Development']
        },
        {
          id: '2',
          name: 'Quarterly Firmware Updates - Q1 2024',
          description: 'Routine quarterly firmware updates for all components',
          updateCount: 15,
          criticalCount: 2,
          approvedCount: 0,
          status: 'pending',
          lastModified: new Date(Date.now() - 3600000).toISOString(),
          targetGroups: ['All Servers']
        }
      ];

      // Generate mock policies
      const mockPolicies: UpdatePolicy[] = [
        {
          id: '1',
          name: 'Auto-Install Critical Security Updates',
          description: 'Automatically approve and install critical security updates',
          targetType: 'all',
          targets: [],
          schedule: {
            type: 'automatic',
            frequency: 'weekly',
            time: '02:00',
            maintenanceWindow: true
          },
          approvalRequired: false,
          testingRequired: true,
          rollbackEnabled: true,
          isActive: true,
          lastRun: new Date(Date.now() - 86400000 * 7).toISOString(),
          nextRun: new Date(Date.now() + 86400000).toISOString()
        }
      ];

      // Generate server status
      const mockServerStatus: ServerUpdateStatus[] = servers.map(server => ({
        serverId: server.id,
        hostname: server.hostname,
        status: Math.random() > 0.7 ? 'compliant' : 'missing_updates',
        availableUpdates: Math.floor(Math.random() * 5),
        criticalUpdates: Math.floor(Math.random() * 2),
        lastChecked: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        lastInstalled: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 86400000 * 7).toISOString() : undefined
      }));

      setUpdateGroups(mockGroups);
      setUpdatePolicies(mockPolicies);
      setServerStatus(mockServerStatus);
    } catch (error) {
      console.error('Failed to load update data:', error);
      toast({
        title: "Error",
        description: "Failed to load update management data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUpdatePolicy = async () => {
    if (!newPolicy.name || !newPolicy.description) {
      toast({
        title: "Missing Information",
        description: "Name and description are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const policy: UpdatePolicy = {
        id: Date.now().toString(),
        ...newPolicy as UpdatePolicy,
      };

      setUpdatePolicies(prev => [...prev, policy]);
      setIsCreatePolicyDialogOpen(false);
      setNewPolicy({
        name: '',
        description: '',
        targetType: 'all',
        targets: [],
        schedule: {
          type: 'manual',
          maintenanceWindow: true
        },
        approvalRequired: true,
        testingRequired: false,
        rollbackEnabled: true,
        isActive: true
      });

      toast({
        title: "Update Policy Created",
        description: "Policy has been created successfully",
      });
    } catch (error) {
      console.error('Failed to create policy:', error);
      toast({
        title: "Error",
        description: "Failed to create update policy",
        variant: "destructive",
      });
    }
  };

  const deletePolicy = async (id: string) => {
    setUpdatePolicies(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Policy Deleted",
      description: "Update policy has been removed",
    });
  };

  const togglePolicy = async (id: string, active: boolean) => {
    setUpdatePolicies(prev => prev.map(p => 
      p.id === id ? { ...p, isActive: active } : p
    ));
    
    toast({
      title: active ? "Policy Activated" : "Policy Deactivated",
      description: `Update policy has been ${active ? 'activated' : 'deactivated'}`,
    });
  };

  const approveUpdateGroup = async (id: string) => {
    setUpdateGroups(prev => prev.map(g => 
      g.id === id ? { ...g, status: 'approved' as const, approvedCount: g.updateCount } : g
    ));
    
    toast({
      title: "Updates Approved",
      description: "Update group has been approved for deployment",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600">Pending Review</Badge>;
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'installing': return <Badge className="bg-purple-500">Installing</Badge>;
      case 'completed': return <Badge className="bg-green-600">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServerStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge className="bg-green-500">Compliant</Badge>;
      case 'missing_updates': return <Badge className="bg-yellow-500">Updates Available</Badge>;
      case 'installing': return <Badge className="bg-blue-500">Installing</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'pending_reboot': return <Badge className="bg-orange-500">Pending Reboot</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredServers = serverStatus.filter(server => {
    if (selectedFilter === 'all') return true;
    return server.status === selectedFilter;
  });

  const complianceStats = {
    total: serverStatus.length,
    compliant: serverStatus.filter(s => s.status === 'compliant').length,
    needingUpdates: serverStatus.filter(s => s.status === 'missing_updates').length,
    installing: serverStatus.filter(s => s.status === 'installing').length,
    failed: serverStatus.filter(s => s.status === 'failed').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Update Management Center</h2>
          <p className="text-muted-foreground">Centralized firmware update management with WSUS-style workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUpdateData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreatePolicyDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Policy
          </Button>
        </div>
      </div>

      {/* Global Auto-Orchestration Settings */}
      {autoConfig && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>
                  Auto-orchestration is {autoConfig.enabled ? 'enabled' : 'disabled'}
                  {autoConfig.enabled && ` (Next execution in ${autoConfig.execution_interval_months} months)`}
                </span>
                <Switch
                  checked={autoConfig.enabled}
                  onCheckedChange={() => toggleAutoOrchestration()}
                />
              </div>
              <Button size="sm" variant="outline">
                <Settings className="w-3 h-3 mr-1" />
                Configure Settings
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="card-enterprise">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <h3 className="text-xl font-bold">{complianceStats.total}</h3>
              </div>
              <Server className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-enterprise">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliant</p>
                <h3 className="text-xl font-bold text-green-600">{complianceStats.compliant}</h3>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Updates</p>
                <h3 className="text-xl font-bold text-yellow-600">{complianceStats.needingUpdates}</h3>
              </div>
              <Download className="w-6 h-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Installing</p>
                <h3 className="text-xl font-bold text-blue-600">{complianceStats.installing}</h3>
              </div>
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <h3 className="text-xl font-bold text-red-600">{complianceStats.failed}</h3>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="updates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="updates" className="gap-2">
            <Download className="w-4 h-4" />
            Update Groups
          </TabsTrigger>
          <TabsTrigger value="servers" className="gap-2">
            <Server className="w-4 h-4" />
            Server Status
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <Bot className="w-4 h-4" />
            Update Policies
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Calendar className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Update Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {updateGroups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(group.status)}
                        {group.status === 'pending' && (
                          <Button size="sm" onClick={() => approveUpdateGroup(group.id)}>
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Updates:</span>
                        <p className="font-medium">{group.updateCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Critical:</span>
                        <p className="font-medium text-red-600">{group.criticalCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Approved:</span>
                        <p className="font-medium text-green-600">{group.approvedCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Modified:</span>
                        <p className="font-medium">{formatDistanceToNow(new Date(group.lastModified))} ago</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Server Compliance Status
                </CardTitle>
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Servers</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="missing_updates">Missing Updates</SelectItem>
                    <SelectItem value="installing">Installing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Available Updates</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Last Installed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow key={server.serverId}>
                      <TableCell className="font-medium">{server.hostname}</TableCell>
                      <TableCell>{getServerStatusBadge(server.status)}</TableCell>
                      <TableCell>{server.availableUpdates}</TableCell>
                      <TableCell>
                        {server.criticalUpdates > 0 && (
                          <Badge variant="destructive">{server.criticalUpdates}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDistanceToNow(new Date(server.lastChecked))} ago</TableCell>
                      <TableCell>
                        {server.lastInstalled 
                          ? formatDistanceToNow(new Date(server.lastInstalled)) + ' ago'
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          {server.availableUpdates > 0 && (
                            <Button size="sm">
                              <Download className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <div className="grid gap-4">
            {updatePolicies.map((policy) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      {policy.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={policy.schedule.type === 'automatic' ? 'default' : 'outline'}>
                        {policy.schedule.type}
                      </Badge>
                      {policy.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target:</span>
                      <p className="font-medium">{policy.targetType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Schedule:</span>
                      <p className="font-medium">
                        {policy.schedule.frequency ? `${policy.schedule.frequency} at ${policy.schedule.time}` : policy.schedule.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {policy.approvalRequired && (
                      <Badge variant="outline" className="text-blue-600">
                        <Shield className="w-3 h-3 mr-1" />
                        Approval Required
                      </Badge>
                    )}
                    {policy.testingRequired && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Testing Required
                      </Badge>
                    )}
                    {policy.rollbackEnabled && (
                      <Badge variant="outline" className="text-orange-600">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Auto Rollback
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={policy.isActive}
                        onCheckedChange={(checked) => togglePolicy(policy.id, checked)}
                      />
                      <Label className="text-sm">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deletePolicy(policy.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Update History & Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Detailed compliance reports and update history will be available here.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Policy Dialog */}
      <Dialog open={isCreatePolicyDialogOpen} onOpenChange={setIsCreatePolicyDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Update Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="policy-name">Policy Name</Label>
                  <Input
                    id="policy-name"
                    value={newPolicy.name}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Critical Security Updates"
                  />
                </div>
                <div>
                  <Label htmlFor="target-type">Target Type</Label>
                  <Select value={newPolicy.targetType} onValueChange={(value) => setNewPolicy(prev => ({ ...prev, targetType: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Servers</SelectItem>
                      <SelectItem value="cluster">Specific Clusters</SelectItem>
                      <SelectItem value="group">Server Groups</SelectItem>
                      <SelectItem value="manual">Manual Selection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Automated deployment of critical security updates"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="schedule-type">Schedule Type</Label>
                  <Select value={newPolicy.schedule?.type} onValueChange={(value) => setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule!, type: value as any } }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {newPolicy.schedule?.type !== 'manual' && (
                  <>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select value={newPolicy.schedule?.frequency} onValueChange={(value) => setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule!, frequency: value as any } }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newPolicy.schedule?.time || '02:00'}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule!, time: e.target.value } }))}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newPolicy.approvalRequired}
                    onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, approvalRequired: checked }))}
                  />
                  <Label>Require approval before deployment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newPolicy.testingRequired}
                    onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, testingRequired: checked }))}
                  />
                  <Label>Test on subset before full deployment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newPolicy.rollbackEnabled}
                    onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, rollbackEnabled: checked }))}
                  />
                  <Label>Enable automatic rollback on failure</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newPolicy.schedule?.maintenanceWindow}
                    onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule!, maintenanceWindow: checked } }))}
                  />
                  <Label>Deploy only during maintenance windows</Label>
                </div>
              </div>

              <Button onClick={createUpdatePolicy} className="w-full">
                <Bot className="w-4 h-4 mr-2" />
                Create Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}