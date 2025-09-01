import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CredentialManagement } from "../credentials/CredentialManagement";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Server, 
  Network, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  HardDrive
} from "lucide-react";

interface DiscoveryResult {
  hostname: string;
  ip_address: string;
  model: string;
  service_tag: string;
  idrac_version: string;
  bios_version: string;
  status: string;
}

export function NetworkDiscovery() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveryResult[]>([]);
  const [credentials, setCredentials] = useState({
    username: 'root',
    password: 'calvin'
  });
  const [scanConfig, setScanConfig] = useState({
    ipRange: '192.168.1.1-50',
    timeout: 10,
    datacenterId: null as string | null
  });

  const [datacenters, setDatacenters] = useState<Array<{
    id: string;
    name: string;
    ip_scopes: Array<{ subnet: string; vlan?: number; description?: string }>;
  }>>([]);

  const { toast } = useToast();

  useEffect(() => {
    const fetchDatacenters = async () => {
      try {
        const { data, error } = await supabase
          .from('datacenters')
          .select('id, name, ip_scopes')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setDatacenters((data || []).map(dc => ({
          ...dc,
          ip_scopes: (dc.ip_scopes as any) || []
        })));
      } catch (error) {
        console.error('Error fetching datacenters:', error);
      }
    };

    fetchDatacenters();
  }, []);

  const startNetworkScan = async () => {
    if (!scanConfig.ipRange.trim()) {
      toast({
        title: "Invalid Configuration",
        description: "Please specify an IP range to scan",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setDiscoveredServers([]);

    try {
      // Calculate expected scan range for progress
      const [startIp, endRange] = scanConfig.ipRange.includes('-') 
        ? [scanConfig.ipRange.split('-')[0], parseInt(scanConfig.ipRange.split('-')[1])]
        : [scanConfig.ipRange, parseInt(scanConfig.ipRange.split('.')[3])];
      
      const startRange = parseInt(startIp.split('.')[3]);
      const totalHosts = endRange - startRange + 1;

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + (100 / totalHosts) * 2, 95));
      }, 1000);

      console.log('Starting network discovery:', {
        ipRange: scanConfig.ipRange,
        credentials: { ...credentials, password: '***' }
      });

      const { data, error } = await supabase.functions.invoke('discover-servers', {
        body: {
          ipRange: scanConfig.ipRange,
          credentials: credentials,
          datacenterId: scanConfig.datacenterId,
          useCredentialProfiles: true // Enable credential profile system
        }
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (error) throw error;

      setDiscoveredServers(data.servers || []);
      
      toast({
        title: "Network Scan Complete",
        description: `Discovered ${data.discovered} Dell servers with iDRAC access`,
      });

    } catch (error) {
      console.error('Network scan error:', error);
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to complete network scan",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const runRedfishDiscovery = async (serverIds: string[]) => {
    if (serverIds.length === 0) return;

    try {
      toast({
        title: "Starting Redfish Discovery",
        description: `Scanning ${serverIds.length} servers for firmware information...`,
      });

      const { data, error } = await supabase.functions.invoke('redfish-discovery', {
        body: {
          serverIds,
          discoverFirmware: true
        }
      });

      if (error) throw error;

      toast({
        title: "Redfish Discovery Complete",
        description: `Updated ${data.discovered?.length || 0} servers with latest firmware data`,
      });

    } catch (error) {
      console.error('Redfish discovery error:', error);
      toast({
        title: "Discovery Failed", 
        description: error.message || "Failed to complete Redfish discovery",
        variant: "destructive"
      });
    }
  };

  const addToInventory = async (servers: DiscoveryResult[]) => {
    if (servers.length === 0) return;

    try {
      // Servers are already added by the discover-servers function
      // But we can run additional discovery for more details
      const serverIds = servers.map(s => s.ip_address); // Use IP as identifier for now
      await runRedfishDiscovery(serverIds);

      toast({
        title: "Servers Added",
        description: `${servers.length} servers added to inventory with full discovery`,
      });

    } catch (error) {
      console.error('Add to inventory error:', error);
      toast({
        title: "Error",
        description: "Failed to add servers to inventory",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gradient">Network Discovery</h2>
        <p className="text-muted-foreground">
          Scan your network to discover Dell servers with iDRAC/BMC access
        </p>
      </div>

      <Tabs defaultValue="discovery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discovery">Network Scanning</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="discovery" className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan Configuration */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Scan Configuration
            </CardTitle>
            <CardDescription>
              Configure network range and credentials for discovery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datacenter">Datacenter (Optional)</Label>
              <select
                id="datacenter"
                value={scanConfig.datacenterId || ''}
                onChange={(e) => setScanConfig(prev => ({ ...prev, datacenterId: e.target.value || null }))}
                className="w-full p-2 border rounded-md"
                disabled={isScanning}
              >
                <option value="">Select datacenter or use custom range</option>
                {datacenters.map(dc => (
                  <option key={dc.id} value={dc.id}>
                    {dc.name} ({dc.ip_scopes.length} scopes)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipRange">IP Range</Label>
              <Input
                id="ipRange"
                value={scanConfig.ipRange}
                onChange={(e) => setScanConfig(prev => ({ ...prev, ipRange: e.target.value }))}
                placeholder="192.168.1.1-50 or 192.168.1.100"
                disabled={isScanning}
              />
              <p className="text-xs text-muted-foreground">
                {scanConfig.datacenterId 
                  ? "Leave blank to use all datacenter scopes, or specify custom range"
                  : "Formats: 192.168.1.1-50 (range) or 192.168.1.100 (single IP)"
                }
              </p>
              {scanConfig.datacenterId && (
                <div className="bg-muted/50 p-2 rounded text-xs">
                  <span className="font-medium">Selected datacenter scopes:</span>
                  {datacenters.find(dc => dc.id === scanConfig.datacenterId)?.ip_scopes.map((scope, i) => (
                    <div key={i} className="ml-2">{scope.subnet}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  disabled={isScanning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isScanning}
                />
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Settings className="w-4 h-4" />
                <span className="font-medium">Credential Management</span>
              </div>
              <p className="text-muted-foreground">
                Uses credential profiles with IP range assignments and fallback mechanisms. Fallback: root/calvin if no profiles match.
              </p>
            </div>

            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Scanning network...</span>
                  <span className="text-sm">{Math.round(scanProgress)}%</span>
                </div>
                <Progress value={scanProgress} />
              </div>
            )}

            <Button 
              onClick={startNetworkScan} 
              disabled={isScanning}
              className="w-full"
            >
              {isScanning ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Scanning Network...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Start Network Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Scan Results Summary */}
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Discovery Results
            </CardTitle>
            <CardDescription>
              Servers discovered in the last scan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {discoveredServers.length === 0 ? (
              <div className="text-center py-8">
                <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No servers discovered yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure scan settings and start a network scan
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Found {discoveredServers.length} servers</span>
                  <Button 
                    size="sm" 
                    onClick={() => addToInventory(discoveredServers)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Run Full Discovery
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {discoveredServers.map((server, index) => (
                    <div key={index} className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{server.hostname}</span>
                        <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                          {server.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>IP: {server.ip_address}</div>
                        <div>Model: {server.model}</div>
                        {server.service_tag && <div>Service Tag: {server.service_tag}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discovery Methods */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>Discovery Methods</CardTitle>
          <CardDescription>
            Dell server discovery uses multiple protocols for comprehensive scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Redfish API</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Modern REST API for Dell PowerEdge servers (iDRAC 8+ with firmware 2.40+)
              </p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">IPMI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Legacy protocol for older Dell servers and BMC access
              </p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Dell SVC Tags</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Service tag integration for warranty and support information
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <CredentialManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}