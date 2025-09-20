import React, { useState } from 'react';
import { useEnterpriseAnalytics } from '@/hooks/useEnterpriseAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3, TrendingUp, Users, Activity, Server, Shield, 
  DollarSign, Clock, Brain, Download, RefreshCw, Eye, Check
} from 'lucide-react';
import { format } from 'date-fns';

export function EnterpriseAnalyticsDashboard() {
  const { 
    analytics, 
    insights, 
    metrics, 
    predictiveInsights, 
    loading, 
    trackEvent, 
    acknowledgeInsight, 
    generateReport,
    refresh 
  } = useEnterpriseAnalytics();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    setGenerating(true);
    try {
      const report = await generateReport(type);
      
      // In a real implementation, this would download or display the report
      console.log('Generated report:', report);
      
      await trackEvent('report_generated', { type, reportId: `report_${Date.now()}` });
      
      toast({
        title: "Report Generated",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} report has been generated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Enterprise Analytics</h1>
            <p className="text-muted-foreground text-lg">
              Advanced insights, predictive analytics, and intelligent automation
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="enterprise" 
            onClick={() => handleGenerateReport('weekly')}
            disabled={generating}
          >
            <Download className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Export Report'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-enterprise">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <h3 className="text-2xl font-bold">{metrics.userEngagement.activeUsers}</h3>
                      <p className="text-xs text-success">↑ 12% vs last week</p>
                    </div>
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enterprise">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">System Uptime</p>
                      <h3 className="text-2xl font-bold">{metrics.systemPerformance.uptime.toFixed(1)}%</h3>
                      <p className="text-xs text-success">↑ 2.3% vs last week</p>
                    </div>
                    <Activity className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enterprise">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Savings</p>
                      <h3 className="text-2xl font-bold">${metrics.businessMetrics.costSavings.toLocaleString()}</h3>
                      <p className="text-xs text-success">↑ 8.7% this month</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-warning" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enterprise">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Reduction</p>
                      <h3 className="text-2xl font-bold">{metrics.businessMetrics.riskReduction.toFixed(0)}%</h3>
                      <p className="text-xs text-success">↑ 15% this quarter</p>
                    </div>
                    <Shield className="w-8 h-8 text-error" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Response Time</span>
                        <span>{metrics.systemPerformance.responseTime.toFixed(0)}ms</span>
                      </div>
                      <Progress value={Math.min(100, (300 - metrics.systemPerformance.responseTime) / 3)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Throughput</span>
                        <span>{metrics.systemPerformance.throughput} req/min</span>
                      </div>
                      <Progress value={Math.min(100, metrics.systemPerformance.throughput * 2)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Error Rate</span>
                        <span>{(metrics.systemPerformance.errorRate * 100).toFixed(2)}%</span>
                      </div>
                      <Progress value={100 - (metrics.systemPerformance.errorRate * 1000)} className="bg-error/20" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {analytics.slice(0, 10).map((event) => (
                      <div key={event.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {event.event_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.map((insight) => (
              <Card key={insight.id} className="card-enterprise">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Brain className="w-5 h-5" />
                      {insight.title}
                    </CardTitle>
                    <Badge variant={
                      insight.severity === 'critical' ? 'destructive' : 
                      insight.severity === 'warning' ? 'default' : 
                      'secondary'
                    }>
                      {insight.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{insight.description}</p>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Confidence: {Math.round(insight.confidence_score * 100)}%</p>
                    <Progress value={insight.confidence_score * 100} />
                  </div>

                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Recommendations:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!insight.acknowledged_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeInsight(insight.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>

                  {insight.acknowledged_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Acknowledged {format(new Date(insight.acknowledged_at), 'MMM dd, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Response Time Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {metrics.systemPerformance.responseTime.toFixed(0)}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Average Response</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>P50</span>
                        <span>{(metrics.systemPerformance.responseTime * 0.8).toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>P95</span>
                        <span>{(metrics.systemPerformance.responseTime * 1.5).toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>P99</span>
                        <span>{(metrics.systemPerformance.responseTime * 2.2).toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-success">
                        {metrics.systemPerformance.uptime.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CPU Usage</span>
                          <span>67%</span>
                        </div>
                        <Progress value={67} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Memory Usage</span>
                          <span>42%</span>
                        </div>
                        <Progress value={42} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Disk Usage</span>
                          <span>23%</span>
                        </div>
                        <Progress value={23} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Business Impact</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-warning">
                        ${(metrics.businessMetrics.costSavings / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-muted-foreground">Monthly Savings</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Automated Tasks</span>
                        <span>{metrics.businessMetrics.successfulUpdates}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Manual Tasks Avoided</span>
                        <span>{Math.round(metrics.businessMetrics.successfulUpdates * 0.7)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Time Saved</span>
                        <span>{Math.round(metrics.businessMetrics.successfulUpdates * 2.3)} hrs</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictiveInsights.map((prediction, index) => (
              <Card key={index} className="card-enterprise">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      {prediction.title}
                    </CardTitle>
                    <Badge variant={
                      prediction.severity === 'warning' ? 'default' : 'secondary'
                    }>
                      {Math.round(prediction.likelihood * 100)}% likely
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{prediction.description}</p>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Predicted Timeframe</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{prediction.timeframe}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Likelihood</p>
                    <Progress value={prediction.likelihood * 100} />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="enterprise">
                      Take Action
                    </Button>
                    <Button size="sm" variant="outline">
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {predictiveInsights.length === 0 && (
              <Card className="card-enterprise col-span-full">
                <CardContent className="text-center py-8">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Predictions Available</h3>
                  <p className="text-muted-foreground">
                    The AI engine is still analyzing your system patterns. Check back later for predictive insights.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}