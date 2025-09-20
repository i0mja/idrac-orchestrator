import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Zap,
  Shield,
  Network,
  Terminal,
  Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProtocolHealth {
  protocol: 'REDFISH' | 'WSMAN' | 'RACADM' | 'IPMI' | 'SSH';
  status: 'healthy' | 'degraded' | 'unreachable';
  latencyMs?: number;
  checkedAt: number;
  details?: string;
  lastErrorClassification?: 'transient' | 'authentication' | 'network' | 'protocol' | 'critical';
}

interface ServerProtocolStatus {
  id: string;
  hostname: string;
  ip_address: any;
  protocol_capabilities: any;
  healthiest_protocol?: string;
  last_protocol_check?: string;
}

const protocolIcons = {
  REDFISH: Server,
  WSMAN: Network,
  RACADM: Terminal,
  IPMI: Zap,
  SSH: Shield
};

const statusColors = {
  healthy: 'text-green-500',
  degraded: 'text-yellow-500',
  unreachable: 'text-red-500'
};

const statusVariants = {
  healthy: 'default' as const,
  degraded: 'secondary' as const,
  unreachable: 'destructive' as const
};

export function ProtocolHealthMonitor() {
  const [servers, setServers] = useState<ServerProtocolStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerProtocolStatus | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadServerProtocolStatus();
    
    // Set up real-time subscription for protocol updates
    const subscription = supabase
      .channel('protocol-health')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'servers',
        filter: 'protocol_capabilities=not.is.null'
      }, (payload) => {
        console.log('Protocol status updated:', payload);
        loadServerProtocolStatus();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadServerProtocolStatus = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('servers')
        .select(`
          id,
          hostname,
          ip_address,
          protocol_capabilities,
          healthiest_protocol,
          last_protocol_check
        `)
        .not('protocol_capabilities', 'is', null)
        .order('last_protocol_check', { ascending: false });
      
      if (error) throw error;
      
      setServers(data || []);
    } catch (error) {
      console.error('Error loading protocol status:', error);
      toast({
        title: "Error",
        description: "Failed to load protocol health status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProtocolHealth = async (serverId?: string) => {
    try {
      setIsRefreshing(true);
      
      toast({
        title: "Refreshing Protocol Health",
        description: serverId ? "Testing protocols for selected server..." : "Testing protocols for all servers...",
      });
      
      // This would trigger protocol health checks via the enhanced discovery system
      const { data, error } = await supabase.functions.invoke('enhanced-discovery', {
        body: {
          ipRange: serverId ? servers.find(s => s.id === serverId)?.ip_address : '192.168.1.1-254',
          detectProtocols: true,
          checkFirmware: false,
          useCredentialProfiles: true
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Health Check Complete",
        description: `Protocol health updated for ${data?.discovered || 0} servers`,
      });
      
      await loadServerProtocolStatus();
    } catch (error) {
      console.error('Error refreshing protocol health:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh protocol health",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getProtocolStats = () => {
    const stats = {
      total: 0,
      healthy: 0,
      degraded: 0,
      unreachable: 0,
      avgLatency: 0
    };
    
    let totalLatency = 0;
    let latencyCount = 0;
    
    servers.forEach(server => {
      if (server.protocol_capabilities && Array.isArray(server.protocol_capabilities)) {
        server.protocol_capabilities.forEach(protocol => {
          stats.total++;
          stats[protocol.status]++;
          
          if (protocol.latencyMs) {
            totalLatency += protocol.latencyMs;
            latencyCount++;
          }
        });
      }
    });
    
    stats.avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
    
    return stats;
  };

  const stats = getProtocolStats();

  if (loading) {
    return <div className="p-4">Loading protocol health status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Protocol Health Monitor</h2>
          <p className="text-muted-foreground">Real-time status of server management protocols</p>
        </div>
        <Button 
          onClick={() => refreshProtocolHealth()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Protocols</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across {servers.length} servers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.healthy}</div>
            <Progress 
              value={(stats.healthy / stats.total) * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Degraded</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.degraded}</div>
            <Progress 
              value={(stats.degraded / stats.total) * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Server Protocol Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <Card 
            key={server.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedServer(server)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{server.hostname}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshProtocolHealth(server.id);
                  }}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CardDescription>{server.ip_address}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {server.protocol_capabilities && Array.isArray(server.protocol_capabilities) ? (
                  server.protocol_capabilities.map((protocol) => {
                    const Icon = protocolIcons[protocol.protocol];
                    return (
                      <div key={protocol.protocol} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{protocol.protocol}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {protocol.latencyMs && (
                            <span className="text-xs text-muted-foreground">
                              {protocol.latencyMs}ms
                            </span>
                          )}
                          <Badge variant={statusVariants[protocol.status]}>
                            {protocol.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No protocol data available</p>
                )}
                
                {server.healthiest_protocol && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Primary: {server.healthiest_protocol}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {server.last_protocol_check && (
                  <p className="text-xs text-muted-foreground">
                    Last checked: {new Date(server.last_protocol_check).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {servers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Protocol Data</h3>
              <p className="text-muted-foreground mb-4">
                No servers with protocol capabilities found. Run enhanced discovery to populate protocol health data.
              </p>
              <Button onClick={() => refreshProtocolHealth()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Protocol Discovery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}