import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServers } from "@/hooks/useServers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  Server,
  Network,
  MapPin,
  Database,
  Shield,
  DollarSign,
  Calendar,
  Activity,
  Search,
  Filter,
  Plus,
  Edit,
  Cpu,
  HardDrive,
  MonitorSpeaker,
  Globe,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";

interface ServerNote {
  id: string;
  server_id: string;
  title: string;
  content: string;
  category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function GlobalInventoryDashboard() {
  const { servers, loading } = useServers();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnvironment, setFilterEnvironment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVCenter, setFilterVCenter] = useState("all");
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [notes, setNotes] = useState<ServerNote[]>([]);
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "general" });
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);

  // Load notes for selected server
  useEffect(() => {
    if (selectedServer) {
      loadServerNotes(selectedServer.id);
    }
  }, [selectedServer]);

  const loadServerNotes = async (serverId: string) => {
    try {
      const { data, error } = await supabase
        .from('server_notes')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const addNote = async () => {
    if (!selectedServer || !newNote.title || !newNote.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('server_notes')
        .insert([{
          server_id: selectedServer.id,
          title: newNote.title,
          content: newNote.content,
          category: newNote.category
        }]);

      if (error) throw error;

      setNewNote({ title: "", content: "", category: "general" });
      loadServerNotes(selectedServer.id);
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error", 
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  // Filter servers based on search and filters
  const filteredServers = servers.filter(server => {
    const matchesSearch = server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.ip_address?.toString().includes(searchTerm) ||
                         server.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEnvironment = filterEnvironment === "all" || server.environment === filterEnvironment;
    const matchesStatus = filterStatus === "all" || server.status === filterStatus;
    const matchesVCenter = filterVCenter === "all" || 
                          (filterVCenter === "managed" && server.vcenter_id) ||
                          (filterVCenter === "standalone" && !server.vcenter_id);

    return matchesSearch && matchesEnvironment && matchesStatus && matchesVCenter;
  });

  // Calculate statistics
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const vCenterManaged = servers.filter(s => s.vcenter_id).length;
  const standaloneServers = totalServers - vCenterManaged;
  const productionServers = servers.filter(s => s.environment === 'production').length;
  const uniqueDatacenters = [...new Set(servers.filter(s => s.datacenter).map(s => s.datacenter))].length;

  // IP Range analysis
  const ipRanges = servers.reduce((acc: any, server) => {
    if (server.ip_address) {
      const ip = server.ip_address.toString();
      const subnet = ip.split('.').slice(0, 3).join('.') + '.0/24';
      if (!acc[subnet]) acc[subnet] = [];
      acc[subnet].push(server);
    }
    return acc;
  }, {});

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online": return <Badge className="status-online">Online</Badge>;
      case "offline": return <Badge className="status-offline">Offline</Badge>;
      case "updating": return <Badge className="status-updating">Updating</Badge>;
      case "maintenance": return <Badge className="status-warning">Maintenance</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCriticalityBadge = (criticality: string = 'medium') => {
    switch (criticality) {
      case "high": return <Badge variant="destructive">Critical</Badge>;
      case "medium": return <Badge className="status-warning">Medium</Badge>;
      case "low": return <Badge className="status-online">Low</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const calculateWarrantyStatus = (warrantyEnd?: string) => {
    if (!warrantyEnd) return "Unknown";
    const endDate = new Date(warrantyEnd);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return "Expired";
    if (daysUntilExpiry < 90) return "Expiring Soon";
    return "Active";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Global Asset Management</h1>
          <p className="text-muted-foreground">Comprehensive inventory and asset tracking</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Server
        </Button>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{totalServers}</h3>
                  <span className="text-sm text-success">+{servers.filter(s => {
                    if (!s.created_at) return false;
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(s.created_at) > weekAgo;
                  }).length} this week</span>
                </div>
              </div>
              <Server className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Status</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{onlineServers}</h3>
                  <span className="text-sm text-muted-foreground">({Math.round((onlineServers/totalServers)*100)}%)</span>
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">vCenter Managed</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{vCenterManaged}</h3>
                  <span className="text-sm text-muted-foreground">vs {standaloneServers} standalone</span>
                </div>
              </div>
              <Network className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Datacenters</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{uniqueDatacenters}</h3>
                  <span className="text-sm text-muted-foreground">{productionServers} prod</span>
                </div>
              </div>
              <Building className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="card-enterprise">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search servers, IPs, models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVCenter} onValueChange={setFilterVCenter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Management" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                <SelectItem value="managed">vCenter Managed</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="servers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="servers">Server Inventory</TabsTrigger>
          <TabsTrigger value="network">Network Mapping</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Server Inventory ({filteredServers.length} servers)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Management</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.hostname}</TableCell>
                      <TableCell>{server.ip_address?.toString()}</TableCell>
                      <TableCell>
                        <Badge variant={server.environment === 'production' ? 'destructive' : 'outline'}>
                          {server.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(server.status)}</TableCell>
                      <TableCell>
                        {server.vcenter_id ? 
                          <Badge className="status-online">vCenter</Badge> : 
                          <Badge variant="outline">Standalone</Badge>
                        }
                      </TableCell>
                      <TableCell>{server.datacenter || 'Unknown'}</TableCell>
                      <TableCell>{server.model || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedServer(server)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{server.hostname} - Asset Details</DialogTitle>
                              </DialogHeader>
                              {selectedServer && (
                                <div className="space-y-6">
                                  {/* Server Details Grid */}
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">System Information</h3>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Hostname:</span>
                                          <span>{selectedServer.hostname}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>IP Address:</span>
                                          <span>{selectedServer.ip_address?.toString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Model:</span>
                                          <span>{selectedServer.model || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Service Tag:</span>
                                          <span>{selectedServer.service_tag || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Environment:</span>
                                          <span>{selectedServer.environment}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Domain:</span>
                                          <span>{selectedServer.domain || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">Hardware Specifications</h3>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>CPU Cores:</span>
                                          <span>{selectedServer.cpu_cores || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Memory:</span>
                                          <span>{selectedServer.memory_gb ? `${selectedServer.memory_gb} GB` : 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Storage:</span>
                                          <span>{selectedServer.storage_gb ? `${selectedServer.storage_gb} GB` : 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Rack Location:</span>
                                          <span>{selectedServer.rack_location || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Datacenter:</span>
                                          <span>{selectedServer.datacenter || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Criticality:</span>
                                          <span>{getCriticalityBadge(selectedServer.criticality)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Notes Section */}
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                      <h3 className="font-semibold">Notes & Documentation</h3>
                                      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button size="sm">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Note
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Add Note</DialogTitle>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <Input
                                              placeholder="Note title"
                                              value={newNote.title}
                                              onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                                            />
                                            <Select value={newNote.category} onValueChange={(value) => setNewNote({...newNote, category: value})}>
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="general">General</SelectItem>
                                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                                <SelectItem value="security">Security</SelectItem>
                                                <SelectItem value="performance">Performance</SelectItem>
                                                <SelectItem value="issue">Issue</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Textarea
                                              placeholder="Note content"
                                              value={newNote.content}
                                              onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                                              rows={4}
                                            />
                                            <div className="flex justify-end gap-2">
                                              <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                                                Cancel
                                              </Button>
                                              <Button onClick={addNote}>Add Note</Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {notes.length > 0 ? notes.map((note) => (
                                        <div key={note.id} className="p-3 border rounded-lg">
                                          <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium">{note.title}</h4>
                                            <Badge variant="outline">{note.category}</Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground mb-2">{note.content}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(note.created_at))} ago
                                          </p>
                                        </div>
                                      )) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                          No notes available for this server
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  IP Range Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(ipRanges).map(([subnet, serversInSubnet]: [string, any]) => (
                    <div key={subnet} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{subnet}</span>
                        <Badge variant="outline">{serversInSubnet.length} servers</Badge>
                      </div>
                      <Progress value={(serversInSubnet.length / 254) * 100} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{Math.round((serversInSubnet.length / 254) * 100)}% utilized</span>
                        <span>{254 - serversInSubnet.length} IPs available</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Datacenter Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...new Set(servers.filter(s => s.datacenter).map(s => s.datacenter))].map((datacenter) => {
                    const dcServers = servers.filter(s => s.datacenter === datacenter);
                    const onlineInDC = dcServers.filter(s => s.status === 'online').length;
                    return (
                      <div key={datacenter} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{datacenter}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline">{dcServers.length} total</Badge>
                            <Badge className="status-online">{onlineInDC} online</Badge>
                          </div>
                        </div>
                        <Progress value={(onlineInDC / dcServers.length) * 100} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Firmware Up-to-Date</span>
                      <span className="text-success">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Security Patches Current</span>
                      <span className="text-warning">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Configuration Baseline</span>
                      <span className="text-success">91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Compliance Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium">Critical Firmware Updates</p>
                      <p className="text-sm text-muted-foreground">12 servers need immediate updates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
                    <Clock className="w-4 h-4 text-warning" />
                    <div className="flex-1">
                      <p className="font-medium">Warranty Expiring</p>
                      <p className="text-sm text-muted-foreground">8 servers expire within 90 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                    <Shield className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Security Scan Pending</p>
                      <p className="text-sm text-muted-foreground">5 servers need security assessment</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Warranty Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {servers.filter(s => (s as any).warranty_end_date).slice(0, 10).map((server) => (
                    <div key={server.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{server.hostname}</p>
                        <p className="text-sm text-muted-foreground">{server.model}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          calculateWarrantyStatus((server as any).warranty_end_date) === 'Expired' ? 'destructive' :
                          calculateWarrantyStatus((server as any).warranty_end_date) === 'Expiring Soon' ? 'default' : 'outline'
                        }>
                          {calculateWarrantyStatus((server as any).warranty_end_date)}
                        </Badge>
                        {(server as any).warranty_end_date && (
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date((server as any).warranty_end_date))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cost Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Hardware Asset Value</span>
                      <span className="font-bold">$2.4M</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Annual Depreciation</span>
                      <span>$480K</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Maintenance Costs</span>
                      <span className="font-bold">$180K/year</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Per Server Average</span>
                      <span>${Math.round(180000 / totalServers)}/year</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Power & Cooling</span>
                      <span className="font-bold">$96K/year</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Efficiency Opportunity</span>
                      <span className="text-success">Save $12K</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  CPU Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">67%</div>
                    <p className="text-sm text-muted-foreground">Average utilization</p>
                  </div>
                  <Progress value={67} className="h-2" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Peak (last 7 days)</span>
                      <span>89%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capacity available</span>
                      <span className="text-success">33%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MonitorSpeaker className="w-5 h-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">74%</div>
                    <p className="text-sm text-muted-foreground">Average memory usage</p>
                  </div>
                  <Progress value={74} className="h-2" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Peak (last 7 days)</span>
                      <span>92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Servers {'>'}90% usage</span>
                      <span className="text-warning">8 servers</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Storage Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">58%</div>
                    <p className="text-sm text-muted-foreground">Average storage usage</p>
                  </div>
                  <Progress value={58} className="h-2" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total capacity</span>
                      <span>12.8 TB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth rate</span>
                      <span className="text-primary">+2.1% monthly</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Capacity Planning Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Immediate Actions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <div className="flex-1">
                        <p className="font-medium">Memory Upgrade Required</p>
                        <p className="text-sm text-muted-foreground">8 servers approaching memory limits</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                      <HardDrive className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Storage Optimization</p>
                        <p className="text-sm text-muted-foreground">Consider data archival for 12 servers</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Planning Horizon</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>6 months forecast</span>
                      <span className="text-warning">Capacity constrained</span>
                    </div>
                    <div className="flex justify-between">
                      <span>12 months forecast</span>
                      <span className="text-destructive">Additional servers needed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recommended action</span>
                      <span className="text-primary">Plan Q2 expansion</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}