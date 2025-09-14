import React, { useState, useMemo } from 'react';
import { useEnhancedServers } from '@/hooks/useEnhancedServers';
import { useUpdateJobs } from '@/hooks/useUpdateJobs';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import { useVCenterService } from '@/hooks/useVCenterService';
import { useFirmwarePackages } from '@/hooks/useFirmwarePackages';
import { useMaintenanceWindows } from '@/hooks/useMaintenanceWindows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Server, Shield, AlertTriangle, Activity, MapPin, Clock,
  TrendingUp, Database, CheckCircle, XCircle, Calendar,
  HardDrive, Cloud, Users, DollarSign, Archive, Search,
  PlayCircle, Zap, RefreshCw, Settings, Bell, Eye
} from 'lucide-react';

export function EnterpriseDashboard() {
  const { servers, datacenters, eolAlerts, loading: serversLoading } = useEnhancedServers();
  const { jobs, loading: jobsLoading } = useUpdateJobs();
  const { events, criticalEvents, warningEvents, loading: eventsLoading } = useSystemEvents();
  const { vcenters, clusters } = useVCenterService();
  const { packages } = useFirmwarePackages();
  const { windows: maintenanceWindows } = useMaintenanceWindows();
  const { toast } = useToast();

  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('all');

  // 1. Fleet Overview Stats
  const fleetStats = useMemo(() => {
    const total = servers.length;
    const online = servers.filter(s => s.status === 'online').length;
    const offline = servers.filter(s => s.status === 'offline').length;
    const updating = servers.filter(s => s.status === 'updating').length;
    const maintenance = servers.filter(s => s.status === 'maintenance').length;
    const healthScore = total > 0 ? Math.round((online / total) * 100) : 0;

    return { total, online, offline, updating, maintenance, healthScore };
  }, [servers]);

  // 2. Security Dashboard
  const securityStats = useMemo(() => {
    const criticalAlerts = eolAlerts.filter(a => a.severity === 'critical').length;
    const highRisk = servers.filter(s => s.security_risk_level === 'high').length;
    const eolServers = servers.filter(s => s.os_eol_date && new Date(s.os_eol_date) <= new Date()).length;
    const securityScore = servers.length > 0 ? Math.round(((servers.length - highRisk - eolServers) / servers.length) * 100) : 100;

    return { criticalAlerts, highRisk, eolServers, securityScore };
  }, [eolAlerts, servers]);

  // 3. Update Status
  const updateStats = useMemo(() => {
    const pending = jobs.filter(j => j.status === 'pending').length;
    const running = jobs.filter(j => j.status === 'running').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const successRate = jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0;

    return { pending, running, completed, failed, successRate };
  }, [jobs]);

  // 4. Firmware Compliance
  const firmwareStats = useMemo(() => {
    const totalPackages = packages.length;
    const criticalPackages = packages.filter(p => p.firmware_type === 'bios' || p.firmware_type === 'idrac').length;
    const complianceRate = servers.length > 0 ? Math.round(((servers.length - updateStats.pending - updateStats.failed) / servers.length) * 100) : 100;

    return { totalPackages, criticalPackages, complianceRate };
  }, [packages, servers.length, updateStats]);

  // 5. Datacenter Health
  const datacenterStats = useMemo(() => {
    return datacenters.map(dc => {
      const dcServers = servers.filter(s => s.datacenter === dc.name);
      const onlineCount = dcServers.filter(s => s.status === 'online').length;
      const totalCount = dcServers.length;
      const healthScore = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

      return {
        ...dc,
        serverCount: totalCount,
        onlineCount,
        healthScore,
        status: healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'warning' : 'critical'
      };
    });
  }, [datacenters, servers]);

  // 6. Recent Activity Feed
  const recentActivities = useMemo(() => {
    const activities = [
      ...events.slice(0, 5).map(e => ({
        id: e.id,
        type: 'event',
        title: e.title,
        description: e.description,
        severity: e.severity,
        timestamp: e.created_at
      })),
      ...jobs.slice(0, 5).map(j => ({
        id: j.id,
        type: 'job',
        title: `Update Job ${j.status}`,
        description: `${j.server?.hostname} - ${j.firmware_package?.name}`,
        severity: j.status === 'failed' ? 'error' : j.status === 'completed' ? 'success' : 'info',
        timestamp: j.updated_at
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, 10);
  }, [events, jobs]);

  // 7. Performance Metrics (simulated)
  const performanceStats = {
    avgResponseTime: '142ms',
    uptime: '99.7%',
    throughput: '1,247 ops/min',
    errorRate: '0.3%'
  };

  // 8. Maintenance Windows
  const maintenanceStats = useMemo(() => {
    const upcoming = maintenanceWindows.filter(w => 
      new Date(w.scheduled_date) > new Date() && w.status === 'scheduled'
    ).length;
    const active = maintenanceWindows.filter(w => w.status === 'active').length;

    return { upcoming, active, total: maintenanceWindows.length };
  }, [maintenanceWindows]);

  // 9. Capacity Planning (simulated)
  const capacityStats = {
    cpuUtilization: 68,
    memoryUtilization: 72,
    storageUtilization: 45,
    networkUtilization: 23
  };

  // 10. Alert Summary
  const alertStats = useMemo(() => {
    const critical = criticalEvents.length;
    const warning = warningEvents.length;
    const info = events.filter(e => e.severity === 'info' && !e.acknowledged).length;

    return { critical, warning, info, total: critical + warning + info };
  }, [criticalEvents, warningEvents, events]);

  // 11. Geographic Distribution
  const geoStats = useMemo(() => {
    const siteGroups = servers.reduce((acc, server) => {
      const site = server.datacenter || 'Unknown';
      if (!acc[site]) acc[site] = { total: 0, online: 0 };
      acc[site].total++;
      if (server.status === 'online') acc[site].online++;
      return acc;
    }, {} as Record<string, { total: number; online: number }>);

    return Object.entries(siteGroups).map(([site, stats]) => ({
      site,
      ...stats,
      healthScore: Math.round((stats.online / stats.total) * 100)
    }));
  }, [servers]);

  // 12. OS Distribution
  const osStats = useMemo(() => {
    const osGroups = servers.reduce((acc, server) => {
      const os = server.operating_system || 'Unknown';
      if (!acc[os]) acc[os] = { total: 0, eol: 0 };
      acc[os].total++;
      if (server.os_eol_date && new Date(server.os_eol_date) <= new Date()) {
        acc[os].eol++;
      }
      return acc;
    }, {} as Record<string, { total: number; eol: number }>);

    return Object.entries(osGroups).map(([os, stats]) => ({
      os,
      ...stats,
      eolRate: Math.round((stats.eol / stats.total) * 100)
    }));
  }, [servers]);

  // 18. vCenter Integration Status
  const vcenterStats = useMemo(() => {
    const totalVCenters = vcenters.length;
    const totalClusters = clusters.length;
    const totalHosts = clusters.reduce((sum, c) => sum + c.total_hosts, 0);
    const activeHosts = clusters.reduce((sum, c) => sum + c.active_hosts, 0);

    return { totalVCenters, totalClusters, totalHosts, activeHosts };
  }, [vcenters, clusters]);

  const QuickActionButton = ({ icon: Icon, label, onClick, variant = 'outline' }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  }) => (
    <Button variant={variant} onClick={onClick} className="w-full justify-start gap-2">
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = 'primary',
    onClick 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down' | 'stable';
    color?: 'primary' | 'success' | 'warning' | 'error';
    onClick?: () => void;
  }) => (
    <Card className={`cursor-pointer transition-all hover:shadow-lg ${onClick ? 'hover:bg-accent/50' : ''}`} onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-${color}/10`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">
              {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (serversLoading || jobsLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading enterprise dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive infrastructure management and monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alertStats.critical > 0 && (
        <Card className="border-error bg-error/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-error" />
              <div className="flex-1">
                <p className="font-medium text-error">Critical Alerts Require Attention</p>
                <p className="text-sm text-muted-foreground">
                  {alertStats.critical} critical alerts detected across your infrastructure
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 1. Fleet Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Servers"
              value={fleetStats.total}
              subtitle={`${fleetStats.online} online`}
              icon={Server}
              trend="stable"
              color="primary"
            />
            <StatCard
              title="Health Score"
              value={`${fleetStats.healthScore}%`}
              subtitle="Fleet availability"
              icon={Activity}
              trend={fleetStats.healthScore >= 95 ? 'up' : fleetStats.healthScore >= 85 ? 'stable' : 'down'}
              color={fleetStats.healthScore >= 95 ? 'success' : fleetStats.healthScore >= 85 ? 'warning' : 'error'}
            />
            <StatCard
              title="Active Updates"
              value={updateStats.running}
              subtitle={`${updateStats.pending} pending`}
              icon={RefreshCw}
              trend="stable"
              color="primary"
            />
            <StatCard
              title="Security Score"
              value={`${securityStats.securityScore}%`}
              subtitle={`${securityStats.criticalAlerts} critical alerts`}
              icon={Shield}
              trend={securityStats.securityScore >= 90 ? 'up' : 'down'}
              color={securityStats.securityScore >= 90 ? 'success' : securityStats.securityScore >= 70 ? 'warning' : 'error'}
            />
          </div>

          {/* 5. Datacenter Health Map & 11. Geographic Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Datacenter Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {datacenterStats.map((dc) => (
                    <div key={dc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${
                          dc.status === 'healthy' ? 'bg-success' : 
                          dc.status === 'warning' ? 'bg-warning' : 'bg-error'
                        }`} />
                        <div>
                          <p className="font-medium">{dc.name}</p>
                          <p className="text-sm text-muted-foreground">{dc.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{dc.onlineCount}/{dc.serverCount}</p>
                        <p className="text-sm text-muted-foreground">{dc.healthScore}% healthy</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 6. Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                        <div className={`h-2 w-2 rounded-full mt-2 ${
                          activity.severity === 'error' ? 'bg-error' :
                          activity.severity === 'warning' ? 'bg-warning' :
                          activity.severity === 'success' ? 'bg-success' : 'bg-primary'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 12. OS Distribution & 18. vCenter Integration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  OS Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {osStats.map((os) => (
                    <div key={os.os} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{os.os}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{os.total} servers</span>
                          {os.eol > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {os.eol} EOL
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={(os.total / servers.length) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  vCenter Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{vcenterStats.totalVCenters}</p>
                    <p className="text-sm text-muted-foreground">vCenter Servers</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{vcenterStats.totalClusters}</p>
                    <p className="text-sm text-muted-foreground">Clusters</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{vcenterStats.activeHosts}</p>
                    <p className="text-sm text-muted-foreground">Active Hosts</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{Math.round((vcenterStats.activeHosts / vcenterStats.totalHosts) * 100)}%</p>
                    <p className="text-sm text-muted-foreground">Availability</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 20. Quick Actions Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickActionButton
                  icon={Search}
                  label="Discover Servers"
                  onClick={() => toast({ title: "Feature", description: "Server discovery initiated" })}
                />
                <QuickActionButton
                  icon={PlayCircle}
                  label="Schedule Command"
                  onClick={() => toast({ title: "Feature", description: "Command scheduler opened" })}
                />
                <QuickActionButton
                  icon={Bell}
                  label="View Alerts"
                  onClick={() => toast({ title: "Feature", description: "Alert center opened" })}
                />
                <QuickActionButton
                  icon={Calendar}
                  label="Maintenance Windows"
                  onClick={() => toast({ title: "Feature", description: "Maintenance scheduler opened" })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          {/* 3. Update Status & 4. Firmware Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Update Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xl font-bold text-warning">{updateStats.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xl font-bold text-primary">{updateStats.running}</p>
                      <p className="text-sm text-muted-foreground">Running</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate</span>
                      <span className="text-sm font-medium">{updateStats.successRate}%</span>
                    </div>
                    <Progress value={updateStats.successRate} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-success">Completed: {updateStats.completed}</span>
                    <span className="text-error">Failed: {updateStats.failed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Firmware Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{firmwareStats.complianceRate}%</p>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                  </div>
                  <Progress value={firmwareStats.complianceRate} />
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-2 rounded bg-muted/30">
                      <p className="font-medium">{firmwareStats.totalPackages}</p>
                      <p className="text-xs text-muted-foreground">Total Packages</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <p className="font-medium text-error">{firmwareStats.criticalPackages}</p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7. Performance Metrics & 8. Maintenance Windows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="font-bold">{performanceStats.avgResponseTime}</p>
                    <p className="text-xs text-muted-foreground">Avg Response</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="font-bold text-success">{performanceStats.uptime}</p>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="font-bold">{performanceStats.throughput}</p>
                    <p className="text-xs text-muted-foreground">Throughput</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="font-bold text-warning">{performanceStats.errorRate}</p>
                    <p className="text-xs text-muted-foreground">Error Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Maintenance Windows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning">{maintenanceStats.upcoming}</p>
                      <p className="text-sm text-muted-foreground">Upcoming</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{maintenanceStats.active}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{maintenanceStats.total}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 9. Capacity Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Capacity Planning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {Object.entries(capacityStats).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm capitalize">{key.replace('Utilization', '')}</span>
                      <span className="text-sm font-medium">{value}%</span>
                    </div>
                    <Progress value={value} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {value > 80 ? 'High utilization' : value > 60 ? 'Moderate usage' : 'Low usage'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* 2. Security Dashboard & 10. Alert Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{securityStats.securityScore}%</p>
                    <p className="text-sm text-muted-foreground">Security Score</p>
                  </div>
                  <Progress value={securityStats.securityScore} />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-error/10">
                      <p className="font-bold text-error">{securityStats.criticalAlerts}</p>
                      <p className="text-xs">Critical</p>
                    </div>
                    <div className="p-2 rounded bg-warning/10">
                      <p className="font-bold text-warning">{securityStats.highRisk}</p>
                      <p className="text-xs">High Risk</p>
                    </div>
                    <div className="p-2 rounded bg-error/10">
                      <p className="font-bold text-error">{securityStats.eolServers}</p>
                      <p className="text-xs">EOL Servers</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-error/10">
                      <p className="text-xl font-bold text-error">{alertStats.critical}</p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-warning/10">
                      <p className="text-xl font-bold text-warning">{alertStats.warning}</p>
                      <p className="text-xs text-muted-foreground">Warning</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-xl font-bold text-primary">{alertStats.info}</p>
                      <p className="text-xs text-muted-foreground">Info</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View All Alerts ({alertStats.total})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics placeholder - would include charts and detailed metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed analytics and reporting features would be implemented here, including:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-1 text-sm text-muted-foreground">
                <li>Historical performance trends</li>
                <li>Cost analysis and optimization</li>
                <li>Predictive maintenance insights</li>
                <li>Compliance reporting</li>
                <li>Custom dashboards and widgets</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}