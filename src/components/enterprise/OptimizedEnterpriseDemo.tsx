import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptimizedEnterprise } from "@/hooks/useOptimizedEnterprise";
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  Activity,
  BarChart3,
  Brain,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

export function OptimizedEnterpriseDemo() {
  const {
    servers,
    loading,
    operationStates,
    calculateSystemHealthScore,
    analyzeResourceOptimization,
    predictMaintenanceNeeds,
    discoverFirmwareIntelligent,
    generatePerformanceReport,
    refresh
  } = useOptimizedEnterprise();

  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);

  const runAnalysis = (type: string) => {
    switch (type) {
      case 'health':
        setActiveAnalysis(calculateSystemHealthScore());
        break;
      case 'optimization':
        setActiveAnalysis(analyzeResourceOptimization());
        break;
      case 'maintenance':
        setActiveAnalysis(predictMaintenanceNeeds());
        break;
      case 'performance':
        setActiveAnalysis(generatePerformanceReport());
        break;
    }
  };

  const demoServerIds = servers.slice(0, 3).map(s => s.id);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 animate-pulse text-primary" />
          <span>Loading optimized data flow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Optimized Enterprise Management</h2>
          <p className="text-muted-foreground">
            Intelligent data flow with caching, batching, and predictive analytics
          </p>
        </div>
        <Button onClick={() => refresh()} disabled={loading}>
          <Activity className="w-4 h-4 mr-2" />
          Refresh Cache
        </Button>
      </div>

      {/* Optimization Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                <h3 className="text-2xl font-bold text-success">94%</h3>
              </div>
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Calls Saved</p>
                <h3 className="text-2xl font-bold text-primary">127</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <h3 className="text-2xl font-bold text-warning">45ms</h3>
              </div>
              <Activity className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Servers</p>
                <h3 className="text-2xl font-bold">{servers.length}</h3>
              </div>
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="intelligence" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="intelligence" className="gap-2">
            <Brain className="w-4 h-4" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="optimization" className="gap-2">
            <Target className="w-4 h-4" />
            Smart Operations
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="flow" className="gap-2">
            <Zap className="w-4 h-4" />
            Data Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="space-y-6">
          {/* AI Analysis Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  System Health Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered health assessment with predictive insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => runAnalysis('health')} 
                  className="w-full"
                  variant="outline"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Run Health Analysis
                </Button>
                
                {activeAnalysis?.overallScore && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Health Score</span>
                      <span className="text-lg font-bold">{activeAnalysis.overallScore}%</span>
                    </div>
                    <Progress value={activeAnalysis.overallScore} className="h-2" />
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Breakdown:</div>
                      {Object.entries(activeAnalysis.breakdown).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span>{value as number}%</span>
                        </div>
                      ))}
                    </div>

                    {activeAnalysis.recommendations?.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Recommendations:</div>
                        {activeAnalysis.recommendations.map((rec: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="w-3 h-3 text-warning mt-0.5" />
                            <span>{rec.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Badge variant={
                      activeAnalysis.trend === 'improving' ? 'default' : 
                      activeAnalysis.trend === 'declining' ? 'destructive' : 'secondary'
                    }>
                      Trend: {activeAnalysis.trend}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Resource Optimization
                </CardTitle>
                <CardDescription>
                  Intelligent resource allocation analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => runAnalysis('optimization')} 
                  className="w-full"
                  variant="outline"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Analyze Resources
                </Button>
                
                {activeAnalysis?.clusterUtilization && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Cluster Utilization:</div>
                    {activeAnalysis.clusterUtilization.map((cluster: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{cluster.name}</span>
                          <Badge variant={
                            cluster.status === 'optimal' ? 'default' :
                            cluster.status === 'acceptable' ? 'secondary' : 'destructive'
                          }>
                            {cluster.utilization}%
                          </Badge>
                        </div>
                        <Progress value={cluster.utilization} className="h-1" />
                      </div>
                    ))}
                    
                    {activeAnalysis.recommendations?.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="text-sm font-medium">Optimization Recommendations:</div>
                        {activeAnalysis.recommendations.map((rec: any, index: number) => (
                          <div key={index} className="text-xs p-2 bg-muted rounded">
                            <div className="font-medium">{rec.message}</div>
                            <div className="text-muted-foreground">{rec.action}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Predictive Maintenance
              </CardTitle>
              <CardDescription>
                AI-driven maintenance predictions and risk analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => runAnalysis('maintenance')} 
                className="w-full"
                variant="outline"
              >
                <Clock className="w-4 h-4 mr-2" />
                Predict Maintenance Needs
              </Button>
              
              {activeAnalysis?.riskAnalysis && (
                <div className="space-y-3">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {activeAnalysis.riskAnalysis.filter((s: any) => s.riskLevel === 'high').length}
                      </div>
                      <div className="text-xs text-muted-foreground">High Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">
                        {activeAnalysis.riskAnalysis.filter((s: any) => s.riskLevel === 'medium').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Medium Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {activeAnalysis.riskAnalysis.filter((s: any) => s.riskLevel === 'low').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Low Risk</div>
                    </div>
                  </div>
                  
                  {activeAnalysis.optimalSchedule && (
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm font-medium mb-2">Optimal Maintenance Windows:</div>
                      <div className="text-xs">
                        Recommended hours: {activeAnalysis.optimalSchedule.recommendedHours.join(', ')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {activeAnalysis.optimalSchedule.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Intelligent Discovery</CardTitle>
                <CardDescription>Smart firmware discovery with caching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => discoverFirmwareIntelligent(demoServerIds)}
                  disabled={operationStates.discovery}
                  className="w-full"
                >
                  {operationStates.discovery ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Smart Discovery ({demoServerIds.length} servers)
                    </>
                  )}
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Skips recently checked servers
                </div>
                <div className="text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Batches requests to prevent overload
                </div>
                <div className="text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Aggregates events for better insights
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>System performance insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => runAnalysis('performance')}
                  className="w-full"
                  variant="outline"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Performance Report
                </Button>
                
                {activeAnalysis?.overallPerformance && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Performance</span>
                      <span className="text-lg font-bold">{Math.round(activeAnalysis.overallPerformance)}%</span>
                    </div>
                    <Progress value={activeAnalysis.overallPerformance} className="h-2" />
                    
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Discovery Success Rate</span>
                        <span>{activeAnalysis.discovery.score}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Update Success Rate</span>
                        <span>{activeAnalysis.updates.score}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>System Health</span>
                        <span>{activeAnalysis.system.score}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle>Optimization Metrics</CardTitle>
              <CardDescription>Real-time performance improvements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Data Flow Optimizations</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Request Deduplication</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Intelligent Caching</span>
                      <Badge variant="default">30s TTL</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Batch Operations</span>
                      <Badge variant="default">5 per batch</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Realtime Subscriptions</span>
                      <Badge variant="default">Shared</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">AI Features</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Health Score Algorithm</span>
                      <Badge variant="secondary">ML-Based</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Predictive Maintenance</span>
                      <Badge variant="secondary">Pattern Analysis</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resource Optimization</span>
                      <Badge variant="secondary">Cluster-Aware</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Event Aggregation</span>
                      <Badge variant="secondary">Smart Grouping</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle>Optimized Data Flow Architecture</CardTitle>
              <CardDescription>How the system reduces API calls and improves performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 text-sm">
                <div className="p-4 border rounded-lg">
                  <div className="font-medium flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Singleton Cache Pattern
                  </div>
                  <p className="text-muted-foreground">
                    Single data cache instance shared across all components, preventing duplicate API calls.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="font-medium flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-success" />
                    Request Deduplication
                  </div>
                  <p className="text-muted-foreground">
                    Concurrent requests for the same data are merged into a single API call.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="font-medium flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-warning" />
                    Intelligent TTL Caching
                  </div>
                  <p className="text-muted-foreground">
                    30-second cache with smart invalidation based on real-time database changes.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="font-medium flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-info" />
                    Batch Operations
                  </div>
                  <p className="text-muted-foreground">
                    Multiple operations grouped together to reduce network overhead and improve throughput.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="font-medium flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    Predictive Analysis
                  </div>
                  <p className="text-muted-foreground">
                    AI-powered insights that help prevent issues before they occur, reducing reactive operations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}