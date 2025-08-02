import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play,
  Pause,
  Settings,
  Calendar,
  Users,
  Zap
} from 'lucide-react';
import { FirmwareGapAnalyzer } from './FirmwareGapAnalyzer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { HostFirmwareGap, ClusterCompatibilityAnalysis } from '@/hooks/useFirmwareGapAnalysis';

interface EnhancedUpdateOrchestratorProps {
  servers: any[];
  onUpdateComplete?: () => void;
}

type UpdateStrategy = 'immediate' | 'scheduled' | 'maintenance_window' | 'smart_rolling';
type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';

interface OrchestrationConfig {
  strategy: UpdateStrategy;
  risk_tolerance: RiskTolerance;
  max_parallel_clusters: number;
  max_parallel_hosts_per_cluster: number;
  require_manual_approval: boolean;
  respect_maintenance_windows: boolean;
  scheduled_start?: string;
  compatibility_validation: boolean;
  rollback_on_failure: boolean;
}

export function EnhancedUpdateOrchestrator({ servers, onUpdateComplete }: EnhancedUpdateOrchestratorProps) {
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);
  const [gapAnalysisData, setGapAnalysisData] = useState<HostFirmwareGap[]>([]);
  const [orchestrationConfig, setOrchestrationConfig] = useState<OrchestrationConfig>({
    strategy: 'smart_rolling',
    risk_tolerance: 'balanced',
    max_parallel_clusters: 1,
    max_parallel_hosts_per_cluster: 2,
    require_manual_approval: true,
    respect_maintenance_windows: true,
    compatibility_validation: true,
    rollback_on_failure: true,
  });
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationResults, setOrchestrationResults] = useState<any>(null);
  const { toast } = useToast();

  const handleServerSelection = (serverId: string, checked: boolean) => {
    setSelectedServers(prev => 
      checked ? [...prev, serverId] : prev.filter(id => id !== serverId)
    );
  };

  const handleSelectAll = () => {
    const eligibleServers = servers.filter(server => needsUpdate(server));
    setSelectedServers(eligibleServers.map(s => s.id));
  };

  const handleClearAll = () => {
    setSelectedServers([]);
  };

  const needsUpdate = (server: any): boolean => {
    // Simple check - in reality this would be more sophisticated
    return server.status === 'online' && (
      !server.bios_version || 
      !server.idrac_version ||
      server.bios_version.includes('old') ||
      server.idrac_version.includes('old')
    );
  };

  const handleGapAnalysisComplete = (gaps: HostFirmwareGap[]) => {
    setGapAnalysisData(gaps);
    setShowGapAnalysis(false);
    
    // Auto-select servers that need updates
    const serversNeedingUpdates = gaps
      .filter(gap => gap.components.length > 0)
      .map(gap => gap.host_id);
    setSelectedServers(serversNeedingUpdates);
  };

  const getUpdateEstimate = (): { totalTime: number; criticalUpdates: number; clusters: string[] } => {
    const relevantGaps = gapAnalysisData.filter(gap => selectedServers.includes(gap.host_id));
    
    const totalTime = relevantGaps.reduce((sum, gap) => sum + gap.total_update_time_minutes, 0);
    const criticalUpdates = relevantGaps.reduce((sum, gap) => 
      sum + gap.components.filter(c => c.criticality === 'critical').length, 0
    );
    const clusters = [...new Set(relevantGaps.map(gap => gap.cluster_name).filter(Boolean))];
    
    return { totalTime, criticalUpdates, clusters };
  };

  const generateUpdatePlan = () => {
    const estimate = getUpdateEstimate();
    const clusteredGaps = gapAnalysisData.reduce((acc, gap) => {
      const cluster = gap.cluster_name || 'standalone';
      if (!acc[cluster]) acc[cluster] = [];
      acc[cluster].push(gap);
      return acc;
    }, {} as { [key: string]: HostFirmwareGap[] });

    return {
      total_duration_hours: Math.ceil(estimate.totalTime / 60),
      critical_updates: estimate.criticalUpdates,
      affected_clusters: estimate.clusters,
      execution_phases: Object.entries(clusteredGaps).map(([cluster, gaps], index) => ({
        phase: index + 1,
        cluster_name: cluster,
        hosts: gaps.filter(gap => selectedServers.includes(gap.host_id)),
        estimated_duration: Math.ceil(
          Math.max(...gaps.map(g => g.total_update_time_minutes)) / 60
        ),
        parallel_execution: orchestrationConfig.max_parallel_hosts_per_cluster > 1
      }))
    };
  };

  const handleOrchestration = async () => {
    if (selectedServers.length === 0) {
      toast({
        title: "No servers selected",
        description: "Please select servers for firmware updates",
        variant: "destructive",
      });
      return;
    }

    setIsOrchestrating(true);
    
    try {
      const updatePlan = generateUpdatePlan();
      
      // Call the enhanced orchestration edge function
      const { data, error } = await supabase.functions.invoke('enhanced-orchestrate-updates', {
        body: {
          server_ids: selectedServers,
          firmware_gaps: gapAnalysisData.filter(gap => selectedServers.includes(gap.host_id)),
          orchestration_config: orchestrationConfig,
          update_plan: updatePlan
        }
      });

      if (error) throw error;

      setOrchestrationResults(data);
      
      toast({
        title: "Orchestration Initiated",
        description: `Update orchestration started for ${selectedServers.length} servers`,
      });

      onUpdateComplete?.();

    } catch (error) {
      console.error('Orchestration error:', error);
      toast({
        title: "Orchestration Failed",
        description: "Failed to start update orchestration",
        variant: "destructive",
      });
    } finally {
      setIsOrchestrating(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStrategyDescription = (strategy: UpdateStrategy): string => {
    switch (strategy) {
      case 'immediate': return 'Start updates immediately with minimal validation';
      case 'scheduled': return 'Schedule updates for a specific time';
      case 'maintenance_window': return 'Coordinate with existing maintenance windows';
      case 'smart_rolling': return 'Intelligent rolling updates based on cluster analysis';
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Server Selection & Analysis</CardTitle>
          <CardDescription>
            Select servers and analyze firmware gaps before orchestrating updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowGapAnalysis(true)}
                disabled={selectedServers.length === 0}
              >
                <Zap className="h-4 w-4 mr-2" />
                Analyze Firmware Gaps
              </Button>
              <Button variant="outline" onClick={handleSelectAll}>
                Select All Eligible
              </Button>
              <Button variant="outline" onClick={handleClearAll}>
                Clear Selection
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map(server => (
                <div key={server.id} className="border rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={server.id}
                      checked={selectedServers.includes(server.id)}
                      onCheckedChange={(checked) => 
                        handleServerSelection(server.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="font-medium">{server.hostname}</div>
                      <div className="text-sm text-muted-foreground">{server.ip_address}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                      {server.status}
                    </Badge>
                    {needsUpdate(server) && (
                      <Badge variant="destructive">Updates Available</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedServers.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedServers.length} servers selected for firmware analysis and updates
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis Modal/Section */}
      {showGapAnalysis && (
        <FirmwareGapAnalyzer 
          serverIds={selectedServers}
          onUpdateOrchestration={handleGapAnalysisComplete}
        />
      )}

      {/* Orchestration Configuration */}
      {gapAnalysisData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Update Orchestration Configuration</CardTitle>
            <CardDescription>
              Configure how firmware updates will be orchestrated across your infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="strategy" className="space-y-4">
              <TabsList>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="timing">Timing</TabsTrigger>
                <TabsTrigger value="safety">Safety</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="strategy" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strategy">Update Strategy</Label>
                    <Select value={orchestrationConfig.strategy} onValueChange={(value: UpdateStrategy) =>
                      setOrchestrationConfig(prev => ({ ...prev, strategy: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate Updates</SelectItem>
                        <SelectItem value="scheduled">Scheduled Updates</SelectItem>
                        <SelectItem value="maintenance_window">Maintenance Window</SelectItem>
                        <SelectItem value="smart_rolling">Smart Rolling Updates</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getStrategyDescription(orchestrationConfig.strategy)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
                    <Select value={orchestrationConfig.risk_tolerance} onValueChange={(value: RiskTolerance) =>
                      setOrchestrationConfig(prev => ({ ...prev, risk_tolerance: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-clusters">Max Parallel Clusters</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={orchestrationConfig.max_parallel_clusters}
                      onChange={(e) => setOrchestrationConfig(prev => ({
                        ...prev,
                        max_parallel_clusters: parseInt(e.target.value) || 1
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max-hosts">Max Hosts per Cluster</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={orchestrationConfig.max_parallel_hosts_per_cluster}
                      onChange={(e) => setOrchestrationConfig(prev => ({
                        ...prev,
                        max_parallel_hosts_per_cluster: parseInt(e.target.value) || 1
                      }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-4">
                {orchestrationConfig.strategy === 'scheduled' && (
                  <div>
                    <Label htmlFor="scheduled-start">Scheduled Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={orchestrationConfig.scheduled_start || ''}
                      onChange={(e) => setOrchestrationConfig(prev => ({
                        ...prev,
                        scheduled_start: e.target.value
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="respect-maintenance"
                      checked={orchestrationConfig.respect_maintenance_windows}
                      onCheckedChange={(checked) => setOrchestrationConfig(prev => ({
                        ...prev,
                        respect_maintenance_windows: checked as boolean
                      }))}
                    />
                    <Label htmlFor="respect-maintenance">Respect existing maintenance windows</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="safety" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="manual-approval"
                      checked={orchestrationConfig.require_manual_approval}
                      onCheckedChange={(checked) => setOrchestrationConfig(prev => ({
                        ...prev,
                        require_manual_approval: checked as boolean
                      }))}
                    />
                    <Label htmlFor="manual-approval">Require manual approval for each phase</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="compatibility-validation"
                      checked={orchestrationConfig.compatibility_validation}
                      onCheckedChange={(checked) => setOrchestrationConfig(prev => ({
                        ...prev,
                        compatibility_validation: checked as boolean
                      }))}
                    />
                    <Label htmlFor="compatibility-validation">Validate cluster compatibility between updates</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rollback-on-failure"
                      checked={orchestrationConfig.rollback_on_failure}
                      onCheckedChange={(checked) => setOrchestrationConfig(prev => ({
                        ...prev,
                        rollback_on_failure: checked as boolean
                      }))}
                    />
                    <Label htmlFor="rollback-on-failure">Automatic rollback on failure</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                {(() => {
                  const estimate = getUpdateEstimate();
                  const plan = generateUpdatePlan();
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{selectedServers.length}</div>
                          <div className="text-sm text-muted-foreground">Servers Selected</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{plan.total_duration_hours}h</div>
                          <div className="text-sm text-muted-foreground">Estimated Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{estimate.criticalUpdates}</div>
                          <div className="text-sm text-muted-foreground">Critical Updates</div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">Execution Plan</h4>
                        <div className="space-y-2">
                          {plan.execution_phases.map((phase) => (
                            <div key={phase.phase} className="flex justify-between items-center p-3 border rounded">
                              <div>
                                <span className="font-medium">Phase {phase.phase}: {phase.cluster_name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({phase.hosts.length} hosts)
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ~{phase.estimated_duration}h
                                {phase.parallel_execution && (
                                  <Badge variant="outline" className="ml-2">Parallel</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {estimate.criticalUpdates > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            This orchestration includes {estimate.criticalUpdates} critical firmware updates. 
                            Extra validation and caution are recommended.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setGapAnalysisData([])}>
                Back to Analysis
              </Button>
              <Button 
                onClick={handleOrchestration}
                disabled={isOrchestrating || selectedServers.length === 0}
              >
                {isOrchestrating ? (
                  <>
                    <Play className="h-4 w-4 mr-2 animate-spin" />
                    Orchestrating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Orchestration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orchestration Results */}
      {orchestrationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Orchestration Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Update orchestration has been successfully initiated. 
                  Monitor progress in the Update Jobs section.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(orchestrationResults, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}