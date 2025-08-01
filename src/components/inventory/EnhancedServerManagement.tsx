import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Server, 
  Edit, 
  Trash2, 
  Plus, 
  Tag, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Monitor,
  HardDrive,
  Network,
  Zap,
  Filter,
  RotateCw,
  Settings
} from "lucide-react";

interface ServerExtended {
  id: string;
  hostname: string;
  ip_address: string;
  model?: string | null;
  service_tag?: string | null;
  status: 'online' | 'offline' | 'unknown' | 'updating' | 'error';
  host_type: string;
  vcenter_id?: string | null;
  cluster_name?: string | null;
  datacenter?: string | null;
  environment?: string | null;
  bios_version?: string | null;
  idrac_version?: string | null;
  last_discovered?: string | null;
  rack_location?: string | null;
  created_at?: string;
  last_updated?: string | null;
  discovery_source?: string | null;
  // Extended properties
  tags?: string[];
  health_score?: number;
  firmware_compliance?: 'compliant' | 'outdated' | 'critical';
}

interface ServerGroup {
  id: string;
  name: string;
  description: string;
  tags: string[];
  server_count: number;
  environment: string;
  created_at: string;
}

export function EnhancedServerManagement() {
  const [servers, setServers] = useState<ServerExtended[]>([]);
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [editingServer, setEditingServer] = useState<ServerExtended | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    environment: 'all',
    status: 'all',
    hostType: 'all',
    compliance: 'all',
    search: ''
  });
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    environment: 'production'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadServers();
    loadGroups();
  }, []);

  const loadServers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname');

      if (error) throw error;

      // Enhance servers with mock health data
      const enhancedServers = (data || []).map((server: any) => ({
        ...server,
        // Ensure required fields have default values
        host_type: server.host_type || 'standalone',
        environment: server.environment || 'production',
        tags: server.rack_location ? 
          [server.environment || 'production', server.rack_location].filter(Boolean) : 
          [server.environment || 'production'].filter(Boolean),
        health_score: Math.floor(Math.random() * 40) + 60, // Mock health score 60-100
        firmware_compliance: getRandomCompliance()
      })) as ServerExtended[];

      setServers(enhancedServers);
    } catch (error) {
      console.error('Error loading servers:', error);
      toast({
        title: "Error",
        description: "Failed to load servers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    // Mock server groups for now
    const mockGroups: ServerGroup[] = [
      {
        id: '1',
        name: 'Production Web Servers',
        description: 'Front-end web servers in production',
        tags: ['production', 'web'],
        server_count: 5,
        environment: 'production',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Database Cluster',
        description: 'Database servers requiring high availability',
        tags: ['production', 'database'],
        server_count: 3,
        environment: 'production',
        created_at: new Date().toISOString()
      }
    ];
    setGroups(mockGroups);
  };

  const getRandomCompliance = (): 'compliant' | 'outdated' | 'critical' => {
    const rand = Math.random();
    if (rand < 0.6) return 'compliant';
    if (rand < 0.9) return 'outdated';
    return 'critical';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      offline: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      maintenance: { variant: "secondary" as const, icon: Settings, color: "text-yellow-600" },
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

  const getComplianceBadge = (compliance: string) => {
    const variants = {
      compliant: { variant: "default" as const, color: "text-green-600" },
      outdated: { variant: "secondary" as const, color: "text-yellow-600" },
      critical: { variant: "destructive" as const, color: "text-red-600" }
    };
    
    const config = variants[compliance as keyof typeof variants] || variants.critical;
    
    return (
      <Badge variant={config.variant}>
        {compliance}
      </Badge>
    );
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const updateServer = async (serverId: string, updates: Partial<ServerExtended>) => {
    try {
      const { error } = await supabase
        .from('servers')
        .update(updates)
        .eq('id', serverId);

      if (error) throw error;

      await loadServers();
      setEditingServer(null);
      toast({
        title: "Success",
        description: "Server updated successfully",
      });
    } catch (error) {
      console.error('Error updating server:', error);
      toast({
        title: "Error",
        description: "Failed to update server",
        variant: "destructive",
      });
    }
  };

  const deleteServer = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      await loadServers();
      toast({
        title: "Success",
        description: "Server deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      });
    }
  };

  const createServerGroup = async () => {
    if (!newGroup.name || selectedServers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Group name and at least one server are required",
        variant: "destructive",
      });
      return;
    }

    // Mock group creation
    const group: ServerGroup = {
      id: Date.now().toString(),
      name: newGroup.name,
      description: newGroup.description,
      tags: [newGroup.environment],
      server_count: selectedServers.length,
      environment: newGroup.environment,
      created_at: new Date().toISOString()
    };

    setGroups(prev => [...prev, group]);
    setNewGroup({ name: '', description: '', environment: 'production' });
    setSelectedServers([]);
    
    toast({
      title: "Success",
      description: `Server group "${group.name}" created with ${selectedServers.length} servers`,
    });
  };

  const filteredServers = servers.filter(server => {
    if (filters.environment !== 'all' && server.environment !== filters.environment) return false;
    if (filters.status !== 'all' && server.status !== filters.status) return false;
    if (filters.hostType !== 'all' && server.host_type !== filters.hostType) return false;
    if (filters.compliance !== 'all' && server.firmware_compliance !== filters.compliance) return false;
    if (filters.search && !server.hostname.toLowerCase().includes(filters.search.toLowerCase()) &&
        !server.model?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !server.service_tag?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const dellServers = filteredServers.filter(server => 
    server.model?.toLowerCase().includes('dell') || 
    server.service_tag?.match(/^[A-Z0-9]{7}$/) // Dell service tag pattern
  );

  const healthyServers = filteredServers.filter(s => (s.health_score || 0) >= 80).length;
  const criticalServers = filteredServers.filter(s => s.firmware_compliance === 'critical').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RotateCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading servers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Server Management</h2>
          <p className="text-muted-foreground">
            Comprehensive server inventory and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadServers} variant="outline">
            <RotateCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={selectedServers.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group ({selectedServers.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Server Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Production Web Servers"
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">Description</Label>
                  <Input
                    id="group-description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Front-end web servers in production"
                  />
                </div>
                <div>
                  <Label htmlFor="group-environment">Environment</Label>
                  <Select value={newGroup.environment} onValueChange={(value) => setNewGroup(prev => ({ ...prev, environment: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createServerGroup} className="w-full">
                  Create Group with {selectedServers.length} servers
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <p className="text-2xl font-bold">{filteredServers.length}</p>
              </div>
              <Server className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
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
                <p className="text-sm text-muted-foreground">Healthy Servers</p>
                <p className="text-2xl font-bold text-green-600">{healthyServers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Updates</p>
                <p className="text-2xl font-bold text-red-600">{criticalServers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="servers">All Servers</TabsTrigger>
          <TabsTrigger value="dell">Dell Servers</TabsTrigger>
          <TabsTrigger value="groups">Server Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Hostname, model, service tag..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Environment</Label>
                  <Select value={filters.environment} onValueChange={(value) => setFilters(prev => ({ ...prev, environment: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Host Type</Label>
                  <Select value={filters.hostType} onValueChange={(value) => setFilters(prev => ({ ...prev, hostType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="standalone">Standalone</SelectItem>
                      <SelectItem value="vcenter_managed">vCenter Managed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compliance</Label>
                  <Select value={filters.compliance} onValueChange={(value) => setFilters(prev => ({ ...prev, compliance: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="compliant">Compliant</SelectItem>
                      <SelectItem value="outdated">Outdated</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setFilters({ environment: 'all', status: 'all', hostType: 'all', compliance: 'all', search: '' })}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServers.map((server) => (
              <Card key={server.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedServers.includes(server.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedServers.includes(server.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServers(prev => [...prev, server.id]);
                          } else {
                            setSelectedServers(prev => prev.filter(id => id !== server.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <CardTitle className="text-lg">{server.hostname}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingServer(server)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteServer(server.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{server.ip_address}</span>
                    {getStatusBadge(server.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <p className="font-medium">{server.model || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Service Tag:</span>
                      <p className="font-medium">{server.service_tag || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Environment:</span>
                      <p className="font-medium">{server.environment}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Host Type:</span>
                      <p className="font-medium">{server.host_type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Health:</span>
                      <span className={`font-bold ${getHealthColor(server.health_score || 0)}`}>
                        {server.health_score}%
                      </span>
                    </div>
                    {getComplianceBadge(server.firmware_compliance || 'unknown')}
                  </div>

                  {server.cluster_name && (
                    <div className="flex items-center gap-1">
                      <Network className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Cluster: {server.cluster_name}</span>
                    </div>
                  )}

                  {server.tags && server.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {server.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dell" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Dell Server Overview
              </CardTitle>
              <CardDescription>
                Specialized view for Dell PowerEdge servers with iDRAC management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{dellServers.length}</p>
                  <p className="text-sm text-muted-foreground">Dell Servers</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {dellServers.filter(s => s.status === 'online').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {dellServers.filter(s => s.host_type === 'vcenter_managed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">vCenter Managed</p>
                </div>
              </div>

              <div className="space-y-3">
                {dellServers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No Dell servers found. Add Dell servers to your inventory to see them here.
                  </div>
                ) : (
                  dellServers.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-semibold">{server.hostname}</h4>
                          <p className="text-sm text-muted-foreground">
                            {server.model} • {server.service_tag}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(server.status)}
                        <Badge variant={server.host_type === 'vcenter_managed' ? 'default' : 'secondary'}>
                          {server.host_type === 'vcenter_managed' ? 'vCenter' : 'Standalone'}
                        </Badge>
                        <span className={`font-bold ${getHealthColor(server.health_score || 0)}`}>
                          {server.health_score}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingServer(server)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    {group.name}
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Servers:</span>
                      <span className="font-medium">{group.server_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Environment:</span>
                      <Badge variant="outline">{group.environment}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {group.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Server Dialog */}
      {editingServer && (
        <Dialog open={!!editingServer} onOpenChange={() => setEditingServer(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Server: {editingServer.hostname}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-hostname">Hostname</Label>
                <Input
                  id="edit-hostname"
                  value={editingServer.hostname}
                  onChange={(e) => setEditingServer(prev => prev ? { ...prev, hostname: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-environment">Environment</Label>
                <Select 
                  value={editingServer.environment} 
                  onValueChange={(value) => setEditingServer(prev => prev ? { ...prev, environment: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-rack">Rack Location</Label>
                <Input
                  id="edit-rack"
                  value={editingServer.rack_location || ''}
                  onChange={(e) => setEditingServer(prev => prev ? { ...prev, rack_location: e.target.value } : null)}
                  placeholder="Rack A-01"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingServer.host_type === 'vcenter_managed'}
                  onCheckedChange={(checked) => setEditingServer(prev => 
                    prev ? { ...prev, host_type: checked ? 'vcenter_managed' : 'standalone' } : null
                  )}
                />
                <Label>vCenter Managed</Label>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => updateServer(editingServer.id, editingServer)} 
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingServer(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}