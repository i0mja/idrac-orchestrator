import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  Server,
  Zap,
  Shield,
  Database,
  Network
} from 'lucide-react';
import {
  useFirmwareGapAnalysis,
  type HostFirmwareGap,
  type ClusterCompatibilityAnalysis,
  type FirmwareComponent,
  type UpdateStep
} from '@/hooks/useFirmwareGapAnalysis';

interface FirmwareGapAnalyzerProps {
  serverIds: string[];
  onUpdateOrchestration?: (gaps: HostFirmwareGap[]) => void;
}

export function FirmwareGapAnalyzer({ serverIds, onUpdateOrchestration }: FirmwareGapAnalyzerProps) {
  const { gapAnalysis, clusterAnalysis, loading, analyzeServerFirmwareGaps } = useFirmwareGapAnalysis();

  React.useEffect(() => {
    if (serverIds.length > 0) {
      analyzeServerFirmwareGaps(serverIds);
    }
  }, [serverIds]);

  const getComponentIcon = (type: FirmwareComponent['type']) => {
    switch (type) {
      case 'bios': return <Zap className="h-4 w-4" />;
      case 'idrac': return <Shield className="h-4 w-4" />;
      case 'storage': return <Database className="h-4 w-4" />;
      case 'nic': return <Network className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  const getCriticalityColor = (criticality: FirmwareComponent['criticality']) => {
    switch (criticality) {
      case 'critical': return 'destructive';
      case 'important': return 'secondary';
      case 'recommended': return 'default';
      case 'optional': return 'outline';
    }
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
    }
  };

  const getRiskBadgeVariant = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing Firmware Gaps...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse bg-muted h-8 rounded"></div>
            <div className="animate-pulse bg-muted h-20 rounded"></div>
            <div className="animate-pulse bg-muted h-12 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cluster Analysis Summary */}
      {clusterAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cluster Compatibility Analysis</CardTitle>
            <CardDescription>
              Analysis of firmware variations and rolling update feasibility across clusters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clusterAnalysis.map((cluster) => (
                <div key={cluster.cluster_name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{cluster.cluster_name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={cluster.rolling_update_feasible ? 'default' : 'destructive'}>
                        {cluster.rolling_update_feasible ? 'Rolling Update OK' : 'Complex Update Required'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {cluster.total_hosts} hosts
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {cluster.max_simultaneous_updates}
                      </div>
                      <div className="text-sm text-muted-foreground">Max Parallel Updates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {cluster.estimated_cluster_update_duration_hours}h
                      </div>
                      <div className="text-sm text-muted-foreground">Estimated Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Object.keys(cluster.firmware_variations).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Components Analyzed</div>
                    </div>
                  </div>

                  {/* Firmware Variations */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between">
                        Firmware Variations Details
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 mt-3">
                      {Object.entries(cluster.firmware_variations).map(([component, data]) => (
                        <div key={component} className="bg-muted/50 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            {getComponentIcon(component as FirmwareComponent['type'])}
                            <span className="font-medium capitalize">{component}</span>
                          </div>
                          <div className="space-y-1">
                            {data.versions.map((version) => (
                              <div key={version} className="flex justify-between text-sm">
                                <span>{version}</span>
                                <span className="text-muted-foreground">
                                  {data.host_count_per_version[version]} hosts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Compatibility Warnings */}
                  {cluster.compatibility_windows.some(w => w.risky_combinations.length > 0) && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Some firmware combinations may cause compatibility issues during rolling updates.
                        Consider updating in smaller batches or during maintenance windows.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Host Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Host-by-Host Firmware Analysis</CardTitle>
          <CardDescription>
            Detailed firmware gap analysis and update sequences for each server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gapAnalysis.map((host) => (
              <div key={host.host_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{host.hostname}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{host.model}</span>
                      <span>•</span>
                      <span>{host.service_tag}</span>
                      {host.cluster_name && (
                        <>
                          <span>•</span>
                          <span>{host.cluster_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskBadgeVariant(host.compatibility_risk)}>
                      {host.compatibility_risk} risk
                    </Badge>
                    <div className="text-right">
                      <div className="font-semibold">{formatDuration(host.total_update_time_minutes)}</div>
                      <div className="text-sm text-muted-foreground">Est. Duration</div>
                    </div>
                  </div>
                </div>

                {host.components.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>All firmware components are up to date</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Components Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {host.components.map((component, index) => (
                        <div key={index} className="bg-muted/50 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            {getComponentIcon(component.type)}
                            <span className="font-medium capitalize">{component.type}</span>
                            <Badge variant={getCriticalityColor(component.criticality)} className="ml-auto">
                              {component.criticality}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Current:</span>
                              <span>{component.current_version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Target:</span>
                              <span>{component.target_version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span>{formatDuration(component.estimated_duration_minutes)}</span>
                            </div>
                            {component.requires_reboot && (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs">Requires reboot</span>
                              </div>
                            )}
                            {component.intermediate_versions && component.intermediate_versions.length > 0 && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">Multi-step update</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Update Sequence */}
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between">
                          Update Sequence ({host.update_sequence.length} steps)
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-3">
                        {host.update_sequence.map((step, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                              {step.step_number}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{step.component_type} Update</div>
                              <div className="text-sm text-muted-foreground">
                                {step.from_version} → {step.to_version}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDuration(step.duration_minutes)}
                            </div>
                            <div className="flex items-center gap-1">
                              {step.requires_reboot && (
                                <Badge variant="secondary" className="text-xs">Reboot</Badge>
                              )}
                              {step.validation_required && (
                                <Badge variant="outline" className="text-xs">Validate</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Warnings */}
                    {host.requires_multi_step && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          This server requires multi-step firmware updates due to large version gaps.
                          Total time may be longer than single-step updates.
                        </AlertDescription>
                      </Alert>
                    )}

                    {host.compatibility_risk === 'high' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          High compatibility risk detected. Consider updating during a maintenance window
                          or coordinating carefully with cluster operations.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {gapAnalysis.length > 0 && onUpdateOrchestration && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">Ready to orchestrate updates</div>
                  <div className="text-sm text-muted-foreground">
                    {gapAnalysis.filter(h => h.components.length > 0).length} servers need updates
                  </div>
                </div>
                <Button onClick={() => onUpdateOrchestration(gapAnalysis)}>
                  Proceed to Orchestration
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}