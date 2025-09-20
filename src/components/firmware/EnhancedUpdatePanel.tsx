import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEnhancedFirmwareUpdate, UpdateProgress } from "@/hooks/useEnhancedFirmwareUpdate";
import { useProtocolDetection } from "@/hooks/useProtocolDetection";
import { ProtocolCapabilityPanel } from "@/components/protocols/ProtocolCapabilityPanel";
import {
  Zap,
  Shield,
  Wifi,
  Server,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  RefreshCw
} from "lucide-react";

interface EnhancedUpdatePanelProps {
  serverId: string;
  serverHost: string;
  onClose: () => void;
}

export function EnhancedUpdatePanel({ serverId, serverHost, onClose }: EnhancedUpdatePanelProps) {
  const [credentials, setCredentials] = useState({
    username: 'root',
    password: 'calvin'
  });

  const [updateConfig, setUpdateConfig] = useState({
    firmwarePackageId: '',
    imageUri: '',
    mode: 'SIMPLE_UPDATE' as const,
    applyTime: 'OnReset' as const,
    preferredProtocol: undefined as string | undefined,
    enableFallback: true,
    enableTelemetry: true
  });

  const [activeJobs, setActiveJobs] = useState<Map<string, UpdateProgress>>(new Map());

  const {
    detecting,
    results,
    detectProtocols,
    clearResults
  } = useProtocolDetection();

  const {
    updating,
    startUpdate,
    monitorUpdate,
    cancelUpdate
  } = useEnhancedFirmwareUpdate();

  // Detect protocols on mount
  useEffect(() => {
    if (serverHost && credentials.username && credentials.password) {
      detectProtocols(serverHost, credentials).catch(console.error);
    }
  }, [serverHost]);

  const handleStartUpdate = async () => {
    if (!updateConfig.firmwarePackageId && !updateConfig.imageUri) {
      return;
    }

    try {
      const result = await startUpdate({
        serverId,
        firmwarePackageId: updateConfig.firmwarePackageId,
        imageUri: updateConfig.imageUri,
        mode: updateConfig.mode,
        applyTime: updateConfig.applyTime,
        preferredProtocol: updateConfig.preferredProtocol as 'REDFISH' | 'WSMAN' | 'RACADM' | undefined,
        enableFallback: updateConfig.enableFallback,
        enableTelemetry: updateConfig.enableTelemetry
      });

      // Start monitoring the job
      monitorUpdate(result.jobId, (progress) => {
        setActiveJobs(prev => new Map(prev).set(result.jobId, progress));
      });

    } catch (error) {
      console.error('Update start failed:', error);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelUpdate(jobId);
      setActiveJobs(prev => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
      });
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'REDFISH': return <Zap className="w-4 h-4" />;
      case 'WSMAN': return <Wifi className="w-4 h-4" />;
      case 'RACADM': return <Server className="w-4 h-4" />;
      case 'IPMI': return <Shield className="w-4 h-4" />;
      case 'SSH': return <Activity className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const supportedProtocols = results?.capabilities?.filter(cap => cap.supported) || [];

  return (
    <div className="space-y-6">
      {/* Protocol Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Protocol Detection
          </CardTitle>
          <CardDescription>
            Detect available management protocols for {serverHost}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Username</Label>
              <Input
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                disabled={detecting}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                disabled={detecting}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => detectProtocols(serverHost, credentials)}
              disabled={detecting}
              size="sm"
            >
              {detecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Detect Protocols
                </>
              )}
            </Button>
            
            {results && (
              <Button
                variant="outline"
                onClick={clearResults}
                size="sm"
              >
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Protocol Capabilities */}
      {results && (
        <ProtocolCapabilityPanel 
          result={results}
          onRefresh={() => detectProtocols(serverHost, credentials)}
          refreshing={detecting}
        />
      )}

      {/* Update Configuration */}
      {supportedProtocols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Firmware Update Configuration
            </CardTitle>
            <CardDescription>
              Configure firmware update with protocol orchestration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Firmware Package ID</Label>
                <Input
                  value={updateConfig.firmwarePackageId}
                  onChange={(e) => setUpdateConfig(prev => ({ ...prev, firmwarePackageId: e.target.value }))}
                  placeholder="Package ID from repository"
                />
              </div>
              <div>
                <Label>Or Image URI</Label>
                <Input
                  value={updateConfig.imageUri}
                  onChange={(e) => setUpdateConfig(prev => ({ ...prev, imageUri: e.target.value }))}
                  placeholder="https://example.com/firmware.exe"
                />
              </div>
              <div>
                <Label>Update Mode</Label>
                <Select
                  value={updateConfig.mode}
                  onValueChange={(value: any) => setUpdateConfig(prev => ({ ...prev, mode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIMPLE_UPDATE">Simple Update</SelectItem>
                    <SelectItem value="INSTALL_FROM_REPOSITORY">Repository Install</SelectItem>
                    <SelectItem value="MULTIPART_UPDATE">Multipart Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Apply Time</Label>
                <Select
                  value={updateConfig.applyTime}
                  onValueChange={(value: any) => setUpdateConfig(prev => ({ ...prev, applyTime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OnReset">On Reset</SelectItem>
                    <SelectItem value="Immediate">Immediate</SelectItem>
                    <SelectItem value="AtMaintenanceWindowStart">Maintenance Window</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Preferred Protocol (Optional)</Label>
              <Select
                value={updateConfig.preferredProtocol || 'auto'}
                onValueChange={(value) => setUpdateConfig(prev => ({ ...prev, preferredProtocol: value === 'auto' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect best protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                  {supportedProtocols.map((protocol) => (
                    <SelectItem key={protocol.protocol} value={protocol.protocol}>
                      <div className="flex items-center gap-2">
                        {getProtocolIcon(protocol.protocol)}
                        {protocol.protocol}
                        <Badge variant="outline" className="ml-2">
                          Priority {protocol.priority}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="fallback"
                  checked={updateConfig.enableFallback}
                  onCheckedChange={(checked) => setUpdateConfig(prev => ({ ...prev, enableFallback: checked }))}
                />
                <Label htmlFor="fallback">Enable Protocol Fallback</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="telemetry"
                  checked={updateConfig.enableTelemetry}
                  onCheckedChange={(checked) => setUpdateConfig(prev => ({ ...prev, enableTelemetry: checked }))}
                />
                <Label htmlFor="telemetry">Enable Telemetry</Label>
              </div>
            </div>

            <Button
              onClick={handleStartUpdate}
              disabled={updating || (!updateConfig.firmwarePackageId && !updateConfig.imageUri)}
              className="w-full"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Starting Update...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Firmware Update
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Jobs */}
      {activeJobs.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Active Update Jobs ({activeJobs.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(activeJobs.entries()).map(([jobId, progress]) => (
                <div key={jobId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {progress.currentProtocol && getProtocolIcon(progress.currentProtocol)}
                      <span className="font-medium">Job {jobId.slice(0, 8)}</span>
                      <Badge variant={
                        progress.status === 'completed' ? 'default' :
                        progress.status === 'failed' ? 'destructive' :
                        'secondary'
                      }>
                        {progress.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelJob(jobId)}
                      disabled={['completed', 'failed', 'cancelled'].includes(progress.status)}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  </div>

                  <Progress value={progress.progress} className="mb-3" />

                  {progress.currentProtocol && (
                    <div className="text-sm text-muted-foreground">
                      Using {progress.currentProtocol} protocol
                    </div>
                  )}

                  {progress.fallbackHistory && progress.fallbackHistory.length > 0 && (
                    <Alert className="mt-3">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Protocol fallbacks occurred: {progress.fallbackHistory.length} attempts
                      </AlertDescription>
                    </Alert>
                  )}

                  {progress.telemetry && (
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Latency:</span> {progress.telemetry.protocolLatency}ms
                      </div>
                      {progress.telemetry.estimatedCompletion && (
                        <div>
                          <span className="font-medium">ETA:</span> {progress.telemetry.estimatedCompletion}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}