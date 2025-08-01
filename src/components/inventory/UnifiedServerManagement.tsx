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
import { useToast } from "@/hooks/use-toast";
import { useServers } from "@/hooks/useServers";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { useServerDuplicates } from "@/hooks/useServerDuplicates";
import { 
  Server, 
  Edit, 
  Trash2, 
  Plus, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  HardDrive,
  RotateCw,
  Calendar,
  Copy,
  Search,
  Filter,
  Download,
  Zap,
  Eye,
  Settings,
  TestTube,
  Wifi
} from "lucide-react";

export function UnifiedServerManagement() {
  const { servers, loading, discoverServers, updateServer, deleteServer, testConnection } = useServers();
  const { createUpdateJob } = useUpdateJobs();
  const { packages } = useFirmwarePackages();
  const { duplicates, loading: duplicatesLoading, keepPrimary } = useServerDuplicates();
  const { toast } = useToast();

  const [editingServer, setEditingServer] = useState<any>(null);
  const [schedulingServer, setSchedulingServer] = useState<any>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    search: '',
    environment: 'all',
    status: 'all',
    hostType: 'all'
  });

  const [discoveryForm, setDiscoveryForm] = useState({
    ipRange: '',
    username: '',
    password: ''
  });

  const [newJob, setNewJob] = useState({
    firmwarePackageId: '',
    scheduledAt: ''
  });

  const filteredServers = servers.filter(server => {
    if (filters.search && 
        !server.hostname.toLowerCase().includes(filters.search.toLowerCase()) &&
        !String(server.ip_address).toLowerCase().includes(filters.search.toLowerCase()) &&
        !(server.model || '').toLowerCase().includes(filters.search.toLowerCase())
    ) return false;
    
    if (filters.environment !== 'all' && server.environment !== filters.environment) return false;
    if (filters.status !== 'all' && server.status !== filters.status) return false;
    if (filters.hostType !== 'all' && server.host_type !== filters.hostType) return false;
    return true;
  });

  const dellServers = filteredServers.filter(server => 
    server.model?.toLowerCase().includes('dell') || 
    server.service_tag?.match(/^[A-Z0-9]{7}$/)
  );

  const handleDiscover = async () => {
    if (!discoveryForm.ipRange || !discoveryForm.username || !discoveryForm.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all discovery fields",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    try {
      await discoverServers(discoveryForm.ipRange, {
        username: discoveryForm.username,
        password: discoveryForm.password
      });
      setDiscoveryForm({ ipRange: '', username: '', password: '' });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleTestConnection = async (serverId: string) => {
    setIsTestingConnection(serverId);
    try {
      await testConnection(serverId);
    } finally {
      setIsTestingConnection(null);
    }
  };

  const scheduleServerUpdate = async () => {
    if (!schedulingServer || !newJob.firmwarePackageId) {
      toast({
        title: "Missing Information",
        description: "Please select a firmware package",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUpdateJob(
        schedulingServer.id,
        newJob.firmwarePackageId,
        newJob.scheduledAt || undefined
      );
      
      setSchedulingServer(null);
      setNewJob({ firmwarePackageId: '', scheduledAt: '' });
      
      toast({
        title: "Update Scheduled",
        description: `Update job scheduled for ${schedulingServer.hostname}`,
      });
    } catch (error) {
      console.error('Error scheduling update:', error);
      toast({
        title: "Error",
        description: "Failed to schedule server update",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateResolution = async (primaryId: string, duplicateIds: string[]) => {
    await keepPrimary(primaryId, duplicateIds);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      offline: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      updating: { variant: "secondary" as const, icon: RotateCw, color: "text-blue-600" },
      unknown: { variant: "outline" as const, icon: AlertTriangle, color: "text-gray-600" },
      error: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" }
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

  const onlineServers = filteredServers.filter(s => s.status === 'online').length;
  const criticalServers = filteredServers.filter(s => s.status === 'error').length;

  if (loading) {
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
            Unified server inventory, discovery, and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                <Zap className="w-4 h-4 mr-2" />
                Discover Servers
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Discover New Servers</DialogTitle>
                <DialogDescription>
                  Scan for servers using IP range and iDRAC credentials
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ipRange">IP Range (e.g., 192.168.1.1-50)</Label>
                  <Input
                    id="ipRange"
                    value={discoveryForm.ipRange}
                    onChange={(e) => setDiscoveryForm(prev => ({ ...prev, ipRange: e.target.value }))}
                    placeholder="192.168.1.1-50"
                  />
                </div>
                <div>
                  <Label htmlFor="username">iDRAC Username</Label>
                  <Input
                    id="username"
                    value={discoveryForm.username}
                    onChange={(e) => setDiscoveryForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="root"
                  />
                </div>
                <div>
                  <Label htmlFor="password">iDRAC Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={discoveryForm.password}
                    onChange={(e) => setDiscoveryForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="password"
                  />
                </div>
                <Button onClick={handleDiscover} disabled={isDiscovering} className="w-full">
                  {isDiscovering ? (
                    <>
                      <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Discovery
                    </>
                  )}
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
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-green-600">{onlineServers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold text-red-600">{criticalServers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-servers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-servers">All Servers</TabsTrigger>
          <TabsTrigger value="dell-servers">Dell Servers</TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-2">
            <Copy className="w-4 h-4" />
            Duplicates ({duplicates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-servers" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Hostname, IP, model..."
                      className="pl-10"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
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
                      <SelectItem value="updating">Updating</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
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
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setFilters({ search: '', environment: 'all', status: 'all', hostType: 'all' })}
                    className="w-full"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Servers ({filteredServers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Host Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.hostname}</TableCell>
                      <TableCell>{String(server.ip_address)}</TableCell>
                      <TableCell>{server.model || "Unknown"}</TableCell>
                      <TableCell>{getStatusBadge(server.status)}</TableCell>
                      <TableCell>{server.environment || 'Unknown'}</TableCell>
                      <TableCell>{server.host_type}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTestConnection(server.id)}
                            disabled={isTestingConnection === server.id}
                            title="Test Connection"
                          >
                            {isTestingConnection === server.id ? (
                              <RotateCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wifi className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSchedulingServer(server)}
                            title="Schedule Update"
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingServer(server)}
                            title="Edit Server"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredServers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No servers found. Use the Discover button to find servers.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dell-servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Dell Servers ({dellServers.length})
              </CardTitle>
              <CardDescription>
                Servers identified as Dell hardware based on model or service tag
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Service Tag</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>iDRAC Version</TableHead>
                    <TableHead>BIOS Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dellServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.hostname}</TableCell>
                      <TableCell>{server.service_tag || "Unknown"}</TableCell>
                      <TableCell>{server.model || "Unknown"}</TableCell>
                      <TableCell>{server.idrac_version || "Unknown"}</TableCell>
                      <TableCell>{server.bios_version || "Unknown"}</TableCell>
                      <TableCell>{getStatusBadge(server.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTestConnection(server.id)}
                            disabled={isTestingConnection === server.id}
                          >
                            {isTestingConnection === server.id ? (
                              <RotateCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSchedulingServer(server)}
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5" />
                Duplicate Server Detection
              </CardTitle>
              <CardDescription>
                Identify and resolve duplicate server entries from different discovery sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {duplicatesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <RotateCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Detecting duplicates...</span>
                </div>
              ) : duplicates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
                  <p>All servers appear to be unique based on hostname and IP address.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((duplicate) => (
                    <Card key={duplicate.id} className="border-orange-200">
                      <CardHeader>
                        <CardTitle className="text-orange-600 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Duplicate Group
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-800">Primary Server (Keep)</p>
                            <p className="font-semibold">{duplicate.hostname}</p>
                            <p className="text-sm text-muted-foreground">{duplicate.ip_address}</p>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Duplicates to Remove:</p>
                            {duplicate.duplicates.map((dup) => (
                              <div key={dup.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="font-semibold">{dup.hostname}</p>
                                <p className="text-sm text-muted-foreground">{dup.ip_address}</p>
                              </div>
                            ))}
                          </div>
                          
                          <Button 
                            onClick={() => handleDuplicateResolution(duplicate.id, duplicate.duplicates.map(d => d.id))}
                            className="w-full"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Merge Duplicates (Keep Primary)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Server Dialog */}
      {editingServer && (
        <Dialog open={!!editingServer} onOpenChange={() => setEditingServer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Server: {editingServer.hostname}</DialogTitle>
              <DialogDescription>
                Update server information and configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-hostname">Hostname</Label>
                <Input
                  id="edit-hostname"
                  value={editingServer.hostname}
                  onChange={(e) => setEditingServer({...editingServer, hostname: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-environment">Environment</Label>
                <Select 
                  value={editingServer.environment || 'production'} 
                  onValueChange={(value) => setEditingServer({...editingServer, environment: value})}
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
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    updateServer(editingServer.id, {
                      hostname: editingServer.hostname,
                      environment: editingServer.environment
                    });
                    setEditingServer(null);
                  }}
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

      {/* Schedule Server Update Dialog */}
      {schedulingServer && (
        <Dialog open={!!schedulingServer} onOpenChange={() => setSchedulingServer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Update: {schedulingServer.hostname}</DialogTitle>
              <DialogDescription>
                Schedule a firmware update job for this server
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="schedule-firmware">Firmware Package</Label>
                <Select value={newJob.firmwarePackageId} onValueChange={(value) => setNewJob(prev => ({ ...prev, firmwarePackageId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select firmware package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} v{pkg.version} ({pkg.firmware_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="schedule-time">Schedule Time (optional)</Label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={newJob.scheduledAt}
                  onChange={(e) => setNewJob(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to start immediately</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={scheduleServerUpdate} 
                  className="flex-1"
                  disabled={!newJob.firmwarePackageId}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Update
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSchedulingServer(null)}
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