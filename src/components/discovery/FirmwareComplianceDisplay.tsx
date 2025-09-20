import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Download, Shield } from 'lucide-react';

interface FirmwareCompliance {
  biosOutdated: boolean;
  idracOutdated: boolean;
  availableUpdates: number;
  updateReadiness: 'ready' | 'maintenance_required' | 'not_supported';
}

interface FirmwareComplianceDisplayProps {
  compliance?: FirmwareCompliance;
  biosVersion?: string;
  idracVersion?: string;
  compact?: boolean;
}

const readinessConfig = {
  ready: {
    icon: CheckCircle,
    color: 'text-green-500',
    badge: 'default',
    label: 'Ready'
  },
  maintenance_required: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    badge: 'secondary',
    label: 'Maintenance Required'
  },
  not_supported: {
    icon: XCircle,
    color: 'text-red-500',
    badge: 'destructive',
    label: 'Not Supported'
  }
};

export function FirmwareComplianceDisplay({ 
  compliance, 
  biosVersion, 
  idracVersion, 
  compact = false 
}: FirmwareComplianceDisplayProps) {
  if (!compliance) {
    return compact ? (
      <Badge variant="outline">No Data</Badge>
    ) : (
      <div className="text-sm text-muted-foreground">
        Firmware compliance data not available
      </div>
    );
  }

  const config = readinessConfig[compliance.updateReadiness];
  const Icon = config.icon;
  const outdatedCount = (compliance.biosOutdated ? 1 : 0) + (compliance.idracOutdated ? 1 : 0);
  const complianceScore = Math.max(0, 100 - (outdatedCount * 30) - (compliance.availableUpdates * 10));

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <div className="text-sm">
          <div className="font-medium">{compliance.availableUpdates} updates</div>
          <div className="text-xs text-muted-foreground">
            Score: {complianceScore}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Firmware Compliance</h4>
        <Badge variant={config.badge as any}>
          <Icon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {/* Compliance Score */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Compliance Score</span>
          <span className="font-medium">{complianceScore}%</span>
        </div>
        <Progress value={complianceScore} className="h-2" />
      </div>

      {/* Current Versions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-sm font-medium">BIOS Version</div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {biosVersion || 'Unknown'}
            </code>
            {compliance.biosOutdated && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-sm font-medium">iDRAC Version</div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {idracVersion || 'Unknown'}
            </code>
            {compliance.idracOutdated && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </div>
      </div>

      {/* Available Updates */}
      <Alert>
        <Download className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              {compliance.availableUpdates > 0 
                ? `${compliance.availableUpdates} firmware updates available`
                : 'All firmware up to date'
              }
            </span>
            {compliance.availableUpdates > 0 && (
              <Badge variant="outline" className="ml-2">
                <Shield className="w-3 h-3 mr-1" />
                Security Updates
              </Badge>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Readiness Status Details */}
      {compliance.updateReadiness === 'maintenance_required' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Server requires maintenance mode for updates. Some updates may require reboot.
          </AlertDescription>
        </Alert>
      )}

      {compliance.updateReadiness === 'not_supported' && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            This server model or firmware version does not support remote updates.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}