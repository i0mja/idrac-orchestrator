import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkflowEngine } from '@/hooks/useWorkflowEngine';
import {
  Command, BarChart3, Bot, Shield, Zap, TrendingUp, 
  Activity, AlertTriangle, CheckCircle, Clock, Server,
  Users, DollarSign, Brain, Settings
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  variant?: 'default' | 'enterprise' | 'outline';
  gradient?: string;
}

export function EnterpriseCommandCenter() {
  const [activeView, setActiveView] = useState('overview');
  const { executeWorkflow, templates, getExecutionStats } = useWorkflowEngine();

  const workflowStats = getExecutionStats();

  // Mock data for display
  const insights = [
    {
      id: '1',
      title: 'High CPU Usage Detected',
      description: 'Server cluster showing elevated CPU usage patterns',
      severity: 'warning',
      confidence_score: 0.85
    },
    {
      id: '2', 
      title: 'Scheduled Maintenance Due',
      description: 'Firmware updates available for 12 servers',
      severity: 'info',
      confidence_score: 0.95
    }
  ];

  const metrics = {
    systemPerformance: {
      uptime: 99.8,
      responseTime: 145,
      throughput: 2847,
      errorRate: 0.002
    },
    businessMetrics: {
      totalServers: 156,
      costSavings: 24500
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'emergency-patch',
      label: 'Emergency Patch',
      description: 'Deploy critical security patches across all systems',
      icon: Shield,
      action: () => {
        const securityTemplate = templates.find(t => t.category === 'security');
        if (securityTemplate) {
          executeWorkflow(securityTemplate.id, { priority: 'emergency' });
        }
      },
      variant: 'enterprise',
      gradient: 'from-red-500 to-orange-500'
    },
    {
      id: 'auto-remediation',
      label: 'Auto Remediation',
      description: 'Trigger automated issue resolution workflows',
      icon: Bot,
      action: () => {
        // Trigger auto remediation
      },
      variant: 'enterprise',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'system-health',
      label: 'Health Check',
      description: 'Run comprehensive system health diagnostics',
      icon: Activity,
      action: () => {
        // Run health check
      },
      variant: 'outline',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      id: 'performance-boost',
      label: 'Performance Boost',
      description: 'Optimize system performance automatically',
      icon: Zap,
      action: () => {
        // Optimize performance
      },
      variant: 'outline',
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  const systemOverview = {
    criticalAlerts: insights.filter(i => i.severity === 'critical').length,
    warningAlerts: insights.filter(i => i.severity === 'warning').length,
    activeWorkflows: workflowStats.running,
    systemHealth: metrics ? Math.round(metrics.systemPerformance.uptime) : 99,
    responseTime: metrics ? Math.round(metrics.systemPerformance.responseTime) : 145,
    activeUsers: metrics ? 42 : 42
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary via-primary-glow to-primary-variant rounded-xl flex items-center justify-center shadow-lg">
            <Command className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary-variant bg-clip-text text-transparent">
              Enterprise Command Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Centralized control hub for enterprise infrastructure management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'overview' ? 'enterprise' : 'outline'}
            onClick={() => setActiveView('overview')}
          >
            Overview
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Health</p>
                <h3 className="text-2xl font-bold text-success">{systemOverview.systemHealth}%</h3>
              </div>
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-error/5 to-error/10 border-error/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
                <h3 className="text-2xl font-bold text-error">{systemOverview.criticalAlerts}</h3>
              </div>
              <AlertTriangle className="w-6 h-6 text-error" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <h3 className="text-2xl font-bold text-warning">{systemOverview.activeWorkflows}</h3>
              </div>
              <Activity className="w-6 h-6 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <h3 className="text-2xl font-bold text-primary">{systemOverview.responseTime}ms</h3>
              </div>
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <h3 className="text-2xl font-bold text-blue-500">{systemOverview.activeUsers}</h3>
              </div>
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Servers Online</p>
                <h3 className="text-2xl font-bold text-purple-500">{metrics.businessMetrics.totalServers || 0}</h3>
              </div>
              <Server className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Emergency Response & Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant={action.variant}
                  onClick={action.action}
                  className={`h-24 flex flex-col gap-2 p-4 ${
                    action.gradient ? `bg-gradient-to-r ${action.gradient} hover:opacity-90` : ''
                  }`}
                >
                  <ActionIcon className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs opacity-80">{action.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className={`h-2 w-2 rounded-full mt-2 ${
                    insight.severity === 'critical' ? 'bg-error' :
                    insight.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(insight.confidence_score * 100)}% confidence
                      </Badge>
                      <Badge variant={
                        insight.severity === 'critical' ? 'destructive' : 
                        insight.severity === 'warning' ? 'default' : 'secondary'
                      } className="text-xs">
                        {insight.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {insights.length === 0 && (
                <div className="text-center py-4">
                  <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active insights</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Uptime</span>
                    <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{metrics.systemPerformance.uptime.toFixed(1)}%</span>
                      <Badge variant="default" className="text-xs">Excellent</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Time</span>
                    <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{metrics.systemPerformance.responseTime.toFixed(0)}ms</span>
                      <Badge variant="default" className="text-xs">Good</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Throughput</span>
                    <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{metrics.systemPerformance.throughput}/min</span>
                      <Badge variant="default" className="text-xs">Normal</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Error Rate</span>
                    <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{(metrics.systemPerformance.errorRate * 100).toFixed(2)}%</span>
                      <Badge variant="default" className="text-xs">Low</Badge>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Monthly Savings</span>
                      <span className="text-lg font-bold text-success">
                ${metrics.businessMetrics.costSavings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">System Status</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Infrastructure Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Compute Resources</span>
                    <Badge variant="default">Optimal</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Network Connectivity</span>
                    <Badge variant="default">Stable</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Storage Systems</span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Database Performance</span>
                    <Badge variant="default">Good</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>67%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>42%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-success h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Usage</span>
                      <span>23%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-warning h-2 rounded-full" style={{ width: '23%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Business Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Automation Rate</span>
                    <span className="font-medium">89%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Time Saved</span>
                    <span className="font-medium">142 hrs/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cost Reduction</span>
                    <span className="font-medium text-success">-23%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Risk Mitigation</span>
                    <span className="font-medium text-success">+45%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Advanced Automation</h3>
            <p className="text-muted-foreground mb-4">
              Switch to the full Automation view for detailed workflow management.
            </p>
            <Button onClick={() => setActiveView('workflows')} variant="enterprise">
              Open Workflow Hub
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Posture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success mb-2">94%</div>
                    <div className="text-sm text-muted-foreground">Security Score</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Patch Compliance</span>
                      <Badge variant="default">96%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Vulnerability Scans</span>
                      <Badge variant="default">Current</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Access Control</span>
                      <Badge variant="default">Enforced</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Audit Compliance</span>
                      <Badge variant="default">100%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Threat Landscape</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Blocked Threats (24h)</span>
                    <span className="font-bold text-error">23</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Failed Login Attempts</span>
                    <span className="font-bold text-warning">7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Quarantined Files</span>
                    <span className="font-bold">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Security Updates</span>
                    <Badge variant="default">Up to date</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Operational Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">SLA Compliance</span>
                    <span className="font-medium text-success">99.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MTTR</span>
                    <span className="font-medium">12 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Change Success Rate</span>
                    <span className="font-medium text-success">97%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Incident Response</span>
                    <Badge variant="default">Excellent</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Capacity Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Forecast Accuracy</span>
                    <span className="font-medium">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Resource Efficiency</span>
                    <span className="font-medium text-success">+12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Growth Projection</span>
                    <span className="font-medium">15%/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Optimization Score</span>
                    <Badge variant="default">High</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Cost Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Monthly Savings</span>
                    <span className="font-medium text-success">$12.4K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Efficiency Gains</span>
                    <span className="font-medium text-success">+18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Waste Reduction</span>
                    <span className="font-medium text-success">-34%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">ROI</span>
                    <span className="font-medium text-success">340%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}