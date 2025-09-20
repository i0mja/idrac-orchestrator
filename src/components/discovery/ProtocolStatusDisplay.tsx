import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface ProtocolCapability {
  protocol: 'REDFISH' | 'WSMAN' | 'RACADM' | 'IPMI' | 'SSH';
  supported: boolean;
  firmwareVersion?: string;
  managerType?: string;
  generation?: string;
  updateModes: string[];
  priority: number;
  latencyMs?: number;
  status: 'healthy' | 'degraded' | 'unreachable';
}

interface ProtocolStatusDisplayProps {
  protocols: ProtocolCapability[];
  healthiestProtocol?: ProtocolCapability;
  showDetails?: boolean;
}

const protocolColors = {
  REDFISH: 'bg-blue-500',
  WSMAN: 'bg-green-500', 
  RACADM: 'bg-orange-500',
  IPMI: 'bg-purple-500',
  SSH: 'bg-gray-500'
};

const statusIcons = {
  healthy: CheckCircle,
  degraded: AlertCircle,
  unreachable: XCircle
};

const statusColors = {
  healthy: 'text-green-500',
  degraded: 'text-yellow-500', 
  unreachable: 'text-red-500'
};

export function ProtocolStatusDisplay({ 
  protocols, 
  healthiestProtocol, 
  showDetails = false 
}: ProtocolStatusDisplayProps) {
  const supportedProtocols = protocols.filter(p => p.supported);
  const supportedCount = supportedProtocols.length;

  if (!showDetails) {
    // Compact view for table cells
    return (
      <div className="flex items-center gap-1">
        {protocols.map((protocol) => {
          const StatusIcon = statusIcons[protocol.status];
          return (
            <TooltipProvider key={protocol.protocol}>
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      protocol.supported ? protocolColors[protocol.protocol] : 'bg-muted'
                    }`}
                  >
                    <StatusIcon className={`w-3 h-3 ${
                      protocol.supported ? 'text-white' : statusColors[protocol.status]
                    }`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">{protocol.protocol}</div>
                    <div className="text-muted-foreground">
                      {protocol.supported ? 
                        `Supported • ${protocol.latencyMs}ms` : 
                        'Not available'
                      }
                    </div>
                    {protocol.updateModes.length > 0 && (
                      <div className="text-xs">
                        Updates: {protocol.updateModes.join(', ')}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {healthiestProtocol && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Best: {healthiestProtocol.protocol}
          </Badge>
        )}
      </div>
    );
  }

  // Detailed view for expanded cards/modals
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Protocol Capabilities</h4>
        <Badge variant={supportedCount > 0 ? "default" : "secondary"}>
          {supportedCount}/{protocols.length} Supported
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {protocols.map((protocol) => {
          const StatusIcon = statusIcons[protocol.status];
          
          return (
            <div
              key={protocol.protocol}
              className={`p-3 rounded-lg border-2 ${
                protocol.supported 
                  ? 'border-primary/20 bg-primary/5' 
                  : 'border-muted bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      protocol.supported ? protocolColors[protocol.protocol] : 'bg-muted'
                    }`}
                  >
                    <StatusIcon className={`w-4 h-4 ${
                      protocol.supported ? 'text-white' : statusColors[protocol.status]
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{protocol.protocol}</div>
                    <div className="text-sm text-muted-foreground">
                      Priority: {protocol.priority}
                      {protocol.latencyMs && ` • ${protocol.latencyMs}ms`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant={protocol.supported ? "default" : "secondary"}>
                    {protocol.status}
                  </Badge>
                  {protocol.supported && healthiestProtocol?.protocol === protocol.protocol && (
                    <Badge variant="outline" className="ml-2">
                      Recommended
                    </Badge>
                  )}
                </div>
              </div>
              
              {protocol.supported && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="text-sm space-y-1">
                    {protocol.managerType && (
                      <div>Manager: {protocol.managerType}</div>
                    )}
                    {protocol.updateModes.length > 0 && (
                      <div>Update modes: {protocol.updateModes.join(', ')}</div>
                    )}
                    {protocol.firmwareVersion && (
                      <div>Firmware: {protocol.firmwareVersion}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}