import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedDiscovery } from '@/hooks/useUnifiedDiscovery';
import { useCredentialProfiles } from '@/hooks/useCredentialProfiles';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play,
  Pause,
  Settings,
  Network,
  Server,
  Shield,
  Zap,
  Clock,
  RefreshCw,
  Target
} from 'lucide-react';

interface DatacenterInfo {
  id: string;
  name: string;
  ip_scopes: Array<{ subnet: string; vlan?: number; description?: string }>;
}

export function DiscoveryControl() {
  const [discoveryConfig, setDiscoveryConfig] = useState({
    scope: 'targeted' as 'full' | 'incremental' | 'targeted',
    includeNetwork: true,
    includeOme: false,
    includeVCenter: false,
    networkConfig: {
      ipRange: '192.168.1.1-50',
      datacenterId: null as string | null,
      useCredentialProfiles: true,
      detectProtocols: true,
      checkFirmware: true,
      parallelScan: true,
      timeout: 30,
    },
    scheduling: {
      enabled: false,
      interval: 'daily',
      time: '02:00',
    }
  });

  const [datacenters, setDatacenters] = useState<DatacenterInfo[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const { 
    startUnifiedDiscovery, 
    isDiscovering, 
    progress, 
    phase,
    canDiscoverNetwork,
    canDiscoverOme,
    canDiscoverVCenter 
  } = useUnifiedDiscovery();
  
  const { profiles } = useCredentialProfiles();
  const { toast } = useToast();

  useEffect(() => {
    fetchDatacenters();
  }, []);

  const fetchDatacenters = async () => {
    try {
      const { data, error } = await supabase
        .from('datacenters')
        .select('id, name, ip_scopes')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDatacenters(
        (data || []).map((dc) => ({
          ...dc,
          ip_scopes: (dc.ip_scopes as any) || [],
        })),
      );
    } catch (error) {
      console.error('Error fetching datacenters:', error);
    }
  };

  const handleStartDiscovery = async () => {
    if (!discoveryConfig.includeNetwork && !discoveryConfig.includeOme && !discoveryConfig.includeVCenter) {
      toast({
        title: 'Invalid Configuration',
        description: 'Please select at least one discovery method',
        variant: 'destructive',
      });
      return;
    }

    try {
      await startUnifiedDiscovery({
        includeNetwork: discoveryConfig.includeNetwork,
        includeOme: discoveryConfig.includeOme,
        includeVCenter: discoveryConfig.includeVCenter,
        networkConfig: discoveryConfig.includeNetwork ? discoveryConfig.networkConfig : undefined,
        scope: discoveryConfig.scope,
      });
    } catch (error) {
      console.error('Discovery failed:', error);
    }
  };

  const selectedDatacenter = datacenters.find(dc => dc.id === discoveryConfig.networkConfig.datacenterId);

  const getScopeDescription = (scope: string) => {
    switch (scope) {
      case 'full':
        return 'Complete infrastructure scan with deep analysis';
      case 'incremental':
        return 'Scan only new or changed devices since last discovery';
      case 'targeted':
        return 'Focus on specific IP ranges or device types';
      default:
        return '';
    }
  };

  const getCapabilityStatus = (capability: boolean) => {
    return capability ? (
      <Badge className="bg-success/10 text-success border-success/20">
        Available
      </Badge>
    ) : (
      <Badge variant="outline">
        Unavailable
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Discovery Control Center
            </CardTitle>
            <CardDescription>
              Configure and execute unified infrastructure discovery
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfiguring(!isConfiguring)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {isConfiguring ? 'Hide Config' : 'Configure'}
            </Button>
            {!isDiscovering ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Discovery
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start Unified Discovery</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will scan your infrastructure using the configured methods.
                      The process may take several minutes to complete.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartDiscovery}>
                      Start Discovery
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button size="lg" disabled>
                <Pause className="w-4 h-4 mr-2" />
                Discovering... {Math.round(progress)}%
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isDiscovering && (
        <CardContent className="pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span className="font-medium">{phase || 'Scanning infrastructure...'}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      )}

      {isConfiguring && (
        <CardContent>
          <div className="space-y-6">
            {/* Discovery Scope */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Discovery Scope
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {['full', 'incremental', 'targeted'].map((scope) => (
                  <Card
                    key={scope}
                    className={`cursor-pointer border-2 transition-colors ${
                      discoveryConfig.scope === scope
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setDiscoveryConfig(prev => ({ ...prev, scope: scope as any }))}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="font-medium capitalize mb-1">{scope}</div>
                      <div className="text-xs text-muted-foreground">
                        {getScopeDescription(scope)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Discovery Methods */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Discovery Methods</Label>
              
              <div className="grid gap-4">
                {/* Network Discovery */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">Network Discovery</div>
                      <div className="text-sm text-muted-foreground">
                        Scan IP ranges for Dell servers with protocol detection
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCapabilityStatus(canDiscoverNetwork)}
                    <Switch
                      checked={discoveryConfig.includeNetwork}
                      onCheckedChange={(checked) =>
                        setDiscoveryConfig(prev => ({ ...prev, includeNetwork: checked }))
                      }
                      disabled={!canDiscoverNetwork}
                    />
                  </div>
                </div>

                {/* OME Discovery */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">OpenManage Enterprise</div>
                      <div className="text-sm text-muted-foreground">
                        Sync devices from configured OME instances
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCapabilityStatus(canDiscoverOme)}
                    <Switch
                      checked={discoveryConfig.includeOme}
                      onCheckedChange={(checked) =>
                        setDiscoveryConfig(prev => ({ ...prev, includeOme: checked }))
                      }
                      disabled={!canDiscoverOme}
                    />
                  </div>
                </div>

                {/* vCenter Discovery */}
                <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">vCenter Integration</div>
                      <div className="text-sm text-muted-foreground">
                        Discover ESXi hosts from vCenter instances
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCapabilityStatus(canDiscoverVCenter)}
                    <Switch
                      checked={discoveryConfig.includeVCenter}
                      onCheckedChange={(checked) =>
                        setDiscoveryConfig(prev => ({ ...prev, includeVCenter: checked }))
                      }
                      disabled={!canDiscoverVCenter}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Network Configuration */}
            {discoveryConfig.includeNetwork && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Network Configuration</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Datacenter (Optional)</Label>
                      <Select
                        value={discoveryConfig.networkConfig.datacenterId || ''}
                        onValueChange={(value) =>
                          setDiscoveryConfig(prev => ({
                            ...prev,
                            networkConfig: {
                              ...prev.networkConfig,
                              datacenterId: value || null,
                              ipRange: value ? '' : prev.networkConfig.ipRange,
                            }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select datacenter or use IP range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Custom IP Range</SelectItem>
                          {datacenters.map((dc) => (
                            <SelectItem key={dc.id} value={dc.id}>
                              {dc.name} ({dc.ip_scopes.length} scopes)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!discoveryConfig.networkConfig.datacenterId && (
                      <div className="space-y-2">
                        <Label>IP Range</Label>
                        <Input
                          placeholder="192.168.1.1-50"
                          value={discoveryConfig.networkConfig.ipRange}
                          onChange={(e) =>
                            setDiscoveryConfig(prev => ({
                              ...prev,
                              networkConfig: {
                                ...prev.networkConfig,
                                ipRange: e.target.value
                              }
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  {selectedDatacenter && (
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="font-medium mb-2">Selected Datacenter Scopes:</div>
                      <div className="space-y-1">
                        {selectedDatacenter.ip_scopes.map((scope, i) => (
                          <div key={i} className="text-sm flex items-center gap-2">
                            <Badge variant="outline">{scope.subnet}</Badge>
                            {scope.description && (
                              <span className="text-muted-foreground">({scope.description})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label>Protocol Detection</Label>
                      <Switch
                        checked={discoveryConfig.networkConfig.detectProtocols}
                        onCheckedChange={(checked) =>
                          setDiscoveryConfig(prev => ({
                            ...prev,
                            networkConfig: { ...prev.networkConfig, detectProtocols: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Firmware Analysis</Label>
                      <Switch
                        checked={discoveryConfig.networkConfig.checkFirmware}
                        onCheckedChange={(checked) =>
                          setDiscoveryConfig(prev => ({
                            ...prev,
                            networkConfig: { ...prev.networkConfig, checkFirmware: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}