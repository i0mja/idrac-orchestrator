// Enhanced: Multi-datacenter inventory with OS detection and EOL management
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { useVCenterIntegratedServers } from "@/hooks/useVCenterIntegratedServers";
import { useVCenterService } from "@/hooks/useVCenterService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Server,
  Network,
  MapPin,
  Database,
  Shield,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Cpu,
  HardDrive,
  MonitorSpeaker,
  Globe,
  Calendar,
  Scan,
  Download,
  Upload,
  Terminal,
  Settings,
  Eye
} from "lucide-react";

export function EnhancedGlobalInventory() {
  const { 
    servers: enhancedServers, 
    datacenters, 
    osCompatibility, 
    eolAlerts,
    loading: enhancedLoading,
    detectServerOS,
    updateServerOS,
    acknowledgeEOLAlert,
    getServersByDatacenter,
    getServersByOS,
    getEOLRiskServers,
    getExpiringServers
  } = useEnhancedServers();
  
  const { 
    servers: integratedServers, 
    loading: vCenterLoading,
    getServerStats,
    getVCenterManagedServers,
    getStandaloneServers 
  } = useVCenterIntegratedServers();
  
  const { vcenters, syncHosts } = useVCenterService();
  
  // Use integrated servers that include vCenter information
  const servers = integratedServers.length > 0 ? integratedServers : enhancedServers;
  const loading = enhancedLoading || vCenterLoading;
  
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnvironment, setFilterEnvironment] = useState("all");
  const [filterDatacenter, setFilterDatacenter] = useState("all");
  const [filterOS, setFilterOS] = useState("all");
  const [filterEOLRisk, setFilterEOLRisk] = useState("all");
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Enhanced: Multi-dimensional filtering
  const filteredServers = useMemo(() => {
    return servers.filter(server => {
      const matchesSearch = server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           server.ip_address?.toString().includes(searchTerm) ||
                           server.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           server.operating_system?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEnvironment = filterEnvironment === "all" || server.environment === filterEnvironment;
      const matchesDatacenter = filterDatacenter === "all" || 
        (server as any).site_id === filterDatacenter || 
        (server as any).datacenter === filterDatacenter;
      const matchesOS = filterOS === "all" || server.operating_system === filterOS;
      
      let matchesEOLRisk = true;
      if (filterEOLRisk === "eol") {
        matchesEOLRisk = server.os_eol_date && new Date(server.os_eol_date) <= new Date();
      } else if (filterEOLRisk === "expiring") {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 90);
        matchesEOLRisk = server.os_eol_date && 
          new Date(server.os_eol_date) <= futureDate && 
          new Date(server.os_eol_date) > new Date();
      } else if (filterEOLRisk === "safe") {
        matchesEOLRisk = !server.os_eol_date || new Date(server.os_eol_date) > new Date();
      }

      return matchesSearch && matchesEnvironment && matchesDatacenter && matchesOS && matchesEOLRisk;
    });
  }, [servers, searchTerm, filterEnvironment, filterDatacenter, filterOS, filterEOLRisk]);

  // Enhanced: Statistics with multi-datacenter and OS breakdown
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const eolRiskServers = getEOLRiskServers();
  const expiringServers = getExpiringServers();
  const ismInstalledServers = servers.filter(s => s.ism_installed).length;
  
  // OS distribution
  const osTypes = [...new Set(servers.map(s => s.operating_system).filter(Boolean))];
  const uniqueDatacenters = datacenters.length;

  const handleOSDetection = async (serverId: string) => {
    await detectServerOS(serverId);
  };

  const handleISMInstall = async (serverId: string) => {
    // Simulate iSM installation
    toast({
      title: "iSM Installation",
      description: "Installing iDRAC Service Module...",
    });
    
    // Simulate installation delay
    setTimeout(() => {
      toast({
        title: "iSM Installed",
        description: "iDRAC Service Module installed successfully",
      });
    }, 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online": return <Badge className="status-online">Online</Badge>;
      case "offline": return <Badge className="status-offline">Offline</Badge>;
      case "updating": return <Badge className="status-updating">Updating</Badge>;
      case "maintenance": return <Badge className="status-warning">Maintenance</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOSRiskBadge = (server: any) => {
    if (!server.os_eol_date) return <Badge variant="outline">Unknown EOL</Badge>;
    
    const eolDate = new Date(server.os_eol_date);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    
    if (eolDate <= now) {
      return <Badge variant="destructive">EOL</Badge>;
    } else if (eolDate <= futureDate) {
      return <Badge className="bg-orange-500">Expiring Soon</Badge>;
    }
    return <Badge className="status-online">Current</Badge>;
  };

  const getDatacenterName = (siteId: string | null) => {
    if (!siteId) return "Unknown";
    const dc = datacenters.find(d => d.id === siteId);
    return dc?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Database className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading enhanced inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Enhanced Global Inventory</h1>
          <p className="text-muted-foreground">OS-agnostic management with multi-datacenter support</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>
            <Scan className="w-4 h-4 mr-2" />
            Auto-Discovery
          </Button>
        </div>
      </div>

      {/* Enhanced: EOL Alerts */}
      {eolAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{eolAlerts.length} servers with EOL operating systems detected</span>
              <div className="flex gap-2">
                {eolAlerts.slice(0, 3).map((alert) => (
                  <Button
                    key={alert.id}
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeEOLAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced: Multi-datacenter Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <h3 className="text-2xl font-bold">{totalServers}</h3>
                <span className="text-sm text-success">{uniqueDatacenters} datacenters</span>
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
                <h3 className="text-2xl font-bold">{onlineServers}</h3>
                <span className="text-sm text-muted-foreground">({Math.round((onlineServers/totalServers)*100)}%)</span>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">EOL Risk</p>
                <h3 className="text-2xl font-bold text-destructive">{eolRiskServers.length}</h3>
                <span className="text-sm text-warning">{expiringServers.length} expiring</span>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OS Variants</p>
                <h3 className="text-2xl font-bold">{osTypes.length}</h3>
                <span className="text-sm text-muted-foreground">detected</span>
              </div>
              <MonitorSpeaker className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">iSM Installed</p>
                <h3 className="text-2xl font-bold">{ismInstalledServers}</h3>
                <span className="text-sm text-muted-foreground">({Math.round((ismInstalledServers/totalServers)*100)}%)</span>
              </div>
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced: Multi-dimensional Search and Filters */}
      <Card className="card-enterprise">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search servers, IPs, models, OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterDatacenter} onValueChange={setFilterDatacenter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Datacenter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Datacenters</SelectItem>
                {datacenters.map((dc) => (
                  <SelectItem key={dc.id} value={dc.id}>{dc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterOS} onValueChange={setFilterOS}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="OS Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OS</SelectItem>
                {osTypes.map((os) => (
                  <SelectItem key={os} value={os}>{os}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEOLRisk} onValueChange={setFilterEOLRisk}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="EOL Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="eol">EOL</SelectItem>
                <SelectItem value="expiring">Expiring</SelectItem>
                <SelectItem value="safe">Current</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced: Server Inventory Table */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Enhanced Server Inventory ({filteredServers.length} servers)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Datacenter</TableHead>
                <TableHead>Operating System</TableHead>
                <TableHead>EOL Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>iSM</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{server.hostname}</div>
                      <div className="text-xs text-muted-foreground">{server.ip_address?.toString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {server.vcenter_id ? (
                        <>
                          <Network className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium text-blue-600">vCenter</div>
                            <div className="text-xs text-muted-foreground">{(server as any).vcenter_name}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Server className="w-4 h-4 text-muted-foreground" />
                          <span>Standalone</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span>{getDatacenterName((server as any).site_id || (server as any).datacenter)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {server.operating_system ? (
                      <div>
                        <div className="font-medium">{server.operating_system}</div>
                        {server.os_version && (
                          <div className="text-xs text-muted-foreground">v{server.os_version}</div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getOSRiskBadge(server)}
                    {server.os_eol_date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        EOL: {new Date(server.os_eol_date).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(server.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {server.ism_installed ? (
                        <Badge className="status-online">Installed</Badge>
                      ) : (
                        <Badge variant="outline">Not Installed</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{server.hostname} - Enhanced Details</DialogTitle>
                          </DialogHeader>
                          {selectedServer && (
                            <div className="space-y-6">
                              {/* Enhanced: Server details with OS and EOL information */}
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
                                      <span>Datacenter:</span>
                                      <span>{getDatacenterName(selectedServer.site_id)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h3 className="font-semibold">Operating System</h3>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span>OS:</span>
                                      <span>{selectedServer.operating_system || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Version:</span>
                                      <span>{selectedServer.os_version || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>EOL Date:</span>
                                      <span className={selectedServer.os_eol_date && new Date(selectedServer.os_eol_date) <= new Date() ? 'text-destructive font-bold' : ''}>
                                        {selectedServer.os_eol_date ? new Date(selectedServer.os_eol_date).toLocaleDateString() : 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Risk Level:</span>
                                      <span className={`capitalize ${selectedServer.security_risk_level === 'high' ? 'text-destructive' : ''}`}>
                                        {selectedServer.security_risk_level}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>iSM Status:</span>
                                      <span>{selectedServer.ism_installed ? 'Installed' : 'Not Installed'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Enhanced: OS-specific actions */}
                              <div className="space-y-4">
                                <h3 className="font-semibold">OS-Agnostic Actions</h3>
                                <div className="flex gap-2 flex-wrap">
                                  <Button 
                                    onClick={() => handleOSDetection(selectedServer.id)}
                                    size="sm"
                                  >
                                    <Scan className="w-4 h-4 mr-2" />
                                    Detect OS
                                  </Button>
                                  {!selectedServer.ism_installed && (
                                    <Button 
                                      onClick={() => handleISMInstall(selectedServer.id)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Install iSM
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Terminal className="w-4 h-4 mr-2" />
                                    iDRAC Console
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Remote Config
                                  </Button>
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
    </div>
  );
}