import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HostInventoryVenn } from './HostInventoryVenn';
import { useHostInventory } from '@/hooks/useHostInventory';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  Filter,
  Server,
  Network,
  Eye,
  RotateCcw,
  Download,
  Settings,
  Package,
  HardDrive,
  Cpu,
  Monitor
} from 'lucide-react';

export function FocusedGlobalInventory() {
  const { stats, hosts, loading, getHostsByCategory, syncVCenterHosts, refreshStats } = useHostInventory();
  const [selectedCategory, setSelectedCategory] = useState<'total' | 'vcenter' | 'standalone'>('total');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showAddHostDialog, setShowAddHostDialog] = useState(false);
  const [syncForm, setSyncForm] = useState({
    vcenterId: '',
    password: ''
  });
  const [newHost, setNewHost] = useState({
    hostname: '',
    ip_address: '',
    model: '',
    service_tag: '',
    environment: 'production'
  });
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const filteredHosts = getHostsByCategory(selectedCategory).filter(host =>
    host.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    host.ip_address.includes(searchTerm) ||
    (host.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (host.service_tag?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="status-online">Online</Badge>;
      case 'offline': return <Badge className="status-offline">Offline</Badge>;
      case 'updating': return <Badge className="status-updating">Updating</Badge>;
      case 'error': return <Badge className="status-offline">Error</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getHostTypeIcon = (type: string) => {
    return type === 'vcenter_managed' ? 
      <Network className="w-4 h-4 text-blue-600" /> : 
      <Server className="w-4 h-4 text-green-600" />;
  };

  const handleVennSegmentClick = (segment: 'total' | 'vcenter' | 'standalone') => {
    setSelectedCategory(segment);
  };

  const handleSync = async () => {
    if (!syncForm.vcenterId || !syncForm.password) {
      toast({
        title: "Error",
        description: "Please select a vCenter and enter password",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      await syncVCenterHosts(syncForm.vcenterId, syncForm.password);
      setShowSyncDialog(false);
      setSyncForm({ vcenterId: '', password: '' });
    } catch (error) {
      // Error already handled in hook
    } finally {
      setSyncing(false);
    }
  };

  const handleAddHost = async () => {
    if (!newHost.hostname || !newHost.ip_address) {
      toast({
        title: "Error",
        description: "Hostname and IP address are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real implementation, this would call an API to add the host
      toast({
        title: "Host Added",
        description: `Successfully added ${newHost.hostname} to inventory`,
      });
      setShowAddHostDialog(false);
      setNewHost({
        hostname: '',
        ip_address: '',
        model: '',
        service_tag: '',
        environment: 'production'
      });
      refreshStats(); // Refresh inventory
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add host to inventory",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading global inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Inventory</h2>
          <p className="text-muted-foreground">
            Comprehensive inventory management for all discovered servers and hardware assets
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshStats} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={showAddHostDialog} onOpenChange={setShowAddHostDialog}>
            <DialogTrigger asChild>
              <Button variant="enterprise">
                <Plus className="w-4 h-4 mr-2" />
                Add Host
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Host to Inventory</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hostname">Hostname</Label>
                  <Input
                    id="hostname"
                    value={newHost.hostname}
                    onChange={(e) => setNewHost(prev => ({ ...prev, hostname: e.target.value }))}
                    placeholder="server-01.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    value={newHost.ip_address}
                    onChange={(e) => setNewHost(prev => ({ ...prev, ip_address: e.target.value }))}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={newHost.model}
                    onChange={(e) => setNewHost(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Dell PowerEdge R750"
                  />
                </div>
                <div>
                  <Label htmlFor="service_tag">Service Tag</Label>
                  <Input
                    id="service_tag"
                    value={newHost.service_tag}
                    onChange={(e) => setNewHost(prev => ({ ...prev, service_tag: e.target.value }))}
                    placeholder="1ABC234"
                  />
                </div>
                <div>
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={newHost.environment} onValueChange={(value) => setNewHost(prev => ({ ...prev, environment: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddHost} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Inventory
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
                <p className="text-xs text-muted-foreground">Discovered servers</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">vCenter Managed</p>
                <h3 className="text-2xl font-bold">{stats.byVCenter.reduce((sum, vc) => sum + vc.host_count, 0)}</h3>
                <p className="text-xs text-muted-foreground">Virtualized hosts</p>
              </div>
              <Network className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Standalone</p>
                <h3 className="text-2xl font-bold">{stats.total - stats.byVCenter.reduce((sum, vc) => sum + vc.host_count, 0)}</h3>
                <p className="text-xs text-muted-foreground">Physical servers</p>
              </div>
              <Server className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Assets</p>
                <h3 className="text-2xl font-bold text-success">{stats.online}</h3>
                <p className="text-xs text-muted-foreground">Available now</p>
              </div>
              <Monitor className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Visualization and Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Inventory Overview
              </CardTitle>
              <CardDescription>
                Interactive visualization of your server inventory distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HostInventoryVenn 
                stats={stats} 
                onSegmentClick={handleVennSegmentClick}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Inventory Actions */}
        <div className="space-y-4">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Sync vCenter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sync vCenter Hosts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="vcenter">vCenter</Label>
                      <Select value={syncForm.vcenterId} onValueChange={(value) => setSyncForm(prev => ({ ...prev, vcenterId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vCenter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mock-vcenter-1">Production vCenter</SelectItem>
                          <SelectItem value="mock-vcenter-2">Development vCenter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="password">vCenter Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={syncForm.password}
                        onChange={(e) => setSyncForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter vCenter password"
                      />
                    </div>
                    <Button onClick={handleSync} disabled={syncing} className="w-full">
                      {syncing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Start Sync
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export Inventory
              </Button>

              <Button variant="outline" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Discover Servers
              </Button>
            </CardContent>
          </Card>

          {stats.byVCenter.length > 0 && (
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="text-lg">vCenter Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.byVCenter.map((vcenter) => (
                  <div key={vcenter.vcenter_name} className="flex justify-between items-center">
                    <span className="text-sm">{vcenter.vcenter_name}</span>
                    <Badge variant="outline">{vcenter.host_count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detailed Inventory Table */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedCategory === 'vcenter' && <Network className="w-5 h-5 text-blue-600" />}
            {selectedCategory === 'standalone' && <Server className="w-5 h-5 text-green-600" />}
            {selectedCategory === 'total' && <Package className="w-5 h-5" />}
            
            {selectedCategory === 'total' && `All Inventory Items (${filteredHosts.length})`}
            {selectedCategory === 'vcenter' && `vCenter Managed Assets (${filteredHosts.length})`}
            {selectedCategory === 'standalone' && `Standalone Assets (${filteredHosts.length})`}
          </CardTitle>
          <CardDescription>
            Detailed view of server assets with specifications and status information
          </CardDescription>
          <div className="flex gap-4">
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Details</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hardware</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Last Discovered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        {getHostTypeIcon(host.host_type)}
                        <span className="font-medium">{host.hostname}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{host.ip_address}</p>
                      <p className="text-xs text-muted-foreground">ST: {host.service_tag}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={host.host_type === 'vcenter_managed' ? 'default' : 'secondary'}>
                      {host.host_type === 'vcenter_managed' ? 'vCenter' : 'Standalone'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      <span className="text-sm">{host.model}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(host.status)}</TableCell>
                  <TableCell>
                    <Badge variant="default">
                      production
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {host.last_discovered 
                      ? formatDistanceToNow(new Date(host.last_discovered)) + ' ago'
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredHosts.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No inventory items found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search criteria." 
                  : "Start by adding hosts or syncing from vCenter."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}