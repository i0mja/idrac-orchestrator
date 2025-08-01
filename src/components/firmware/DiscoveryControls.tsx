import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  RefreshCw, 
  Server, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Download
} from "lucide-react";

interface DiscoveryControlsProps {
  servers: any[];
  onDiscoveryComplete: () => void;
}

export function DiscoveryControls({ servers, onDiscoveryComplete }: DiscoveryControlsProps) {
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [discoveryType, setDiscoveryType] = useState('firmware');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any>(null);
  const { toast } = useToast();

  const handleDiscovery = async () => {
    const serverIds = selectedServers.length > 0 ? selectedServers : servers.map(s => s.id);
    
    if (serverIds.length === 0) {
      toast({
        title: "No Servers",
        description: "No servers available for discovery",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    setDiscoveryResults(null);

    try {
      console.log(`Starting ${discoveryType} discovery for ${serverIds.length} servers`);

      if (discoveryType === 'firmware') {
        // Run firmware discovery
        const { data, error } = await supabase.functions.invoke('redfish-discovery', {
          body: {
            serverIds,
            discoverFirmware: true
          }
        });

        if (error) throw error;
        setDiscoveryResults(data);

        // Also check for firmware updates
        const updateChecks = await Promise.allSettled(
          serverIds.map(serverId => 
            supabase.functions.invoke('server-firmware-check', {
              body: { serverId, downloadUpdates: false }
            })
          )
        );

        const successfulChecks = updateChecks.filter(result => result.status === 'fulfilled').length;
        
        toast({
          title: "Discovery Complete",
          description: `Discovered ${data.discovered?.length || 0} servers. Checked firmware on ${successfulChecks} servers.`,
        });

      } else {
        // Run system discovery only
        const { data, error } = await supabase.functions.invoke('redfish-discovery', {
          body: {
            serverIds,
            discoverFirmware: false
          }
        });

        if (error) throw error;
        setDiscoveryResults(data);

        toast({
          title: "System Discovery Complete",
          description: `Discovered ${data.discovered?.length || 0} servers`,
        });
      }

      onDiscoveryComplete();

    } catch (error) {
      console.error('Discovery failed:', error);
      toast({
        title: "Discovery Failed",
        description: "Failed to complete server discovery",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Discovery Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Server Discovery Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Discovery Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Discovery Type</label>
              <Select value={discoveryType} onValueChange={setDiscoveryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Info Only</SelectItem>
                  <SelectItem value="firmware">System + Firmware Discovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Servers</label>
              <Select 
                value={selectedServers.length === servers.length ? "all" : "selected"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedServers(servers.map(s => s.id));
                  } else {
                    setSelectedServers([]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select servers..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers ({servers.length})</SelectItem>
                  <SelectItem value="selected">Selected Servers ({selectedServers.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleDiscovery}
                disabled={isDiscovering}
                className="w-full gap-2"
              >
                {isDiscovering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {isDiscovering ? 'Discovering...' : 'Start Discovery'}
              </Button>
            </div>
          </div>

          {/* Discovery Progress */}
          {isDiscovering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Discovery in progress...</span>
                <span>{selectedServers.length || servers.length} servers</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {/* Discovery Type Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium mb-2">System Info Discovery</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hardware model and serial number</li>
                <li>• Current BIOS and firmware versions</li>
                <li>• System health and status</li>
                <li>• Network and storage configuration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Firmware Discovery</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Available firmware updates</li>
                <li>• Security patch status</li>
                <li>• Update prerequisites and compatibility</li>
                <li>• Download firmware to server local storage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Server Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedServers.includes(server.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServers([...selectedServers, server.id]);
                      } else {
                        setSelectedServers(selectedServers.filter(id => id !== server.id));
                      }
                    }}
                    className="rounded"
                  />
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(server.status)}
                    <div>
                      <h4 className="font-medium">{server.hostname}</h4>
                      <p className="text-sm text-muted-foreground">{server.ip_address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">{server.model || 'Unknown'}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {server.last_discovered 
                      ? new Date(server.last_discovered).toLocaleDateString()
                      : 'Never discovered'
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>

          {servers.length === 0 && (
            <div className="text-center py-8">
              <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Servers Available</h3>
              <p className="text-muted-foreground">
                Add servers to your inventory to start discovery
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovery Results */}
      {discoveryResults && (
        <Card>
          <CardHeader>
            <CardTitle>Discovery Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-800">Successful</h4>
                </div>
                <p className="text-2xl font-bold text-green-600">{discoveryResults.discovered?.length || 0}</p>
                <p className="text-sm text-green-700">Servers discovered</p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-medium text-red-800">Failed</h4>
                </div>
                <p className="text-2xl font-bold text-red-600">{discoveryResults.failed?.length || 0}</p>
                <p className="text-sm text-red-700">Connection failures</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800">Updates</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {discoveryResults.summary?.totalUpdates || 0}
                </p>
                <p className="text-sm text-blue-700">Available firmware updates</p>
              </div>
            </div>

            {/* Detailed Results */}
            {discoveryResults.discovered && discoveryResults.discovered.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Discovery Details</h4>
                <div className="space-y-2">
                  {discoveryResults.discovered.map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{result.hostname}</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Discovered
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Results */}
            {discoveryResults.failed && discoveryResults.failed.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3 text-red-800">Failed Discoveries</h4>
                <div className="space-y-2">
                  {discoveryResults.failed.map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="font-medium">{result.hostname}</span>
                      <span className="text-sm text-red-600">{result.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}