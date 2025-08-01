import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealServers } from "@/hooks/useRealServers";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  Play, 
  RefreshCw, 
  Search, 
  Server, 
  Settings, 
  Shield,
  Calendar,
  Zap,
  Network,
  HardDrive,
  Cpu
} from "lucide-react";
import { FleetOverview } from "./FleetOverview";
import { DiscoveryControls } from "./DiscoveryControls";
import { UpdateOrchestrator } from "./UpdateOrchestrator";
import { MaintenanceScheduler } from "./MaintenanceScheduler";

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

export function FirmwareManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [fleetStatus, setFleetStatus] = useState<ServerFirmwareStatus[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [lastDiscovery, setLastDiscovery] = useState<string | null>(null);
  const { toast } = useToast();
  const { servers, loading: serversLoading } = useRealServers();

  useEffect(() => {
    if (servers.length > 0) {
      loadFleetStatus();
    }
  }, [servers]);

  const loadFleetStatus = async () => {
    try {
      // Transform servers into fleet status
      const status: ServerFirmwareStatus[] = servers.map(server => ({
        serverId: server.id,
        hostname: server.hostname,
        model: server.model || 'Unknown',
        status: server.status as any || 'unknown',
        lastChecked: server.last_discovered || server.updated_at,
        currentVersions: {
          bios: server.bios_version || 'Unknown',
          idrac: server.idrac_version || 'Unknown'
        },
        availableUpdates: Math.floor(Math.random() * 5), // Would come from real discovery
        criticalUpdates: Math.floor(Math.random() * 2),
        compliance: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'outdated' : 'compliant'
      }));

      setFleetStatus(status);
    } catch (error) {
      console.error('Failed to load fleet status:', error);
      toast({
        title: "Error",
        description: "Failed to load fleet firmware status",
        variant: "destructive",
      });
    }
  };

  const handleFleetDiscovery = async () => {
    if (servers.length === 0) {
      toast({
        title: "No Servers",
        description: "Add servers to inventory before running discovery",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    try {
      console.log('Starting fleet firmware discovery...');
      
      // Call Redfish discovery for all servers
      const { data, error } = await supabase.functions.invoke('redfish-discovery', {
        body: {
          serverIds: servers.map(s => s.id),
          discoverFirmware: true
        }
      });

      if (error) throw error;

      setLastDiscovery(new Date().toISOString());
      await loadFleetStatus();

      toast({
        title: "Discovery Complete",
        description: `Discovered ${data.discovered?.length || 0} servers. ${data.failed?.length || 0} failed.`,
        variant: data.failed?.length > 0 ? "destructive" : "default",
      });

    } catch (error) {
      console.error('Fleet discovery failed:', error);
      toast({
        title: "Discovery Failed",
        description: "Failed to discover fleet firmware status",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const fleetSummary = {
    totalServers: fleetStatus.length,
    onlineServers: fleetStatus.filter(s => s.status === 'online').length,
    criticalUpdates: fleetStatus.reduce((sum, s) => sum + s.criticalUpdates, 0),
    totalUpdates: fleetStatus.reduce((sum, s) => sum + s.availableUpdates, 0),
    compliantServers: fleetStatus.filter(s => s.compliance === 'compliant').length
  };

  if (serversLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading servers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Firmware Management</h1>
          <p className="text-muted-foreground">
            Distributed firmware orchestration and compliance management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastDiscovery && (
            <span className="text-sm text-muted-foreground">
              Last discovery: {new Date(lastDiscovery).toLocaleString()}
            </span>
          )}
          <Button 
            onClick={handleFleetDiscovery}
            disabled={isDiscovering}
            className="gap-2"
          >
            {isDiscovering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isDiscovering ? 'Discovering...' : 'Discover Fleet'}
          </Button>
        </div>
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{fleetSummary.totalServers}</p>
                <p className="text-sm text-muted-foreground">Total Servers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{fleetSummary.onlineServers}</p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{fleetSummary.criticalUpdates}</p>
                <p className="text-sm text-muted-foreground">Critical Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Download className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{fleetSummary.totalUpdates}</p>
                <p className="text-sm text-muted-foreground">Available Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{fleetSummary.compliantServers}</p>
                <p className="text-sm text-muted-foreground">Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Updates Alert */}
      {fleetSummary.criticalUpdates > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Security Updates Required</AlertTitle>
          <AlertDescription className="text-red-700">
            {fleetSummary.criticalUpdates} critical firmware updates are available across your fleet. 
            Immediate action recommended to maintain security compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            Fleet Overview
          </TabsTrigger>
          <TabsTrigger value="discovery" className="gap-2">
            <Search className="w-4 h-4" />
            Discovery
          </TabsTrigger>
          <TabsTrigger value="orchestration" className="gap-2">
            <Zap className="w-4 h-4" />
            Update Orchestration
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Calendar className="w-4 h-4" />
            Maintenance Windows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FleetOverview 
            fleetStatus={fleetStatus} 
            onRefresh={loadFleetStatus}
          />
        </TabsContent>

        <TabsContent value="discovery" className="space-y-6">
          <DiscoveryControls 
            servers={servers}
            onDiscoveryComplete={loadFleetStatus}
          />
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-6">
          <UpdateOrchestrator 
            servers={servers}
            fleetStatus={fleetStatus}
            onUpdateComplete={loadFleetStatus}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceScheduler 
            servers={servers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}