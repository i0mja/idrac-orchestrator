import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useServers } from '@/hooks/useServers';
import { formatDistanceToNow } from 'date-fns';
import { 
  RefreshCw, 
  Plus, 
  Search, 
  Filter,
  Server,
  Network,
  Eye,
  Settings,
  Package,
  HardDrive,
  Cpu,
  Monitor,
  MapPin,
  Calendar,
  Activity,
  Database,
  Download
} from 'lucide-react';

export function ServerDiscovery() {
  const { servers, loading } = useServers();
  const [discoveryMethod, setDiscoveryMethod] = useState<'network' | 'vcenter' | 'manual'>('network');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showAddServerDialog, setShowAddServerDialog] = useState(false);
  const [networkRange, setNetworkRange] = useState('192.168.1.0/24');
  const [newServer, setNewServer] = useState({
    hostname: '',
    ip_address: '',
    model: '',
    service_tag: '',
    environment: 'production',
    datacenter: '',
    rack_location: ''
  });
  const { toast } = useToast();

  const recentlyDiscovered = servers.filter(s => {
    if (!s.last_discovered) return false;
    const discovered = new Date(s.last_discovered);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return discovered > weekAgo;
  });

  const pendingDiscovery = servers.filter(s => !s.last_discovered || s.status === 'unknown');

  const handleNetworkDiscovery = async () => {
    setIsDiscovering(true);
    try {
      // Mock network discovery
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast({
        title: "Network Discovery Complete",
        description: `Discovered ${Math.floor(Math.random() * 5) + 1} new servers in range ${networkRange}`,
      });
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Failed to complete network discovery",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddServer = async () => {
    if (!newServer.hostname || !newServer.ip_address) {
      toast({
        title: "Error",
        description: "Hostname and IP address are required",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Server Added",
        description: `Successfully added ${newServer.hostname} for discovery`,
      });
      setShowAddServerDialog(false);
      setNewServer({
        hostname: '',
        ip_address: '',
        model: '',
        service_tag: '',
        environment: 'production',
        datacenter: '',
        rack_location: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add server",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="status-online">Online</Badge>;
      case 'offline': return <Badge className="status-offline">Offline</Badge>;
      case 'discovering': return <Badge className="status-updating">Discovering</Badge>;
      case 'unknown': return <Badge variant="outline">Unknown</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading server discovery...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Server Discovery</h2>
          <p className="text-muted-foreground">
            Discover and add new servers to your infrastructure inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddServerDialog} onOpenChange={setShowAddServerDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Server Manually</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hostname">Hostname</Label>
                    <Input
                      id="hostname"
                      value={newServer.hostname}
                      onChange={(e) => setNewServer(prev => ({ ...prev, hostname: e.target.value }))}
                      placeholder="server-01.example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ip">IP Address</Label>
                    <Input
                      id="ip"
                      value={newServer.ip_address}
                      onChange={(e) => setNewServer(prev => ({ ...prev, ip_address: e.target.value }))}
                      placeholder="192.168.1.100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={newServer.model}
                      onChange={(e) => setNewServer(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Dell PowerEdge R750"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service_tag">Service Tag</Label>
                    <Input
                      id="service_tag"
                      value={newServer.service_tag}
                      onChange={(e) => setNewServer(prev => ({ ...prev, service_tag: e.target.value }))}
                      placeholder="1ABC234"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="datacenter">Datacenter</Label>
                    <Input
                      id="datacenter"
                      value={newServer.datacenter}
                      onChange={(e) => setNewServer(prev => ({ ...prev, datacenter: e.target.value }))}
                      placeholder="DC-01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rack">Rack Location</Label>
                    <Input
                      id="rack"
                      value={newServer.rack_location}
                      onChange={(e) => setNewServer(prev => ({ ...prev, rack_location: e.target.value }))}
                      placeholder="Rack-15-U20"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={newServer.environment} onValueChange={(value) => setNewServer(prev => ({ ...prev, environment: value }))}>
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
                <Button onClick={handleAddServer} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="enterprise">
            <Search className="w-4 h-4 mr-2" />
            Start Discovery
          </Button>
        </div>
      </div>

      {/* Discovery Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <h3 className="text-2xl font-bold">{servers.length}</h3>
                <p className="text-xs text-muted-foreground">In inventory</p>
              </div>
              <Server className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recently Discovered</p>
                <h3 className="text-2xl font-bold text-green-600">{recentlyDiscovered.length}</h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Discovery</p>
                <h3 className="text-2xl font-bold text-yellow-600">{pendingDiscovery.length}</h3>
                <p className="text-xs text-muted-foreground">Need discovery</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Servers</p>
                <h3 className="text-2xl font-bold text-success">{servers.filter(s => s.status === 'online').length}</h3>
                <p className="text-xs text-muted-foreground">Available now</p>
              </div>
              <Monitor className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discovery Methods */}
      <Tabs value={discoveryMethod} onValueChange={(value) => setDiscoveryMethod(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="network">Network Scan</TabsTrigger>
          <TabsTrigger value="vcenter">vCenter Sync</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="space-y-4">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Network Discovery
              </CardTitle>
              <CardDescription>
                Scan network ranges to discover Dell servers automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="network-range">Network Range</Label>
                <div className="flex gap-2">
                  <Input
                    id="network-range"
                    value={networkRange}
                    onChange={(e) => setNetworkRange(e.target.value)}
                    placeholder="192.168.1.0/24"
                  />
                  <Button 
                    onClick={handleNetworkDiscovery} 
                    disabled={isDiscovering}
                    className="min-w-32"
                  >
                    {isDiscovering ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Start Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Discovery Options</h4>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" defaultChecked />
                      <span>ICMP Ping</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" defaultChecked />
                      <span>SSH (Port 22)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" defaultChecked />
                      <span>iDRAC (Port 443)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Discovery Filters</h4>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" defaultChecked />
                      <span>Dell Hardware Only</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" />
                      <span>ESXi Hosts Only</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" />
                      <span>Skip Known Hosts</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vcenter" className="space-y-4">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                vCenter Integration
              </CardTitle>
              <CardDescription>
                Sync servers from existing vCenter infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">vCenter Discovery</h3>
                <p>
                  Connect to vCenter servers to automatically discover and import managed hosts.
                  This will sync all ESXi hosts and their virtual machines.
                </p>
                <Button className="mt-4" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure vCenter
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Manual Server Entry
              </CardTitle>
              <CardDescription>
                Add servers manually with detailed configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Manual Server Addition</h3>
                <p>
                  Add servers individually with complete hardware specifications and location details.
                  Ideal for servers in restricted networks or air-gapped environments.
                </p>
                <Button 
                  className="mt-4" 
                  variant="outline"
                  onClick={() => setShowAddServerDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Discovery Results */}
      {recentlyDiscovered.length > 0 && (
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recently Discovered Servers
            </CardTitle>
            <CardDescription>
              Servers discovered in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server Details</TableHead>
                  <TableHead>Hardware</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Discovered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentlyDiscovered.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span className="font-medium">{server.hostname}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{String(server.ip_address)}</p>
                        <p className="text-xs text-muted-foreground">ST: {server.service_tag}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        <span className="text-sm">{server.model}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(server.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-sm">Unknown</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {server.last_discovered ? formatDistanceToNow(new Date(server.last_discovered)) + ' ago' : 'Never'}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}