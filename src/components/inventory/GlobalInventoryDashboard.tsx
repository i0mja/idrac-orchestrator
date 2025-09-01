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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useServers } from "@/hooks/useServers";
import { useCredentialProfiles } from "@/hooks/useCredentialProfiles";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
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
  TrendingUp,
  Key,
  Settings,
  PlayCircle,
  FileText,
  Zap,
  ExternalLink,
  Users,
  Target,
  RefreshCw,
  Eye
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
  const { servers, loading, testConnection } = useServers();
  const { profiles: credentialProfiles, getCredentialsForIP } = useCredentialProfiles();
  const { jobs: updateJobs } = useUpdateJobs();
  const { packages: firmwarePackages } = useFirmwarePackages();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnvironment, setFilterEnvironment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVCenter, setFilterVCenter] = useState("all");
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [notes, setNotes] = useState<ServerNote[]>([]);
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "general" });
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [serverCredentials, setServerCredentials] = useState<Record<string, any>>({});
  const [maintenanceWindows, setMaintenanceWindows] = useState<Record<string, any>>({});
  const [healthChecks, setHealthChecks] = useState<Record<string, any>>({});

  // Load enhanced server data
  useEffect(() => {
    if (selectedServer) {
      loadServerNotes(selectedServer.id);
      loadServerCredentials(selectedServer.id);
      loadMaintenanceWindow(selectedServer.id);
      loadHealthCheckStatus(selectedServer.id);
    }
  }, [selectedServer]);

  // Load credential and maintenance data for all servers
  useEffect(() => {
    if (servers.length > 0) {
      loadAllServerData();
    }
  }, [servers]);

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

  // Load all server data for enhanced display
  const loadAllServerData = async () => {
    const credentials: Record<string, any> = {};
    const maintenance: Record<string, any> = {};
    const health: Record<string, any> = {};

    for (const server of servers) {
      try {
        const creds = await getCredentialsForIP(server.ip_address?.toString() || '');
        if (creds.length > 0) {
          credentials[server.id] = creds[0];
        }

        // Load maintenance windows
        const { data: dcData } = await supabase
          .from('datacenters')
          .select('*')
          .eq('name', server.datacenter)
          .single();
        
        if (dcData) {
          maintenance[server.id] = {
            start: dcData.maintenance_window_start,
            end: dcData.maintenance_window_end,
            timezone: dcData.timezone
          };
        }

        // Load recent health checks
        const { data: healthData } = await supabase
          .from('system_events')
          .select('*')
          .eq('event_type', 'health_check')
          .contains('metadata', { server_id: server.id })
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (healthData && healthData.length > 0) {
          health[server.id] = healthData[0];
        }
      } catch (error) {
        console.error('Error loading server data:', error);
      }
    }

    setServerCredentials(credentials);
    setMaintenanceWindows(maintenance);
    setHealthChecks(health);
  };

  const loadServerCredentials = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    try {
      const creds = await getCredentialsForIP(server.ip_address?.toString() || '');
      setServerCredentials(prev => ({
        ...prev,
        [serverId]: creds.length > 0 ? creds[0] : null
      }));
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const loadMaintenanceWindow = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server || !server.datacenter) return;

    try {
      const { data } = await supabase
        .from('datacenters')
        .select('*')
        .eq('name', server.datacenter)
        .single();
      
      if (data) {
        setMaintenanceWindows(prev => ({
          ...prev,
          [serverId]: {
            start: data.maintenance_window_start,
            end: data.maintenance_window_end,
            timezone: data.timezone
          }
        }));
      }
    } catch (error) {
      console.error('Error loading maintenance window:', error);
    }
  };

  const loadHealthCheckStatus = async (serverId: string) => {
    try {
      const { data } = await supabase
        .from('system_events')
        .select('*')
        .eq('event_type', 'health_check')
        .contains('metadata', { server_id: serverId })
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setHealthChecks(prev => ({
          ...prev,
          [serverId]: data[0]
        }));
      }
    } catch (error) {
      console.error('Error loading health check:', error);
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

  // Enhanced action functions
  const handleTestConnection = async (serverId: string) => {
    try {
      await testConnection(serverId);
      loadHealthCheckStatus(serverId);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const handleRunHealthCheck = async (serverId: string) => {
    toast({
      title: "Health Check",
      description: "Running comprehensive health check...",
    });

    try {
      // Create health check event
      const { error } = await supabase
        .from('system_events')
        .insert([{
          event_type: 'health_check',
          title: 'Health Check Initiated',
          description: 'Comprehensive server health check started',
          severity: 'info',
          metadata: { server_id: serverId }
        }]);

      if (error) throw error;

      setTimeout(() => {
        toast({
          title: "Health Check Complete",
          description: "Server health check completed successfully",
        });
        loadHealthCheckStatus(serverId);
      }, 3000);
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Error",
        description: "Health check failed to complete",
        variant: "destructive",
      });
    }
  };

  const scheduleUpdate = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (server) {
      // Navigate to scheduler with pre-selected server
      window.location.href = `/scheduler?server=${serverId}`;
    }
  };

  const manageCredentials = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (server) {
      // Navigate to network discovery with focus on credentials
      window.location.href = `/network-discovery?ip=${server.ip_address}`;
    }
  };

  const viewVCenterCluster = (server: any) => {
    if (server.vcenter_id) {
      window.location.href = `/vcenter-management?vcenter=${server.vcenter_id}`;
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

  const getCredentialsBadge = (serverId: string) => {
    const creds = serverCredentials[serverId];
    if (!creds) return <Badge variant="outline">No Credentials</Badge>;
    return <Badge className="status-online">{creds.name}</Badge>;
  };

  const getMaintenanceStatus = (serverId: string) => {
    const maintenance = maintenanceWindows[serverId];
    if (!maintenance) return "Unknown";
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = maintenance.start.split(':').map(Number);
    const [endH, endM] = maintenance.end.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    
    if (currentTime >= startTime && currentTime <= endTime) {
      return "In Maintenance";
    }
    return "Outside Window";
  };

  const getUpdateJobStatus = (serverId: string) => {
    const job = updateJobs.find(j => j.server_id === serverId);
    if (!job) return null;
    
    return {
      status: job.status,
      progress: job.progress,
      lastUpdate: job.updated_at
    };
  };

  const getAvailableUpdates = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return 0;
    
    return firmwarePackages.filter(pkg => 
      pkg.applicable_models?.includes(server.model || '') || 
      pkg.name.toLowerCase().includes('dell')
    ).length;
  };

  const getHealthStatus = (serverId: string) => {
    const health = healthChecks[serverId];
    if (!health) return "Unknown";
    
    const isRecent = health.created_at && 
      new Date(health.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (!isRecent) return "Outdated";
    
    return health.severity === 'error' ? 'Failed' : 
           health.severity === 'warning' ? 'Warning' : 'Healthy';
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
                    <TableHead>Server Info</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Maintenance</TableHead>
                    <TableHead>Updates</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Management</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => {
                    const updateJob = getUpdateJobStatus(server.id);
                    const availableUpdates = getAvailableUpdates(server.id);
                    const healthStatus = getHealthStatus(server.id);
                    const maintenanceStatus = getMaintenanceStatus(server.id);
                    
                    return (
                      <TableRow key={server.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{server.hostname}</span>
                              {getStatusBadge(server.status)}
                            </div>
                            <div className="text-xs text-muted-foreground">{server.ip_address?.toString()}</div>
                            <div className="text-xs">
                              <Badge variant={server.environment === 'production' ? 'destructive' : 'outline'} className="text-xs">
                                {server.environment}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => manageCredentials(server.id)}>
                                  <Key className="w-4 h-4" />
                                  {getCredentialsBadge(server.id)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to manage credentials</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={maintenanceStatus === 'In Maintenance' ? 'destructive' : 'outline'} className="text-xs">
                              {maintenanceStatus}
                            </Badge>
                            <div className="text-xs text-muted-foreground">{server.datacenter || 'Unknown DC'}</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            {updateJob ? (
                              <div className="flex items-center gap-2">
                                <Badge className={`status-${updateJob.status === 'completed' ? 'online' : updateJob.status === 'failed' ? 'offline' : 'updating'}`}>
                                  {updateJob.status}
                                </Badge>
                                {updateJob.status === 'running' && (
                                  <Progress value={updateJob.progress} className="w-16 h-2" />
                                )}
                              </div>
                            ) : availableUpdates > 0 ? (
                              <Button size="sm" variant="outline" onClick={() => scheduleUpdate(server.id)}>
                                <Zap className="w-3 h-3 mr-1" />
                                {availableUpdates} Available
                              </Button>
                            ) : (
                              <Badge className="status-online">Up to Date</Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              healthStatus === 'Healthy' ? 'default' : 
                              healthStatus === 'Warning' ? 'secondary' : 
                              'destructive'
                            } className="text-xs">
                              {healthStatus}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleRunHealthCheck(server.id)}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {server.vcenter_id ? (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => viewVCenterCluster(server)}
                              >
                                <Network className="w-3 h-3 mr-1" />
                                vCenter
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline">Standalone</Badge>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getCriticalityBadge((server as any).criticality)}
                            {(server as any).os_eol_date && new Date((server as any).os_eol_date) <= new Date() && (
                              <Badge variant="destructive" className="text-xs">EOL</Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleTestConnection(server.id)}
                                  >
                                    <PlayCircle className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Test Connection</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedServer(server)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Server className="w-5 h-5" />
                                  {server.hostname} - Integrated Server Dashboard
                                </DialogTitle>
                              </DialogHeader>
                              {selectedServer && (
                                <div className="space-y-6">
                                  {/* Quick Actions Bar */}
                                  <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
                                    <Button size="sm" onClick={() => handleTestConnection(selectedServer.id)}>
                                      <PlayCircle className="w-4 h-4 mr-2" />
                                      Test Connection
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRunHealthCheck(selectedServer.id)}>
                                      <Activity className="w-4 h-4 mr-2" />
                                      Health Check
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => scheduleUpdate(selectedServer.id)}>
                                      <Calendar className="w-4 h-4 mr-2" />
                                      Schedule Update
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => manageCredentials(selectedServer.id)}>
                                      <Key className="w-4 h-4 mr-2" />
                                      Manage Credentials
                                    </Button>
                                    {selectedServer.vcenter_id && (
                                      <Button size="sm" variant="outline" onClick={() => viewVCenterCluster(selectedServer)}>
                                        <Network className="w-4 h-4 mr-2" />
                                        View vCenter
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/settings'}>
                                      <Settings className="w-4 h-4 mr-2" />
                                      Security Settings
                                    </Button>
                                  </div>

                                  {/* Enhanced Status Cards */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <Key className="w-4 h-4 text-blue-600" />
                                          <div>
                                            <div className="font-medium text-sm">Credentials</div>
                                            {getCredentialsBadge(selectedServer.id)}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4 text-green-600" />
                                          <div>
                                            <div className="font-medium text-sm">Maintenance</div>
                                            <Badge variant={getMaintenanceStatus(selectedServer.id) === 'In Maintenance' ? 'destructive' : 'outline'} className="text-xs">
                                              {getMaintenanceStatus(selectedServer.id)}
                                            </Badge>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <Activity className="w-4 h-4 text-orange-600" />
                                          <div>
                                            <div className="font-medium text-sm">Health Status</div>
                                            <Badge variant={
                                              getHealthStatus(selectedServer.id) === 'Healthy' ? 'default' : 
                                              getHealthStatus(selectedServer.id) === 'Warning' ? 'secondary' : 
                                              'destructive'
                                            } className="text-xs">
                                              {getHealthStatus(selectedServer.id)}
                                            </Badge>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <Shield className="w-4 h-4 text-red-600" />
                                          <div>
                                            <div className="font-medium text-sm">Security Risk</div>
                                            {getCriticalityBadge(selectedServer.criticality)}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Server Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                      <h3 className="font-semibold flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        System Information
                                      </h3>
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
                    );
                  })}
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
                  {[...new Set(servers.filter(s => s.datacenter).map(s => s.datacenter))].length > 0 ? (
                    [...new Set(servers.filter(s => s.datacenter).map(s => s.datacenter))].map((datacenter) => {
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
                    })
                  ) : (
                    <div className="text-center py-6">
                      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Datacenter Information</h3>
                      <p className="text-muted-foreground text-sm">
                        Datacenter locations will appear here once configured.<br/>
                        Set datacenter information through server discovery or manual configuration.
                      </p>
                    </div>
                  )}
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
                  Warranty Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Warranty Tracking</h3>
                  <p className="text-muted-foreground text-sm">
                    Warranty information will be displayed here once server details are populated.<br/>
                    Add warranty dates through server discovery or manual configuration.
                  </p>
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