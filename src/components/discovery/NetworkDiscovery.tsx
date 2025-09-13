import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCredentialProfiles } from "@/hooks/useCredentialProfiles";
import { 
  Search, 
  Server, 
  Network, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  HardDrive,
  Plus,
  Eye,
  EyeOff,
  Info,
  Shield,
  Wifi
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

interface DatacenterInfo {
  id: string;
  name: string;
  ip_scopes: Array<{ subnet: string; vlan?: number; description?: string }>;
}

export function NetworkDiscovery() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveryResult[]>([]);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Scan configuration
  const [scanConfig, setScanConfig] = useState({
    ipRange: '192.168.1.1-50',
    datacenterId: null as string | null,
    useCredentialProfiles: true
  });

  // Fallback credentials (only used if no profiles match)
  const [fallbackCredentials, setFallbackCredentials] = useState({
    username: 'root',
    password: 'calvin'
  });

  // Credential profile form
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    username: 'root',
    password: 'calvin',
    ipRange: ''
  });

  const [datacenters, setDatacenters] = useState<DatacenterInfo[]>([]);
  const { profiles, createProfile, refreshData } = useCredentialProfiles();
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
      setDatacenters((data || []).map(dc => ({
        ...dc,
        ip_scopes: (dc.ip_scopes as any) || []
      })));
    } catch (error) {
      console.error('Error fetching datacenters:', error);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfile.name.trim() || !newProfile.username.trim() || !newProfile.password.trim()) {
      toast({
        title: "Validation Error",
        description: "Name, username, and password are required",
        variant: "destructive"
      });
      return;
    }

    try {
      await createProfile({
        name: newProfile.name,
        description: newProfile.description,
        username: newProfile.username,
        password_encrypted: newProfile.password, // Note: In real app, this should be encrypted
        port: 443,
        protocol: 'https' as const,
        is_default: false,
        priority_order: 100
      });

      // Create assignment if IP range specified
      if (newProfile.ipRange.trim()) {
        // This would need the assignment creation logic
        // For now, just show success message
      }

      setNewProfile({ name: '', description: '', username: 'root', password: 'calvin', ipRange: '' });
      setShowCredentialForm(false);
      
      toast({
        title: "Success",
        description: "Credential profile created successfully"
      });
      
      refreshData();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: "Failed to create credential profile",
        variant: "destructive"
      });
    }
  };

  const startNetworkScan = async () => {
    if (!scanConfig.ipRange.trim() && !scanConfig.datacenterId) {
      toast({
        title: "Invalid Configuration",
        description: "Please specify an IP range or select a datacenter to scan",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setDiscoveredServers([]);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 10, 95));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('discover-servers', {
        body: {
          ipRange: scanConfig.ipRange || undefined,
          datacenterId: scanConfig.datacenterId,
          credentials: scanConfig.useCredentialProfiles ? null : fallbackCredentials,
          useCredentialProfiles: scanConfig.useCredentialProfiles
        }
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (error) throw error;

      setDiscoveredServers(data.servers || []);
      
      toast({
        title: "Network Scan Complete",
        description: `Discovered ${data.discovered || 0} Dell servers with iDRAC access`
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

  const selectedDatacenter = datacenters.find(dc => dc.id === scanConfig.datacenterId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
          <Wifi className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient">Network Discovery</h1>
          <p className="text-muted-foreground text-lg">
            Discover Dell servers with iDRAC access across your network infrastructure
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Scan Configuration */}
        <div className="xl:col-span-2 space-y-6">
          {/* Network Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Network Configuration
              </CardTitle>
              <CardDescription>
                Configure the network range and scanning parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Datacenter Selection */}
              <div className="space-y-2">
                <Label>Datacenter (Optional)</Label>
                <select
                  value={scanConfig.datacenterId || ''}
                  onChange={(e) => setScanConfig(prev => ({ 
                    ...prev, 
                    datacenterId: e.target.value || null,
                    ipRange: e.target.value ? '' : prev.ipRange
                  }))}
                  className="w-full p-3 border rounded-lg bg-background"
                  disabled={isScanning}
                >
                  <option value="">Select datacenter or use custom range</option>
                  {datacenters.map(dc => (
                    <option key={dc.id} value={dc.id}>
                      {dc.name} ({dc.ip_scopes.length} IP scopes)
                    </option>
                  ))}
                </select>
                {selectedDatacenter && (
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <div className="font-medium mb-1">IP Scopes:</div>
                    {selectedDatacenter.ip_scopes.map((scope, i) => (
                      <div key={i} className="text-muted-foreground">
                        • {scope.subnet} {scope.description && `(${scope.description})`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual IP Range */}
              {!scanConfig.datacenterId && (
                <div className="space-y-2">
                  <Label>IP Range</Label>
                  <Input
                    value={scanConfig.ipRange}
                    onChange={(e) => setScanConfig(prev => ({ ...prev, ipRange: e.target.value }))}
                    placeholder="192.168.1.1-50 or 192.168.1.100"
                    disabled={isScanning}
                  />
                  <p className="text-sm text-muted-foreground">
                    Formats: 192.168.1.1-50 (range) or 192.168.1.100 (single IP)
                  </p>
                </div>
              )}

              {/* Authentication Method */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Authentication Method</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={`cursor-pointer border-2 transition-colors ${
                    scanConfig.useCredentialProfiles ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}>
                    <CardContent 
                      className="p-4" 
                      onClick={() => setScanConfig(prev => ({ ...prev, useCredentialProfiles: true }))}
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">Credential Profiles</div>
                          <div className="text-sm text-muted-foreground">
                            Use managed profiles with IP assignments
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer border-2 transition-colors ${
                    !scanConfig.useCredentialProfiles ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}>
                    <CardContent 
                      className="p-4"
                      onClick={() => setScanConfig(prev => ({ ...prev, useCredentialProfiles: false }))}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-amber-600" />
                        <div>
                          <div className="font-medium">Manual Credentials</div>
                          <div className="text-sm text-muted-foreground">
                            Use single username/password
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Manual Credentials Section */}
              {!scanConfig.useCredentialProfiles && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">Fallback Credentials</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={fallbackCredentials.username}
                        onChange={(e) => setFallbackCredentials(prev => ({ ...prev, username: e.target.value }))}
                        disabled={isScanning}
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={fallbackCredentials.password}
                          onChange={(e) => setFallbackCredentials(prev => ({ ...prev, password: e.target.value }))}
                          disabled={isScanning}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Progress */}
              {isScanning && (
                <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-primary" />
                    <span className="font-medium">Scanning Network...</span>
                  </div>
                  <Progress value={scanProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {scanProgress < 100 ? `Progress: ${Math.round(scanProgress)}%` : 'Processing results...'}
                  </p>
                </div>
              )}

              {/* Start Scan Button */}
              <Button 
                onClick={startNetworkScan} 
                disabled={isScanning}
                size="lg"
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Scanning Network...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Start Network Discovery
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Discovery Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Discovery Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {discoveredServers.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Servers Discovered</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure your network settings and start a discovery scan
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Found {discoveredServers.length} servers</span>
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready for inventory
                    </Badge>
                  </div>
                  
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {discoveredServers.map((server, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{server.hostname}</h4>
                            <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                              {server.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>IP: {server.ip_address}</div>
                            <div>Model: {server.model}</div>
                            {server.service_tag && <div>Service Tag: {server.service_tag}</div>}
                            {server.idrac_version && <div>iDRAC: {server.idrac_version}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Credential Management & Info */}
        <div className="space-y-6">
          {/* Credential Profiles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Credential Profiles
              </CardTitle>
              <CardDescription>
                Manage authentication profiles for different network segments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profiles.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-3">No credential profiles configured</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCredentialForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Profile
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {profiles.map((profile) => (
                      <div key={profile.id} className="p-3 border rounded-lg bg-muted/20">
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-muted-foreground">
                          User: {profile.username}
                        </div>
                        {profile.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {profile.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowCredentialForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Profile
                  </Button>
                </>
              )}

              {/* Quick Create Form */}
              {showCredentialForm && (
                <div className="space-y-3 p-4 border rounded-lg bg-background">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">New Profile</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowCredentialForm(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="Profile name"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={newProfile.description}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Username"
                        value={newProfile.username}
                        onChange={(e) => setNewProfile(prev => ({ ...prev, username: e.target.value }))}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={newProfile.password}
                        onChange={(e) => setNewProfile(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <Input
                      placeholder="IP Range (optional)"
                      value={newProfile.ipRange}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, ipRange: e.target.value }))}
                    />
                  </div>
                  
                  <Button size="sm" className="w-full" onClick={handleCreateProfile}>
                    Create Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discovery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Discovery Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Redfish API</div>
                  <div className="text-xs text-muted-foreground">
                    Modern Dell PowerEdge servers
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <HardDrive className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">IPMI Protocol</div>
                  <div className="text-xs text-muted-foreground">
                    Legacy BMC access
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Service Tags</div>
                  <div className="text-xs text-muted-foreground">
                    Dell warranty integration
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}