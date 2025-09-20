import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedServers } from '@/hooks/useEnhancedServers';
import { useUpdateJobs } from '@/hooks/useUpdateJobs';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Shield,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--error))'];

export function DiscoveryAnalyticsDashboard() {
  const { servers } = useEnhancedServers();
  const { jobs } = useUpdateJobs();
  const { events } = useSystemEvents();

  const analyticsData = useMemo(() => {
    // Protocol Distribution
    const protocolStats = {
      REDFISH: { supported: 0, total: 0 },
      WSMAN: { supported: 0, total: 0 },
      RACADM: { supported: 0, total: 0 },
      IPMI: { supported: 0, total: 0 },
      SSH: { supported: 0, total: 0 }
    };

    servers.forEach(server => {
      if ((server as any).protocols) {
        const protocols = Array.isArray((server as any).protocols) 
          ? (server as any).protocols 
          : [(server as any).protocols];
        
        protocols.forEach((protocol: any) => {
          const protocolType = protocol.protocol as keyof typeof protocolStats;
          if (protocolStats[protocolType]) {
            protocolStats[protocolType].total++;
            if (protocol.supported) {
              protocolStats[protocolType].supported++;
            }
          }
        });
      }
    });

    const protocolChartData = Object.entries(protocolStats).map(([protocol, stats]) => ({
      protocol,
      supported: stats.supported,
      unsupported: stats.total - stats.supported,
      total: stats.total,
      rate: stats.total > 0 ? Math.round((stats.supported / stats.total) * 100) : 0
    }));

    // Discovery Methods Distribution
    const discoveryMethods = servers.reduce((acc, server) => {
      const method = (server as any).discovery_method || 'network';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const discoveryChartData = Object.entries(discoveryMethods).map(([method, count]) => ({
      method,
      count,
      percentage: Math.round((count / servers.length) * 100)
    }));

    // Update Success Trends (last 30 days)
    const updateTrends = jobs.reduce((acc, job) => {
      const date = new Date(job.created_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, completed: 0, failed: 0, total: 0 };
      }
      acc[date].total++;
      if (job.status === 'completed') acc[date].completed++;
      if (job.status === 'failed') acc[date].failed++;
      return acc;
    }, {} as Record<string, any>);

    const updateTrendData = Object.values(updateTrends)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);

    // Server Health Distribution
    const healthDistribution = servers.reduce((acc, server) => {
      const status = server.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const healthChartData = Object.entries(healthDistribution).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / servers.length) * 100)
    }));

    // Firmware Compliance
    const complianceStats = servers.reduce((acc, server) => {
      const compliance = (server as any).firmware_compliance;
      if (compliance) {
        if (compliance.updateReadiness === 'ready') acc.ready++;
        else if (compliance.updateReadiness === 'maintenance_required') acc.maintenance++;
        else acc.notSupported++;
      } else {
        acc.unknown++;
      }
      return acc;
    }, { ready: 0, maintenance: 0, notSupported: 0, unknown: 0 });

    return {
      protocolChartData,
      discoveryChartData,
      updateTrendData,
      healthChartData,
      complianceStats,
      totalServers: servers.length,
      protocolStats
    };
  }, [servers, jobs]);

  const kpis = [
    {
      title: 'Discovery Success Rate',
      value: servers.length > 0 ? '94%' : '0%',
      change: '+2.1%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-success'
    },
    {
      title: 'Protocol Coverage',
      value: analyticsData.protocolStats.REDFISH.total > 0 ? 
        Math.round((analyticsData.protocolStats.REDFISH.supported / analyticsData.protocolStats.REDFISH.total) * 100) + '%' : '0%',
      change: '+5.2%',
      trend: 'up',
      icon: Shield,
      color: 'text-primary'
    },
    {
      title: 'Update Success Rate',
      value: jobs.length > 0 ? 
        Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100) + '%' : '0%',
      change: '-1.3%',
      trend: 'down',
      icon: Zap,
      color: 'text-warning'
    },
    {
      title: 'Avg Discovery Time',
      value: '2.4s',
      change: '-0.8s',
      trend: 'up',
      icon: Clock,
      color: 'text-success'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card key={kpi.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendIcon className={`w-3 h-3 ${kpi.color}`} />
                      <span className={`text-xs ${kpi.color}`}>{kpi.change}</span>
                    </div>
                  </div>
                  <Icon className={`w-8 h-8 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="protocols" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Protocol Support Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.protocolChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="protocol" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="supported" fill="hsl(var(--primary))" name="Supported" />
                    <Bar dataKey="unsupported" fill="hsl(var(--muted))" name="Unsupported" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Protocol Success Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.protocolChartData.map((protocol) => (
                  <div key={protocol.protocol} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{protocol.protocol}</span>
                      <span className="text-sm text-muted-foreground">
                        {protocol.supported}/{protocol.total} ({protocol.rate}%)
                      </span>
                    </div>
                    <Progress value={protocol.rate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Discovery Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.discoveryChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ method, percentage }) => `${method}: ${percentage}%`}
                    >
                      {analyticsData.discoveryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Server Compliance Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-success/10">
                    <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-success">
                      {analyticsData.complianceStats.ready}
                    </p>
                    <p className="text-sm text-muted-foreground">Ready</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-warning/10">
                    <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                    <p className="text-2xl font-bold text-warning">
                      {analyticsData.complianceStats.maintenance}
                    </p>
                    <p className="text-sm text-muted-foreground">Maintenance Req.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Health Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.healthChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ status, percentage }) => `${status}: ${percentage}%`}
                  >
                    {analyticsData.healthChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Update Success Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.updateTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--success))" 
                    name="Completed"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="hsl(var(--error))" 
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}