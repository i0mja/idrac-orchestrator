import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  RefreshCw, 
  Search, 
  Server, 
  Shield,
  Zap,
  Network,
  HardDrive,
  Cpu
} from "lucide-react";

interface ServerFirmwareStatus {
  serverId: string;
  hostname: string;
  model: string;
  status: 'online' | 'offline' | 'updating' | 'unknown';
  lastChecked: string;
  currentVersions: Record<string, string>;
  availableUpdates: number;
  criticalUpdates: number;
  compliance: 'compliant' | 'outdated' | 'critical';
}

interface FleetOverviewProps {
  fleetStatus: ServerFirmwareStatus[];
  onRefresh: () => void;
}

export function FleetOverview({ fleetStatus, onRefresh }: FleetOverviewProps) {
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'updating': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getComplianceBadge = (compliance: string) => {
    switch (compliance) {
      case 'compliant': return <Badge variant="outline" className="text-green-600 border-green-600">Compliant</Badge>;
      case 'outdated': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Updates Available</Badge>;
      case 'critical': return <Badge variant="destructive">Critical Updates</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component.toLowerCase()) {
      case 'bios': return <Cpu className="w-4 h-4" />;
      case 'idrac': return <Network className="w-4 h-4" />;
      case 'storage': return <HardDrive className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const handleQuickUpdate = async (serverId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('server-firmware-check', {
        body: { serverId, downloadUpdates: true }
      });

      if (error) throw error;

      toast({
        title: "Firmware Check Complete",
        description: `Found ${data.availableFirmware?.length || 0} available updates`,
      });

      onRefresh();
    } catch (error) {
      toast({
        title: "Check Failed",
        description: "Failed to check server firmware",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Fleet Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Health</p>
                <p className="text-2xl font-bold">
                  {Math.round((fleetStatus.filter(s => s.compliance === 'compliant').length / fleetStatus.length) * 100) || 0}%
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
            <Progress 
              value={(fleetStatus.filter(s => s.compliance === 'compliant').length / fleetStatus.length) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Servers Online</p>
                <p className="text-2xl font-bold">
                  {fleetStatus.filter(s => s.status === 'online').length}/{fleetStatus.length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <Progress 
              value={(fleetStatus.filter(s => s.status === 'online').length / fleetStatus.length) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {fleetStatus.reduce((sum, s) => sum + s.criticalUpdates, 0)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Server Fleet Status</CardTitle>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fleetStatus.map((server) => (
              <div key={server.serverId} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedServers.includes(server.serverId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServers([...selectedServers, server.serverId]);
                        } else {
                          setSelectedServers(selectedServers.filter(id => id !== server.serverId));
                        }
                      }}
                      className="rounded"
                    />
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(server.status)}
                      <div>
                        <h4 className="font-semibold">{server.hostname}</h4>
                        <p className="text-sm text-muted-foreground">{server.model}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Current Firmware Versions */}
                    <div className="hidden md:flex items-center gap-2">
                      {Object.entries(server.currentVersions).map(([component, version]) => (
                        <div key={component} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                          {getComponentIcon(component)}
                          <span className="uppercase font-medium">{component}:</span>
                          <span>{version}</span>
                        </div>
                      ))}
                    </div>

                    {/* Updates Available */}
                    {server.availableUpdates > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        {server.availableUpdates} updates
                      </Badge>
                    )}

                    {/* Compliance Status */}
                    {getComplianceBadge(server.compliance)}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickUpdate(server.serverId)}
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Check
                      </Button>
                      
                      {server.availableUpdates > 0 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Update Planned",
                              description: "Use Command Control Center to schedule firmware updates",
                            });
                          }}
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Details */}
                <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Last checked: {new Date(server.lastChecked).toLocaleString()}</span>
                    {server.criticalUpdates > 0 && (
                      <span className="text-red-600 font-medium">
                        {server.criticalUpdates} critical security updates
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {fleetStatus.length === 0 && (
            <div className="text-center py-8">
              <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Servers Found</h3>
              <p className="text-muted-foreground mb-4">
                Add servers to your inventory to start firmware management
              </p>
              <Button>
                <Search className="w-4 h-4 mr-2" />
                Discover Servers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedServers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-800">
                {selectedServers.length} servers selected
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Search className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Check All</span>
                  <span className="sm:hidden">Check</span>
                </Button>
                <Button size="sm" className="w-full sm:w-auto">
                  <Zap className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Plan Updates</span>
                  <span className="sm:hidden">Plan</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}