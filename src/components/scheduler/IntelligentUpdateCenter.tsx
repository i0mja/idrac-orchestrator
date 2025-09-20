import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, Brain, Calendar, Target, Shield } from 'lucide-react';
import { useIntelligentUpdateOrchestrator } from '@/hooks/useIntelligentUpdateOrchestrator';
import { usePredictiveMaintenanceWindows } from '@/hooks/usePredictiveMaintenanceWindows';

interface IntelligentUpdateCenterProps {
  selectedServers: string[];
  firmwarePackages: string[];
}

export function IntelligentUpdateCenter({ selectedServers, firmwarePackages }: IntelligentUpdateCenterProps) {
  const [activeTab, setActiveTab] = useState('risk-analysis');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  const {
    loading: orchestratorLoading,
    currentPlan,
    riskAssessments,
    analyzeUpdateRisk,
    generateIntelligentPlan,
    executePlan
  } = useIntelligentUpdateOrchestrator();

  const {
    loading: windowsLoading,
    workloadPatterns,
    suggestedWindows,
    analyzeWorkloadPatterns,
    predictOptimalWindows,
    validateWindow
  } = usePredictiveMaintenanceWindows();

  const handleRiskAnalysis = () => {
    if (selectedServers.length > 0) {
      analyzeUpdateRisk(selectedServers);
    }
  };

  const handleGeneratePlan = () => {
    if (selectedServers.length > 0 && firmwarePackages.length > 0) {
      generateIntelligentPlan(selectedServers, firmwarePackages, {
        maxConcurrentUpdates: 3,
        criticalSystemProtection: true
      });
    }
  };

  const handlePredictWindows = () => {
    if (selectedServers.length > 0) {
      analyzeWorkloadPatterns(selectedServers, 14);
      predictOptimalWindows(selectedServers, 45, {
        maxDowntimeMinutes: 60,
        requireApproval: true
      });
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadge = (score: number) => {
    if (score < 30) return <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>;
    if (score < 70) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    return <Badge variant="secondary" className="bg-red-100 text-red-800">High Risk</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Intelligent Update Center</h2>
          <p className="text-muted-foreground">
            AI-powered update orchestration with predictive maintenance windows
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="risk-analysis" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Analysis
          </TabsTrigger>
          <TabsTrigger value="intelligent-planning" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Smart Planning
          </TabsTrigger>
          <TabsTrigger value="maintenance-windows" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Maintenance Windows
          </TabsTrigger>
          <TabsTrigger value="execution" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Execution Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Update Risk Assessment
              </CardTitle>
              <CardDescription>
                Analyze server readiness and identify potential update risks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button 
                  onClick={handleRiskAnalysis}
                  disabled={orchestratorLoading || selectedServers.length === 0}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Analyze Risk ({selectedServers.length} servers)
                </Button>
              </div>

              {riskAssessments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Risk Assessment Results</h4>
                  {riskAssessments.map((assessment, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Server {assessment.serverId}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getRiskColor(assessment.riskScore)}`}>
                              {assessment.riskScore}% Risk
                            </span>
                            {getRiskBadge(assessment.riskScore)}
                          </div>
                        </div>
                        <Progress value={assessment.riskScore} className="mb-3" />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Risk Factors:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {assessment.riskFactors.criticalWorkloads && (
                                <li>Critical workloads detected</li>
                              )}
                              {assessment.riskFactors.highAvailability && (
                                <li>High availability requirements</li>
                              )}
                              {assessment.riskFactors.recentChanges && (
                                <li>Recent system changes</li>
                              )}
                              <li>Firmware complexity: {assessment.riskFactors.firmwareComplexity}</li>
                            </ul>
                          </div>
                          <div>
                            <span className="font-medium">Recommendations:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {assessment.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {assessment.suggestedWindow && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium">Suggested Maintenance Window:</span>
                            <p className="text-sm mt-1">
                              {new Date(assessment.suggestedWindow.start).toLocaleString()} 
                              ({assessment.suggestedWindow.duration} minutes)
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assessment.suggestedWindow.rationale}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligent-planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Intelligent Update Planning
              </CardTitle>
              <CardDescription>
                Generate optimized update sequences with automated rollback plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button 
                  onClick={handleGeneratePlan}
                  disabled={orchestratorLoading || selectedServers.length === 0 || firmwarePackages.length === 0}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Generate Intelligent Plan
                </Button>
              </div>

              {currentPlan && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Plan: {currentPlan.name}</h4>
                    <Badge variant="secondary">{currentPlan.serverGroups.length} Groups</Badge>
                  </div>

                  {currentPlan.serverGroups.map((group, index) => (
                    <Card key={group.groupId}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Group {index + 1}</span>
                          <Badge 
                            variant={group.riskLevel === 'low' ? 'secondary' : 
                                   group.riskLevel === 'medium' ? 'default' : 'destructive'}
                          >
                            {group.riskLevel} risk
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Servers ({group.servers.length}):</span>
                            <p className="text-muted-foreground">{group.servers.join(', ')}</p>
                          </div>
                          <div>
                            <span className="font-medium">Scheduled Window:</span>
                            <p className="text-muted-foreground">
                              {new Date(group.scheduledWindow).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {group.dependencies.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-sm">Dependencies:</span>
                            <p className="text-sm text-muted-foreground">
                              {group.dependencies.join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Safety & Rollback Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Pre-Update Checks:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {currentPlan.safetyChecks.preUpdate.map((check, i) => (
                              <li key={i}>{check}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-medium">Post-Update Checks:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {currentPlan.safetyChecks.postUpdate.map((check, i) => (
                              <li key={i}>{check}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-medium">Rollback Triggers:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {currentPlan.rollbackPlan.rollbackTriggers.map((trigger, i) => (
                              <li key={i}>{trigger}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance-windows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Predictive Maintenance Windows
              </CardTitle>
              <CardDescription>
                AI-powered optimal maintenance window recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button 
                  onClick={handlePredictWindows}
                  disabled={windowsLoading || selectedServers.length === 0}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Predict Optimal Windows
                </Button>
              </div>

              {suggestedWindows.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Recommended Maintenance Windows</h4>
                  {suggestedWindows.map((window, index) => (
                    <Card key={window.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Server {window.serverId}</span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={window.workloadImpact === 'minimal' ? 'secondary' : 
                                     window.workloadImpact === 'low' ? 'default' : 'destructive'}
                            >
                              {window.workloadImpact} impact
                            </Badge>
                            <span className="text-sm font-medium">
                              {window.confidence}% confidence
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium">Recommended Window:</span>
                            <p className="text-muted-foreground">
                              {new Date(window.suggestedStart).toLocaleString()} - 
                              {new Date(window.suggestedEnd).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Risk Score:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={window.riskScore} className="flex-1" />
                              <span className={`font-bold ${getRiskColor(window.riskScore)}`}>
                                {window.riskScore}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <span className="font-medium text-sm">Rationale:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-muted-foreground">
                            {window.rationale.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </div>

                        {window.alternatives.length > 0 && (
                          <div>
                            <span className="font-medium text-sm">Alternative Windows:</span>
                            <div className="mt-2 space-y-2">
                              {window.alternatives.slice(0, 2).map((alt, i) => (
                                <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                                  <span className="font-medium">
                                    {new Date(alt.start).toLocaleString()} - 
                                    {new Date(alt.end).toLocaleString()}
                                  </span>
                                  <span className="ml-2 text-muted-foreground">
                                    ({alt.confidence}% confidence)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="default">
                            Schedule Window
                          </Button>
                          <Button size="sm" variant="outline">
                            Validate Window
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Execution Monitor
              </CardTitle>
              <CardDescription>
                Real-time monitoring of intelligent update execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPlan ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => executePlan(currentPlan.id, { dryRun: true })}
                      variant="outline"
                      disabled={orchestratorLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Dry Run
                    </Button>
                    <Button 
                      onClick={() => executePlan(currentPlan.id, { autoRollback: true })}
                      disabled={orchestratorLoading}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Execute with Auto-Rollback
                    </Button>
                  </div>

                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Execution monitoring will appear here when a plan is running</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Generate an intelligent update plan to enable execution monitoring</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}