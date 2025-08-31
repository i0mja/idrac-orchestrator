import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDatacenterScopes } from "@/hooks/useDatacenterScopes";
import { 
  Server, 
  MapPin, 
  Network, 
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Building2,
  Filter
} from "lucide-react";

interface Server {
  id: string;
  hostname: string;
  ip_address: string;
  model: string;
  datacenter: string | null;
  status: string;
  service_tag: string | null;
  last_discovered: string | null;
  discovery_source: string | null;
}

export function EnhancedServerManagement() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('');
  const [unmappedCount, setUnmappedCount] = useState(0);

  const { datacenters, getDatacenterForIP, checkIPInScope } = useDatacenterScopes();
  const { toast } = useToast();

  const fetchServers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('servers')
        .select('id, hostname, ip_address, model, datacenter, status, service_tag, last_discovered, discovery_source')
        .order('hostname');

      if (error) throw error;
      
      const serverData = data || [];
      setServers(serverData.map(s => ({
        ...s,
        ip_address: s.ip_address ? s.ip_address.toString() : ''
      })));
      
      // Count servers without datacenter assignment
      const unmapped = serverData.filter(s => !s.datacenter).length;
      setUnmappedCount(unmapped);
      
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: "Error",
        description: "Failed to load servers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const autoAssignDatacenters = async () => {
    try {
      let assignedCount = 0;
      const updates = [];

      for (const server of servers) {
        if (!server.datacenter && server.ip_address) {
          const datacenterId = await getDatacenterForIP(server.ip_address);
          if (datacenterId) {
            const datacenter = datacenters.find(dc => dc.id === datacenterId);
            if (datacenter) {
              updates.push({
                id: server.id,
                datacenter: datacenter.name
              });
              assignedCount++;
            }
          }
        }
      }

      if (updates.length > 0) {
        const { error } = await supabase
          .from('servers')
          .upsert(updates);

        if (error) throw error;

        toast({
          title: "Auto-Assignment Complete",
          description: `Assigned ${assignedCount} servers to datacenters based on IP scopes`
        });

        fetchServers();
      } else {
        toast({
          title: "No Assignments Made",
          description: "All servers are already assigned or no matching IP scopes found"
        });
      }
    } catch (error) {
      console.error('Error auto-assigning datacenters:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to auto-assign datacenters",
        variant: "destructive"
      });
    }
  };

  const validateServerIP = async (server: Server) => {
    if (!server.datacenter || !server.ip_address) return null;
    
    const datacenter = datacenters.find(dc => dc.name === server.datacenter);
    if (!datacenter) return null;

    const isInScope = await checkIPInScope(server.ip_address, datacenter.id);
    return isInScope;
  };

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.ip_address.includes(searchTerm) ||
                         (server.model && server.model.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDatacenter = !selectedDatacenter || server.datacenter === selectedDatacenter;
    
    return matchesSearch && matchesDatacenter;
  });

  const uniqueDatacenters = Array.from(new Set(servers.map(s => s.datacenter).filter(Boolean)));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Server Management</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Server Management</h2>
          <p className="text-muted-foreground">
            Manage servers with automatic datacenter assignment based on IP scopes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchServers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {unmappedCount > 0 && (
            <Button onClick={autoAssignDatacenters}>
              <Network className="w-4 h-4 mr-2" />
              Auto-Assign ({unmappedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{servers.length}</div>
                <div className="text-sm text-muted-foreground">Total Servers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{servers.filter(s => s.datacenter).length}</div>
                <div className="text-sm text-muted-foreground">Assigned to DC</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{unmappedCount}</div>
                <div className="text-sm text-muted-foreground">Unmapped</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold">{servers.filter(s => s.status === 'online').length}</div>
                <div className="text-sm text-muted-foreground">Online</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search servers by hostname, IP, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-48">
          <select
            value={selectedDatacenter}
            onChange={(e) => setSelectedDatacenter(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">All Datacenters</option>
            {uniqueDatacenters.map(dc => (
              <option key={dc} value={dc}>{dc}</option>
            ))}
            <option value="unmapped">Unmapped Servers</option>
          </select>
        </div>
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => (
          <Card key={server.id} className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  {server.hostname}
                </div>
                <Badge 
                  variant={server.status === 'online' ? 'default' : 'secondary'}
                >
                  {server.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Network className="w-3 h-3" />
                    {server.ip_address}
                  </div>
                  {server.model && (
                    <div className="text-sm text-muted-foreground">
                      {server.model}
                    </div>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {server.datacenter ? (
                  <span className="text-green-600 font-medium">{server.datacenter}</span>
                ) : (
                  <span className="text-amber-600">Not assigned</span>
                )}
              </div>
              
              {server.service_tag && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Service Tag: </span>
                  <span className="font-mono">{server.service_tag}</span>
                </div>
              )}

              {server.last_discovered && (
                <div className="text-sm text-muted-foreground">
                  Last discovered: {new Date(server.last_discovered).toLocaleDateString()}
                </div>
              )}

              {server.discovery_source && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {server.discovery_source === 'network_scan' ? 'Network Scan' : server.discovery_source}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No servers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedDatacenter 
              ? "Try adjusting your filters or search term"
              : "Start by discovering servers in your network"
            }
          </p>
        </div>
      )}
    </div>
  );
}