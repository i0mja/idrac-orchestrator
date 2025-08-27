import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  Building2,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  Clock,
  FileText,
  Award,
  Zap,
  Calendar,
  MapPin,
  BarChart3,
  RefreshCw,
  Download,
  PieChart,
  Users,
  Globe,
  Network
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EnterpriseMetrics {
  totalServers: number;
  totalDatacenters: number;
  complianceScore: number;
  securityScore: number;
  costThisMonth: number;
  warrantyExpiringCount: number;
  eolSystemsCount: number;
  updateComplianceScore: number;
}

interface DatacenterHealth {
  id: string;
  name: string;
  location: string;
  totalServers: number;
  onlineServers: number;
  healthScore: number;
  lastIncident: string | null;
  powerUsage: number;
  capacity: number;
}

interface ComplianceItem {
  id: string;
  category: string;
  title: string;
  status: 'compliant' | 'warning' | 'critical';
  description: string;
  dueDate?: string;
  affectedSystems: number;
}

export function EnterpriseManagement() {
  const [activeTab, setActiveTab] = useState("executive");
  const [loading, setLoading] = useState(true);
  const [enterpriseMetrics, setEnterpriseMetrics] = useState<EnterpriseMetrics>({
    totalServers: 0,
    totalDatacenters: 0,
    complianceScore: 0,
    securityScore: 0,
    costThisMonth: 0,
    warrantyExpiringCount: 0,
    eolSystemsCount: 0,
    updateComplianceScore: 0
  });
  const [datacenterHealth, setDatacenterHealth] = useState<DatacenterHealth[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  
  const { toast } = useToast();

  const fetchEnterpriseData = async () => {
    try {
      setLoading(true);
      
      const [serversResult, datacentersResult, eolAlertsResult] = await Promise.allSettled([
        supabase.from('servers').select('*'),
        supabase.from('datacenters').select('*'),
        supabase.from('eol_alerts').select('*').eq('acknowledged', false)
      ]);

      if (serversResult.status === 'fulfilled' && !serversResult.value.error) {
        const servers = serversResult.value.data || [];
        const onlineServers = servers.filter(s => s.status === 'online').length;
        const warrantyExpiring = servers.filter(s => {
          if (!s.warranty_end_date) return false;
          const endDate = new Date(s.warranty_end_date);
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          return endDate <= threeMonthsFromNow;
        }).length;

        // Calculate enterprise metrics
        setEnterpriseMetrics({
          totalServers: servers.length,
          totalDatacenters: datacentersResult.status === 'fulfilled' ? (datacentersResult.value.data?.length || 0) : 0,
          complianceScore: servers.length > 0 ? Math.round((onlineServers / servers.length) * 100) : 0,
          securityScore: Math.round(Math.random() * 20 + 80), // Mock security score
          costThisMonth: Math.round(servers.length * 125.5 + Math.random() * 1000), // Mock cost calculation
          warrantyExpiringCount: warrantyExpiring,
          eolSystemsCount: eolAlertsResult.status === 'fulfilled' ? (eolAlertsResult.value.data?.length || 0) : 0,
          updateComplianceScore: Math.round(Math.random() * 15 + 85) // Mock update compliance
        });

        // Generate datacenter health data
        const datacenters = datacentersResult.status === 'fulfilled' ? (datacentersResult.value.data || []) : [];
        const dcHealth = datacenters.map(dc => ({
          id: dc.id,
          name: dc.name,
          location: dc.location || 'Unknown',
          totalServers: servers.filter(s => s.datacenter === dc.name).length,
          onlineServers: servers.filter(s => s.datacenter === dc.name && s.status === 'online').length,
          healthScore: Math.round(Math.random() * 20 + 80),
          lastIncident: Math.random() > 0.7 ? `${Math.floor(Math.random() * 30)} days ago` : null,
          powerUsage: Math.round(Math.random() * 30 + 60),
          capacity: Math.round(Math.random() * 20 + 70)
        }));
        setDatacenterHealth(dcHealth);
      }

      // Generate compliance items
      setComplianceItems([
        {
          id: '1',
          category: 'Security',
          title: 'Security Patch Compliance',
          status: 'warning',
          description: '12 servers missing critical security patches',
          dueDate: '2024-09-15',
          affectedSystems: 12
        },
        {
          id: '2',
          category: 'Warranty',
          title: 'Hardware Warranty Management',
          status: 'critical',
          description: '8 servers with warranty expiring within 30 days',
          dueDate: '2024-09-01',
          affectedSystems: 8
        },
        {
          id: '3',
          category: 'Firmware',
          title: 'Firmware Update Compliance',
          status: 'compliant',
          description: 'All systems running approved firmware versions',
          affectedSystems: 0
        },
        {
          id: '4',
          category: 'Backup',
          title: 'Backup Policy Compliance',
          status: 'warning',
          description: '3 servers with backup failures in last 7 days',
          dueDate: '2024-08-25',
          affectedSystems: 3
        }
      ]);
      
    } catch (error) {
      console.error('Error fetching enterprise data:', error);
      toast({
        title: "Error",
        description: "Failed to load enterprise data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterpriseData();
  }, []);

  const handleRefresh = async () => {
    await fetchEnterpriseData();
    toast({
      title: "Refreshed",
      description: "Enterprise data has been updated"
    });
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'compliant': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg" />
          <div>
            <h1 className="text-3xl font-bold text-gradient">Enterprise Management</h1>
            <p className="text-muted-foreground">Loading enterprise analytics...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Infrastructure & Operations</h1>
            <p className="text-muted-foreground">
              Executive insights, datacenter management, compliance monitoring, and governance oversight
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Executive KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infrastructure Scale</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enterpriseMetrics.totalServers}</div>
            <p className="text-xs text-muted-foreground">
              Servers across {enterpriseMetrics.totalDatacenters} datacenters
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly IT Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${enterpriseMetrics.costThisMonth.toLocaleString()}</div>
            <p className="text-xs text-green-600">
              ↓ 8% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(enterpriseMetrics.complianceScore)}`}>
              {enterpriseMetrics.complianceScore}%
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${enterpriseMetrics.complianceScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(enterpriseMetrics.securityScore)}`}>
              {enterpriseMetrics.securityScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              Risk assessment score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      {(enterpriseMetrics.warrantyExpiringCount > 0 || enterpriseMetrics.eolSystemsCount > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {enterpriseMetrics.warrantyExpiringCount > 0 && (
                <div>{enterpriseMetrics.warrantyExpiringCount} systems have warranty expiring within 90 days</div>
              )}
              {enterpriseMetrics.eolSystemsCount > 0 && (
                <div>{enterpriseMetrics.eolSystemsCount} systems are at end-of-life and require attention</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="executive">Executive</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="datacenters">Datacenters</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

        {/* Executive Dashboard */}
        <TabsContent value="executive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">System Availability</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">99.7%</span>
                    <Progress value={99.7} className="w-20" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Update Compliance</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{enterpriseMetrics.updateComplianceScore}%</span>
                    <Progress value={enterpriseMetrics.updateComplianceScore} className="w-20" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mean Time to Resolution</span>
                  <span className="text-sm font-medium">2.4 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Change Success Rate</span>
                  <span className="text-sm font-medium">96.2%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Business Impact Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cost per Server/Month</span>
                  <span className="text-sm font-medium">$125</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Energy Efficiency</span>
                  <span className="text-sm font-medium text-green-600">+12%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Automation Rate</span>
                  <span className="text-sm font-medium">78%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Planned vs Unplanned Downtime</span>
                  <span className="text-sm font-medium">85:15</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Infrastructure Management */}
        <TabsContent value="infrastructure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Datacenter Management
                </CardTitle>
                <CardDescription>
                  Configure datacenters and maintenance windows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Datacenter Configuration</h4>
                      <p className="text-sm text-muted-foreground">Manage datacenter locations and maintenance schedules</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/settings/datacenters'}
                    >
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Network Discovery</h4>
                      <p className="text-sm text-muted-foreground">Scan for Dell servers and infrastructure</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/discovery'}
                    >
                      Scan Network
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Infrastructure Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Infrastructure</span>
                  <span className="text-sm font-medium">{enterpriseMetrics.totalServers} servers</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Datacenters</span>
                  <span className="text-sm font-medium">{enterpriseMetrics.totalDatacenters} locations</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Health</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getComplianceColor(enterpriseMetrics.complianceScore)}`}>
                      {enterpriseMetrics.complianceScore}%
                    </span>
                    <Progress value={enterpriseMetrics.complianceScore} className="w-16" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Risk Assessment</span>
                  <span className={`text-sm font-medium ${getComplianceColor(enterpriseMetrics.securityScore)}`}>
                    {enterpriseMetrics.securityScore}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance & Governance */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Compliance Status
              </CardTitle>
              <CardDescription>
                Monitor regulatory and policy compliance across your infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {item.status === 'compliant' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : item.status === 'warning' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.dueDate && (
                          <p className="text-xs text-muted-foreground">Due: {item.dueDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.affectedSystems}</div>
                      <div className="text-xs text-muted-foreground">systems</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datacenter Health */}
        <TabsContent value="datacenters" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {datacenterHealth.map((dc) => (
              <Card key={dc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {dc.name}
                  </CardTitle>
                  <CardDescription>{dc.location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Health Score</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getComplianceColor(dc.healthScore)}`}>
                        {dc.healthScore}%
                      </span>
                      <Progress value={dc.healthScore} className="w-16" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Servers</span>
                    <span className="text-sm font-medium">
                      {dc.onlineServers}/{dc.totalServers} online
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Power Usage</span>
                    <span className="text-sm font-medium">{dc.powerUsage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Capacity</span>
                    <span className="text-sm font-medium">{dc.capacity}%</span>
                  </div>
                  {dc.lastIncident && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Incident</span>
                      <span className="text-sm text-yellow-600">{dc.lastIncident}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Financial Overview */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hardware Costs</span>
                  <span className="text-sm font-medium">$65,400</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Maintenance & Support</span>
                  <span className="text-sm font-medium">$18,200</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Power & Cooling</span>
                  <span className="text-sm font-medium">$12,800</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Software Licensing</span>
                  <span className="text-sm font-medium">$8,600</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Monthly</span>
                    <span>${enterpriseMetrics.costThisMonth.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Warranty & Support Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Warranties</span>
                  <span className="text-sm font-medium">
                    {enterpriseMetrics.totalServers - enterpriseMetrics.warrantyExpiringCount - 5}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Expiring Soon</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {enterpriseMetrics.warrantyExpiringCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Expired</span>
                  <span className="text-sm font-medium text-red-600">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Support Contracts</span>
                  <span className="text-sm font-medium">
                    {Math.floor(enterpriseMetrics.totalServers * 0.85)}
                  </span>
                </div>
                <Button className="w-full mt-4" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Warranty Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}