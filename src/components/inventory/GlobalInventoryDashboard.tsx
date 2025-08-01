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
import { HostInventoryVenn } from './HostInventoryVenn';
import { EnhancedServerManagement } from './EnhancedServerManagement';
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
  Activity
} from 'lucide-react';

export function GlobalInventoryDashboard() {
  const { stats, hosts, loading, getHostsByCategory, syncVCenterHosts, refreshStats } = useHostInventory();
  const [selectedCategory, setSelectedCategory] = useState<'total' | 'vcenter' | 'standalone'>('total');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncForm, setSyncForm] = useState({
    vcenterId: '',
    password: ''
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
          <h2 className="text-2xl font-bold">Server Management & Inventory</h2>
          <p className="text-muted-foreground">
            Comprehensive server management, inventory tracking, and production monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshStats} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="enterprise">
            <Plus className="w-4 h-4 mr-2" />
            Add Host
          </Button>
        </div>
      </div>

      <Tabs defaultValue="management" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Server Management
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Global Inventory
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Health Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          <EnhancedServerManagement />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Global Host Inventory</h3>
              <p className="text-muted-foreground">
                Unified view of all Dell hosts across vCenter clusters and standalone environments
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
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
            </div>
          </div>

          {/* Venn Diagram Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <HostInventoryVenn 
                stats={stats} 
                onSegmentClick={handleVennSegmentClick}
              />
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card className="card-enterprise">
                <CardHeader>
                  <CardTitle className="text-lg">Status Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Online Hosts</span>
                    <Badge className="status-online">{stats.online}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Offline Hosts</span>
                    <Badge className="status-offline">{stats.offline}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime</span>
                    <span className="text-sm font-semibold">
                      {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}%
                    </span>
                  </div>
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

          {/* Host Details Table */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedCategory === 'vcenter' && <Network className="w-5 h-5 text-blue-600" />}
                {selectedCategory === 'standalone' && <Server className="w-5 h-5 text-green-600" />}
                {selectedCategory === 'total' && <Eye className="w-5 h-5" />}
                
                {selectedCategory === 'total' && `All Hosts (${filteredHosts.length})`}
                {selectedCategory === 'vcenter' && `vCenter Managed Hosts (${filteredHosts.length})`}
                {selectedCategory === 'standalone' && `Standalone Hosts (${filteredHosts.length})`}
              </CardTitle>
              <div className="flex gap-4">
                <Input
                  placeholder="Search hosts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>vCenter/Cluster</TableHead>
                    <TableHead>Last Discovered</TableHead>
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
                      <TableCell>{host.model}</TableCell>
                      <TableCell>{getStatusBadge(host.status)}</TableCell>
                      <TableCell>
                        {host.vcenter_name && (
                          <div>
                            <div className="font-medium">{host.vcenter_name}</div>
                            {host.cluster_name && (
                              <div className="text-sm text-muted-foreground">{host.cluster_name}</div>
                            )}
                          </div>
                        )}
                        {!host.vcenter_name && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {host.last_discovered 
                          ? formatDistanceToNow(new Date(host.last_discovered)) + ' ago'
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredHosts.length === 0 && (
                <div className="text-center py-8">
                  <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hosts found</h3>
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
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Production Health Monitoring
              </CardTitle>
              <CardDescription>
                Real-time monitoring dashboard for production uptime and server health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Health Monitoring Dashboard</h3>
                <p>
                  Real-time health monitoring, SLA tracking, and performance metrics will be available here.
                  This includes firmware compliance monitoring, update success rates, and system health scores.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}