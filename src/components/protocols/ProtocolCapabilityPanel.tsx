import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Shield, 
  Wifi,
  Server,
  AlertTriangle,
  RefreshCw,
  Activity
} from "lucide-react";
import { ProtocolCapability, ProtocolHealth, DetectionResult } from "@/hooks/useProtocolDetection";

interface ProtocolCapabilityPanelProps {
  result: DetectionResult;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ProtocolCapabilityPanel({ result, onRefresh, refreshing }: ProtocolCapabilityPanelProps) {
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

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unreachable': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'unreachable': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const supportedProtocols = result.capabilities.filter(cap => cap.supported);
  const unsupportedProtocols = result.capabilities.filter(cap => !cap.supported);

  return (
    <div className="space-y-6">
      {/* Server Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Server Identity
            </div>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Host:</span> {result.identity.host}
            </div>
            {result.identity.model && (
              <div>
                <span className="font-medium">Model:</span> {result.identity.model}
              </div>
            )}
            {result.identity.serviceTag && (
              <div>
                <span className="font-medium">Service Tag:</span> {result.identity.serviceTag}
              </div>
            )}
            {result.identity.generation && (
              <div>
                <span className="font-medium">Generation:</span> {result.identity.generation}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supported Protocols */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Supported Protocols ({supportedProtocols.length})
          </CardTitle>
          <CardDescription>
            Available management interfaces for firmware updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supportedProtocols.length === 0 ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                No supported protocols detected. Check server accessibility and credentials.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {supportedProtocols
                .sort((a, b) => a.priority - b.priority)
                .map((capability, index) => (
                <div key={capability.protocol} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getProtocolIcon(capability.protocol)}
                      <span className="font-semibold">{capability.protocol}</span>
                      {index === 0 && result.healthiestProtocol?.protocol === capability.protocol && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Priority {capability.priority}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {capability.firmwareVersion && (
                      <div>
                        <span className="font-medium">Version:</span> {capability.firmwareVersion}
                      </div>
                    )}
                    {capability.managerType && (
                      <div>
                        <span className="font-medium">Manager:</span> {capability.managerType}
                      </div>
                    )}
                    {capability.generation && (
                      <div>
                        <span className="font-medium">Generation:</span> {capability.generation}
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <span className="font-medium">Update Modes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {capability.updateModes.map(mode => (
                          <Badge key={mode} variant="secondary" className="text-xs">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Protocol Health Status
          </CardTitle>
          <CardDescription>
            Real-time connectivity and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.healthChecks.map((health) => (
              <div key={health.protocol} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getProtocolIcon(health.protocol)}
                  <div>
                    <div className="font-medium">{health.protocol}</div>
                    {health.details && (
                      <div className="text-sm text-muted-foreground">{health.details}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {health.latencyMs && (
                    <div className="text-sm text-muted-foreground">
                      {health.latencyMs}ms
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {getHealthIcon(health.status)}
                    <span className={`text-sm font-medium ${getHealthColor(health.status)}`}>
                      {health.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unsupported Protocols (if any) */}
      {unsupportedProtocols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Unsupported Protocols ({unsupportedProtocols.length})
            </CardTitle>
            <CardDescription>
              Protocols that were tested but are not available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unsupportedProtocols.map((capability) => (
                <div key={capability.protocol} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getProtocolIcon(capability.protocol)}
                    <span className="text-sm">{capability.protocol}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Unavailable
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}