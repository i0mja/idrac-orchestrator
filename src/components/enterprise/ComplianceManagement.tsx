import React, { useState } from 'react';
import { useCompliance } from '@/hooks/useCompliance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, FileText, Settings, Plus, Download, Eye, Edit, 
  Trash2, CheckCircle, AlertTriangle, Calendar, TrendingUp,
  FileCheck, Lock, Scale, Activity, Clock, Award
} from 'lucide-react';
import { format } from 'date-fns';

export function ComplianceManagement() {
  const {
    reports,
    policies,
    loading,
    generateComplianceReport,
    updateReportStatus,
    deleteReport,
    createGovernancePolicy,
    updateGovernancePolicy,
    deleteGovernancePolicy,
    exportReport,
    getComplianceOverview
  } = useCompliance();

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    report_type: 'soc2',
    period_start: '',
    period_end: ''
  });
  const [policyForm, setPolicyForm] = useState({
    policy_name: '',
    policy_type: 'security',
    enforcement_level: 'warn',
    policy_rules: {}
  });

  const overview = getComplianceOverview();

  const handleGenerateReport = async () => {
    try {
      await generateComplianceReport(
        reportForm.report_type,
        reportForm.period_start,
        reportForm.period_end
      );
      setIsReportDialogOpen(false);
      setReportForm({ report_type: 'soc2', period_start: '', period_end: '' });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCreatePolicy = async () => {
    try {
      await createGovernancePolicy({
        organization_id: '', // Will be set by hook
        is_active: true,
        ...policyForm
      });
      setIsPolicyDialogOpen(false);
      setPolicyForm({
        policy_name: '',
        policy_type: 'security',
        enforcement_level: 'warn',
        policy_rules: {}
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'soc2': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'gdpr': return <Lock className="w-5 h-5 text-green-500" />;
      case 'hipaa': return <FileCheck className="w-5 h-5 text-purple-500" />;
      case 'pci': return <Award className="w-5 h-5 text-orange-500" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getPolicyTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4 text-red-500" />;
      case 'compliance': return <Scale className="w-4 h-4 text-blue-500" />;
      case 'access': return <Lock className="w-4 h-4 text-green-500" />;
      case 'update_approval': return <CheckCircle className="w-4 h-4 text-orange-500" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'final': return 'default';
      case 'submitted': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getEnforcementBadgeVariant = (level: string) => {
    switch (level) {
      case 'enforce': return 'destructive';
      case 'warn': return 'secondary';
      case 'audit': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Compliance Management</h1>
            <p className="text-muted-foreground text-lg">
              Generate compliance reports and manage governance policies
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <h3 className="text-2xl font-bold">{overview.totalReports}</h3>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Reports</p>
                <h3 className="text-2xl font-bold">{overview.recentReports}</h3>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <h3 className="text-2xl font-bold">{overview.activePolicies}</h3>
              </div>
              <Scale className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Score</p>
                <h3 className="text-2xl font-bold">98%</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
          <TabsTrigger value="policies">Governance Policies</TabsTrigger>
          <TabsTrigger value="overview">Compliance Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Compliance Reports
              </CardTitle>
              <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Compliance Report</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reportType">Report Type</Label>
                      <Select 
                        value={reportForm.report_type} 
                        onValueChange={(value) => setReportForm(prev => ({ ...prev, report_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="soc2">SOC 2</SelectItem>
                          <SelectItem value="gdpr">GDPR</SelectItem>
                          <SelectItem value="hipaa">HIPAA</SelectItem>
                          <SelectItem value="pci">PCI DSS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="periodStart">Period Start</Label>
                        <Input
                          id="periodStart"
                          type="date"
                          value={reportForm.period_start}
                          onChange={(e) => setReportForm(prev => ({ ...prev, period_start: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="periodEnd">Period End</Label>
                        <Input
                          id="periodEnd"
                          type="date"
                          value={reportForm.period_end}
                          onChange={(e) => setReportForm(prev => ({ ...prev, period_end: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleGenerateReport}>
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      {getReportTypeIcon(report.report_type)}
                      <div>
                        <h4 className="font-medium">
                          {report.report_type.replace('_', ' ').toUpperCase()} Report
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {report.period_start} to {report.period_end} • 
                          Generated {format(new Date(report.generated_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(report.status)}>
                        {report.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportReport(report.id)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteReport(report.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Compliance Reports</h3>
                    <p className="text-muted-foreground">
                      Generate your first compliance report to get started.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Governance Policies
              </CardTitle>
              <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Policy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Governance Policy</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="policyName">Policy Name</Label>
                      <Input
                        id="policyName"
                        value={policyForm.policy_name}
                        onChange={(e) => setPolicyForm(prev => ({ ...prev, policy_name: e.target.value }))}
                        placeholder="Security Access Policy"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="policyType">Policy Type</Label>
                        <Select 
                          value={policyForm.policy_type} 
                          onValueChange={(value) => setPolicyForm(prev => ({ ...prev, policy_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="access">Access Control</SelectItem>
                            <SelectItem value="update_approval">Update Approval</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="enforcementLevel">Enforcement Level</Label>
                        <Select 
                          value={policyForm.enforcement_level} 
                          onValueChange={(value) => setPolicyForm(prev => ({ ...prev, enforcement_level: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enforce">Enforce</SelectItem>
                            <SelectItem value="warn">Warn</SelectItem>
                            <SelectItem value="audit">Audit Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePolicy}>
                        Create Policy
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      {getPolicyTypeIcon(policy.policy_type)}
                      <div>
                        <h4 className="font-medium">{policy.policy_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {policy.policy_type.replace('_', ' ')} • 
                          Created {format(new Date(policy.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getEnforcementBadgeVariant(policy.enforcement_level)}>
                        {policy.enforcement_level}
                      </Badge>
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteGovernancePolicy(policy.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {policies.length === 0 && (
                  <div className="text-center py-8">
                    <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Governance Policies</h3>
                    <p className="text-muted-foreground">
                      Create governance policies to enforce compliance across your organization.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Compliance Framework Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">SOC 2 Type II</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={95} className="w-20 h-2" />
                      <span className="text-sm font-medium">95%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-green-500" />
                      <span className="text-sm">GDPR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={88} className="w-20 h-2" />
                      <span className="text-sm font-medium">88%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">HIPAA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20 h-2" />
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">PCI DSS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Policy Enforcement Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Security Policies</span>
                    <Badge variant="default">12 Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Access Control Policies</span>
                    <Badge variant="default">8 Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Update Approval Policies</span>
                    <Badge variant="secondary">3 Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compliance Policies</span>
                    <Badge variant="default">15 Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise col-span-full">
              <CardHeader>
                <CardTitle>Recent Compliance Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">SOC 2 audit completed successfully</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Security policy violation detected</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <Activity className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">GDPR compliance report generated</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
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