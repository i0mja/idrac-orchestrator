import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Settings, 
  TrendingUp,
  Eye,
  Ban,
  AlertCircle,
  Clock,
  Target
} from 'lucide-react';
import { useAutomatedCompliance } from '@/hooks/useAutomatedCompliance';
import { useGovernancePolicyEngine } from '@/hooks/useGovernancePolicyEngine';

interface ComplianceGovernanceHubProps {
  selectedServers?: string[];
}

export function ComplianceGovernanceHub({ selectedServers = [] }: ComplianceGovernanceHubProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const {
    loading: complianceLoading,
    rules,
    violations,
    metrics,
    runComplianceCheck,
    remediateViolation,
    generateComplianceReport
  } = useAutomatedCompliance();

  const {
    loading: policyLoading,
    policies,
    templates,
    executions,
    metrics: policyMetrics,
    evaluatePolicy,
    bulkEvaluatePolicies,
    createPolicyFromTemplate,
    updatePolicyEnforcement
  } = useGovernancePolicyEngine();

  const handleRunCompliance = async () => {
    await runComplianceCheck(selectedServers.length > 0 ? selectedServers : undefined);
  };

  const handleBulkEvaluation = async () => {
    await bulkEvaluatePolicies(selectedServers.length > 0 ? selectedServers : undefined);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Compliance & Governance Hub</h2>
            <p className="text-muted-foreground">
              Automated policy enforcement and compliance monitoring
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRunCompliance}
            disabled={complianceLoading}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Run Compliance Check
          </Button>
          <Button 
            onClick={handleBulkEvaluation}
            disabled={policyLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Evaluate Policies
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="violations" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Violations ({violations.length})
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Policies ({policies.length})
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Compliance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                    <p className={`text-2xl font-bold ${getComplianceScoreColor(metrics?.overallScore || 0)}`}>
                      {metrics?.overallScore || 0}%
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <Progress 
                  value={metrics?.overallScore || 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Violations</p>
                    <p className="text-2xl font-bold text-red-600">
                      {violations.filter(v => v.status === 'open').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Policies</p>
                    <p className="text-2xl font-bold">
                      {policies.filter(p => p.is_active).length}
                    </p>
                  </div>
                  <Settings className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-600">
                      {violations.filter(v => v.severity === 'critical' && v.status === 'open').length}
                    </p>
                  </div>
                  <Ban className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {metrics?.categoryScores && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance by Category</CardTitle>
                <CardDescription>Breakdown of compliance scores across different categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.categoryScores).map(([category, score]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="font-medium capitalize">{category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={score} className="w-24" />
                        <span className={`font-bold ${getComplianceScoreColor(score)}`}>
                          {score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Policy Executions</CardTitle>
              <CardDescription>Latest policy evaluation results</CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length > 0 ? (
                <div className="space-y-3">
                  {executions.slice(0, 5).map((execution, index) => (
                    <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {execution.result === 'pass' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : execution.result === 'fail' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">Policy {execution.policyId}</p>
                          <p className="text-sm text-muted-foreground">
                            Server: {execution.serverId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={execution.result === 'pass' ? 'secondary' : 'destructive'}>
                          {execution.result}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(execution.executedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No policy executions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Compliance Violations</h3>
            <Button onClick={handleRunCompliance} disabled={complianceLoading}>
              Refresh Violations
            </Button>
          </div>

          {violations.length > 0 ? (
            <div className="space-y-4">
              {violations.map((violation) => (
                <Card key={violation.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getSeverityColor(violation.severity)}>
                            {violation.severity}
                          </Badge>
                          <span className="font-medium">{violation.violationType}</span>
                          <Badge variant="outline">{violation.status}</Badge>
                        </div>
                        <p className="text-sm mb-2">{violation.description}</p>
                        <div className="text-sm text-muted-foreground">
                          <p>Server: {violation.serverName}</p>
                          <p>Detected: {new Date(violation.detectedAt).toLocaleString()}</p>
                        </div>
                        
                        {violation.remediationSteps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-1">Remediation Steps:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {violation.remediationSteps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => remediateViolation(violation.id, 'auto_remediate')}
                          disabled={complianceLoading}
                        >
                          Auto Fix
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => remediateViolation(violation.id, 'accept_risk')}
                          disabled={complianceLoading}
                        >
                          Accept Risk
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No compliance violations found</p>
                  <p className="text-sm mt-2">All systems are compliant with current policies</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Governance Policies</h3>
            <div className="flex gap-2">
              <Button variant="outline">Create Policy</Button>
              <Button onClick={handleBulkEvaluation} disabled={policyLoading}>
                Evaluate All
              </Button>
            </div>
          </div>

          {/* Policy Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Templates</CardTitle>
              <CardDescription>Create new policies from built-in templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                      <Button 
                        size="sm" 
                        onClick={() => createPolicyFromTemplate(template.id, template.name)}
                        disabled={policyLoading}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Existing Policies */}
          <div className="space-y-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{policy.policy_name}</h4>
                        <Badge variant="outline">{policy.policy_type}</Badge>
                        <Badge 
                          className={
                            policy.enforcement_level === 'block' ? 'bg-red-100 text-red-800' :
                            policy.enforcement_level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {policy.enforcement_level}
                        </Badge>
                        {policy.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(policy.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => evaluatePolicy(policy.id)}
                        disabled={policyLoading}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>Complete audit log of compliance and policy activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Audit trail functionality coming soon</p>
                <p className="text-sm mt-2">Track all compliance and governance activities</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Compliance Reports</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => generateComplianceReport('summary')}
                disabled={complianceLoading}
              >
                Generate Summary
              </Button>
              <Button 
                onClick={() => generateComplianceReport('detailed')}
                disabled={complianceLoading}
                variant="outline"
              >
                Detailed Report
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Generation
              </CardTitle>
              <CardDescription>Generate comprehensive compliance and governance reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select report type and timeframe to generate reports</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button 
                    onClick={() => generateComplianceReport('executive')}
                    disabled={complianceLoading}
                  >
                    Executive Summary
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
