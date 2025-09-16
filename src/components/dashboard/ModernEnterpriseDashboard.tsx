import React, { useState, useMemo, useCallback } from 'react';
import { useDashboardActions } from './_widgetActions';
import { WIDGET_BEHAVIORS } from './DashboardConfig';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useEnhancedServers } from '@/hooks/useEnhancedServers';
import { useUpdateJobs } from '@/hooks/useUpdateJobs';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import { useVCenterService } from '@/hooks/useVCenterService';
import { useFirmwarePackages } from '@/hooks/useFirmwarePackages';
import { useMaintenanceWindows } from '@/hooks/useMaintenanceWindows';
import DashboardConfig, { type DashboardWidget, DEFAULT_WIDGETS } from './DashboardConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Server, Shield, AlertTriangle, Activity, MapPin, Clock,
  TrendingUp, Database, CheckCircle, XCircle, Calendar,
  HardDrive, Cloud, Users, DollarSign, Archive, Search,
  PlayCircle, Zap, RefreshCw, Settings, Bell, Eye, GripVertical,
  Sparkles, BarChart3, PlusCircle, ArrowRight
} from 'lucide-react';

export function ModernEnterpriseDashboard() {
  const { doAction } = useDashboardActions();
  const { servers, datacenters, eolAlerts, loading: serversLoading, refresh: refreshServers } = useEnhancedServers();
  const { jobs, loading: jobsLoading } = useUpdateJobs();
  const { events, criticalEvents, warningEvents, loading: eventsLoading } = useSystemEvents();
  const { vcenters, clusters } = useVCenterService();
  const { packages } = useFirmwarePackages();
  const { windows: maintenanceWindows } = useMaintenanceWindows();
  const { toast } = useToast();

  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<DashboardWidget>[];
        // Merge stored widget preferences with defaults to preserve icons and metadata
        return DEFAULT_WIDGETS.map((defaults) => {
          const stored = parsed.find((w) => w.id === defaults.id);
          return { ...defaults, ...stored, icon: defaults.icon };
        });
      } catch {
        return DEFAULT_WIDGETS;
      }
    }
    return DEFAULT_WIDGETS;
  });
  const [configOpen, setConfigOpen] = useState(false);

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  // Save to localStorage when widgets change
  const handleUpdateWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    // Store only serializable widget settings to localStorage
    const storageWidgets = newWidgets.map(({ id, enabled, order, size }) => ({
      id,
      enabled,
      order,
      size,
    }));
    localStorage.setItem('dashboard-widgets', JSON.stringify(storageWidgets));
    toast({
      title: "Dashboard Updated",
      description: "Your dashboard configuration has been saved.",
    });
  }, [toast]);

  // Drag and drop handler
  const handleOnDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(enabledWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedWidgets = widgets.map(widget => {
      const newOrder = items.findIndex(item => item.id === widget.id);
      return newOrder !== -1 ? { ...widget, order: newOrder } : widget;
    });

    handleUpdateWidgets(updatedWidgets);
  }, [enabledWidgets, widgets, handleUpdateWidgets]);

  // Stats calculations (same as before but extracted to useMemo for performance)
  const dashboardStats = useMemo(() => {
    const fleetStats = {
      total: servers.length,
      online: servers.filter(s => s.status === 'online').length,
      offline: servers.filter(s => s.status === 'offline').length,
      updating: servers.filter(s => s.status === 'updating').length,
      maintenance: servers.filter(s => s.status === 'maintenance').length,
      healthScore: 0
    };
    fleetStats.healthScore = fleetStats.total > 0 ? Math.round((fleetStats.online / fleetStats.total) * 100) : 0;

    const securityStats = {
      criticalAlerts: eolAlerts.filter(a => a.severity === 'critical').length,
      highRisk: servers.filter(s => s.security_risk_level === 'high').length,
      eolServers: servers.filter(s => s.os_eol_date && new Date(s.os_eol_date) <= new Date()).length,
      securityScore: 0
    };
    securityStats.securityScore = servers.length > 0 ? Math.round(((servers.length - securityStats.highRisk - securityStats.eolServers) / servers.length) * 100) : 100;

    const updateStats = {
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      successRate: 0
    };
    updateStats.successRate = jobs.length > 0 ? Math.round((updateStats.completed / jobs.length) * 100) : 0;

    const alertStats = {
      critical: criticalEvents.length,
      warning: warningEvents.length,
      info: events.filter(e => e.severity === 'info' && !e.acknowledged).length,
      total: 0
    };
    alertStats.total = alertStats.critical + alertStats.warning + alertStats.info;

    return { fleetStats, securityStats, updateStats, alertStats };
  }, [servers, eolAlerts, jobs, criticalEvents, warningEvents, events]);

  const quickActions = [
    {
      icon: Search,
      label: "Discover Servers",
      description: "Network discovery",
      action: { type: 'navigate' as const, path: '/discovery' },
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: PlayCircle,
      label: "Schedule Command",
      description: "Remote execution",
      action: { type: 'navigate' as const, path: '/scheduler' },
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Bell,
      label: "View Alerts",
      description: "System notifications",
      action: { type: 'navigate' as const, path: '/alerts' },
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Calendar,
      label: "Maintenance",
      description: "Schedule downtime",
      action: { type: 'navigate' as const, path: '/scheduler' },
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      label: "Analytics",
      description: "Performance insights",
      action: { type: 'navigate' as const, path: '/inventory' },
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: Settings,
      label: "System Config",
      description: "Global settings",
      action: { type: 'navigate' as const, path: '/settings' },
      gradient: "from-gray-500 to-slate-500"
    }
  ];

  const renderWidget = (widget: DashboardWidget) => {
    const { fleetStats, securityStats, updateStats, alertStats } = dashboardStats;
    const behavior = WIDGET_BEHAVIORS[widget.id];
    const headerProps = {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => doAction(behavior?.primaryAction)
    };
    
    const getWidgetClassName = () => {
      switch (widget.size) {
        case 'small': return 'col-span-1';
        case 'large': return 'col-span-2 row-span-2';
        default: return 'col-span-1';
      }
    };

    const WidgetIcon = widget.icon;

    switch (widget.id) {
      case 'fleet-overview':
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
                  <Server className="h-5 w-5 text-white" />
                </div>
                Fleet Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    {fleetStats.total}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Servers</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">{fleetStats.healthScore}%</p>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={fleetStats.healthScore} className="h-2" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="font-medium text-success">{fleetStats.online}</p>
                  <p className="text-muted-foreground">Online</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-error">{fleetStats.offline}</p>
                  <p className="text-muted-foreground">Offline</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-warning">{fleetStats.updating}</p>
                  <p className="text-muted-foreground">Updating</p>
                </div>
              </div>
            </CardContent>
            {behavior?.quickLinks && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {behavior.quickLinks.map((link) => (
                    <Button
                      key={link.label}
                      variant="link"
                      size="sm"
                      onClick={() => doAction(link.action)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );

      case 'security-dashboard':
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-orange-500/5 via-red-500/10 to-orange-500/5 border-orange-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                Security Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-success">{securityStats.securityScore}%</p>
                <p className="text-sm text-muted-foreground">Security Score</p>
              </div>
              <Progress value={securityStats.securityScore} className="h-2 mb-4" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-error/10">
                  <p className="font-bold text-error">{securityStats.criticalAlerts}</p>
                  <p className="text-muted-foreground">Critical</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{securityStats.highRisk}</p>
                  <p className="text-muted-foreground">High Risk</p>
                </div>
                <div className="text-center p-2 rounded bg-error/10">
                  <p className="font-bold text-error">{securityStats.eolServers}</p>
                  <p className="text-muted-foreground">EOL</p>
                </div>
              </div>
            </CardContent>
            {behavior?.quickLinks && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {behavior.quickLinks.map((link) => (
                    <Button
                      key={link.label}
                      variant="link"
                      size="sm"
                      onClick={() => doAction(link.action)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );

      case 'activity-feed':
        const recentActivities = [
          ...events.slice(0, 3).map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            severity: e.severity,
            timestamp: e.created_at
          })),
          ...jobs.slice(0, 2).map(j => ({
            id: j.id,
            title: `Update ${j.status}`,
            description: `${j.server?.hostname} - ${j.firmware_package?.name}`,
            severity: j.status === 'failed' ? 'error' : j.status === 'completed' ? 'success' : 'info',
            timestamp: j.updated_at
          }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 4);

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-blue-500/5 via-cyan-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`h-2 w-2 rounded-full mt-2 ${
                        activity.severity === 'error' ? 'bg-error' :
                        activity.severity === 'warning' ? 'bg-warning' :
                        activity.severity === 'success' ? 'bg-success' : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            {behavior?.quickLinks && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {behavior.quickLinks.map((link) => (
                    <Button
                      key={link.label}
                      variant="link"
                      size="sm"
                      onClick={() => doAction(link.action)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );

      case 'quick-actions':
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-purple-500/5 via-pink-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 4).map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => doAction(action.action)}
                      className="h-auto p-3 flex-col gap-1 hover:shadow-md transition-all"
                    >
                      <ActionIcon className="h-4 w-4" />
                      <span className="text-xs font-medium truncate w-full">{action.label.split(' ')[0]}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
            {behavior?.quickLinks && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {behavior.quickLinks.map((link) => (
                    <Button
                      key={link.label}
                      variant="link"
                      size="sm"
                      onClick={() => doAction(link.action)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );

      case 'update-status':
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-green-500/5 via-emerald-500/10 to-green-500/5 border-green-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                  <RefreshCw className="h-5 w-5 text-white" />
                </div>
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-success">{updateStats.successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <Progress value={updateStats.successRate} className="h-2 mb-4" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{updateStats.completed}</p>
                  <p className="text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="font-bold text-primary">{updateStats.running}</p>
                  <p className="text-muted-foreground">Running</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{updateStats.pending}</p>
                  <p className="text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-2 rounded bg-error/10">
                  <p className="font-bold text-error">{updateStats.failed}</p>
                  <p className="text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'datacenter-health':
        const datacenterStats = datacenters.reduce((acc, dc) => {
          const dcServers = servers.filter(s => s.datacenter === dc.name);
          const online = dcServers.filter(s => s.status === 'online').length;
          acc[dc.name] = {
            total: dcServers.length,
            online,
            health: dcServers.length > 0 ? Math.round((online / dcServers.length) * 100) : 0
          };
          return acc;
        }, {} as Record<string, { total: number; online: number; health: number }>);

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-cyan-500/5 via-blue-500/10 to-cyan-500/5 border-cyan-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                Datacenter Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {Object.entries(datacenterStats).slice(0, 4).map(([name, stats]) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{name || 'Default'}</p>
                        <p className="text-xs text-muted-foreground">{stats.online}/{stats.total} servers</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${stats.health >= 90 ? 'text-success' : stats.health >= 70 ? 'text-warning' : 'text-error'}`}>
                          {stats.health}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'firmware-compliance':
        const complianceStats = {
          total: packages.length,
          upToDate: servers.filter(s => s.last_updated && 
            new Date(s.last_updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length,
          outdated: servers.filter(s => !s.last_updated || 
            new Date(s.last_updated) <= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          ).length
        };
        const complianceRate = servers.length > 0 ? Math.round((complianceStats.upToDate / servers.length) * 100) : 0;

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-indigo-500/5 via-purple-500/10 to-indigo-500/5 border-indigo-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
                  <HardDrive className="h-5 w-5 text-white" />
                </div>
                Firmware Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-primary">{complianceRate}%</p>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
              </div>
              <Progress value={complianceRate} className="h-2 mb-4" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{complianceStats.upToDate}</p>
                  <p className="text-muted-foreground">Up to Date</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{packages.length}</p>
                  <p className="text-muted-foreground">Packages</p>
                </div>
                <div className="text-center p-2 rounded bg-error/10">
                  <p className="font-bold text-error">{complianceStats.outdated}</p>
                  <p className="text-muted-foreground">Outdated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'performance-metrics':
        const performanceMetrics = {
          avgResponseTime: 145,
          throughput: 1250,
          errorRate: 0.8,
          uptime: 99.95
        };

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-teal-500/5 via-green-500/10 to-teal-500/5 border-teal-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-green-500">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="font-bold text-primary">{performanceMetrics.avgResponseTime}ms</p>
                  <p className="text-muted-foreground">Avg Response</p>
                </div>
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{performanceMetrics.throughput}</p>
                  <p className="text-muted-foreground">Req/min</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{performanceMetrics.errorRate}%</p>
                  <p className="text-muted-foreground">Error Rate</p>
                </div>
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{performanceMetrics.uptime}%</p>
                  <p className="text-muted-foreground">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'maintenance-windows':
        const upcomingWindows = maintenanceWindows.filter(w => 
          new Date(w.scheduled_date) >= new Date() && w.status === 'scheduled'
        ).slice(0, 3);

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-amber-500/5 via-orange-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                Maintenance Windows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {upcomingWindows.length > 0 ? upcomingWindows.map((window) => (
                    <div key={window.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{window.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(window.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {window.status}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center p-4">
                      <p className="text-sm text-muted-foreground">No scheduled maintenance</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'os-distribution':
        const osStats = servers.reduce((acc, server) => {
          const os = server.operating_system || 'Unknown';
          acc[os] = (acc[os] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-rose-500/5 via-pink-500/10 to-rose-500/5 border-rose-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500">
                  <Database className="h-5 w-5 text-white" />
                </div>
                OS Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {Object.entries(osStats).slice(0, 4).map(([os, count]) => (
                    <div key={os} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{os}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{count}</p>
                        <p className="text-xs text-muted-foreground">
                          {servers.length > 0 ? Math.round((count / servers.length) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'vcenter-integration':
        const vcenterStats = {
          connected: vcenters.filter(v => v.name).length,
          clusters: clusters.length,
          totalHosts: clusters.reduce((sum, c) => sum + (c.total_hosts || 0), 0),
          activeHosts: clusters.reduce((sum, c) => sum + (c.active_hosts || 0), 0)
        };

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-sky-500/5 via-blue-500/10 to-sky-500/5 border-sky-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500">
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                vCenter Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="font-bold text-primary">{vcenterStats.connected}</p>
                  <p className="text-muted-foreground">vCenters</p>
                </div>
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{vcenterStats.clusters}</p>
                  <p className="text-muted-foreground">Clusters</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{vcenterStats.totalHosts}</p>
                  <p className="text-muted-foreground">Total Hosts</p>
                </div>
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{vcenterStats.activeHosts}</p>
                  <p className="text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'alert-summary':
        const alertPriority = events.filter(e => !e.acknowledged).slice(0, 5);

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-red-500/5 via-orange-500/10 to-red-500/5 border-red-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                Alert Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {alertPriority.length > 0 ? alertPriority.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                      <div className={`h-2 w-2 rounded-full mt-2 ${
                        alert.severity === 'error' ? 'bg-error' :
                        alert.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-4">
                      <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-success">All Clear</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'capacity-planning':
        const capacityMetrics = {
          cpuUtilization: 68,
          memoryUtilization: 72,
          storageUtilization: 55,
          projectedGrowth: 15
        };

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-violet-500/5 via-purple-500/10 to-violet-500/5 border-violet-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                Capacity Planning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU</span>
                    <span>{capacityMetrics.cpuUtilization}%</span>
                  </div>
                  <Progress value={capacityMetrics.cpuUtilization} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory</span>
                    <span>{capacityMetrics.memoryUtilization}%</span>
                  </div>
                  <Progress value={capacityMetrics.memoryUtilization} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage</span>
                    <span>{capacityMetrics.storageUtilization}%</span>
                  </div>
                  <Progress value={capacityMetrics.storageUtilization} className="h-2" />
                </div>
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="text-xs text-muted-foreground">6mo Projected Growth</p>
                  <p className="font-bold text-primary">+{capacityMetrics.projectedGrowth}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'cost-analysis':
        const costMetrics = {
          monthlySpend: 45670,
          optimization: 8500,
          efficiency: 87,
          trend: 'down'
        };

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-emerald-500/5 via-teal-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                Cost Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-primary">${(costMetrics.monthlySpend / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">Monthly Spend</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">${(costMetrics.optimization / 1000).toFixed(0)}k</p>
                  <p className="text-muted-foreground">Savings</p>
                </div>
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="font-bold text-primary">{costMetrics.efficiency}%</p>
                  <p className="text-muted-foreground">Efficiency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'backup-status':
        const backupStats = {
          protected: Math.floor(servers.length * 0.85),
          lastBackup: 2,
          success: 94,
          storage: 2.4
        };

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-slate-500/5 via-gray-500/10 to-slate-500/5 border-slate-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-slate-500 to-gray-500">
                  <Archive className="h-5 w-5 text-white" />
                </div>
                Backup Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{backupStats.protected}</p>
                  <p className="text-muted-foreground">Protected</p>
                </div>
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="font-bold text-primary">{backupStats.lastBackup}h</p>
                  <p className="text-muted-foreground">Last Backup</p>
                </div>
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{backupStats.success}%</p>
                  <p className="text-muted-foreground">Success Rate</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{backupStats.storage}TB</p>
                  <p className="text-muted-foreground">Storage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'user-activity':
        const userActivities = events.filter(e => e.created_by).slice(0, 4);

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-blue-500/5 via-indigo-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500">
                  <Users className="h-5 w-5 text-white" />
                </div>
                User Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {userActivities.length > 0 ? userActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-4">
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );

      case 'uptime-monitor':
        const uptimeStats = {
          currentUptime: 99.94,
          avgUptime: 99.87,
          incidents: 2,
          mttr: 18
        };

        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-green-500/5 via-lime-500/10 to-green-500/5 border-green-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-lime-500">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                Uptime Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-success">{uptimeStats.currentUptime}%</p>
                <p className="text-sm text-muted-foreground">Current Uptime</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="font-bold text-success">{uptimeStats.avgUptime}%</p>
                  <p className="text-muted-foreground">30d Average</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="font-bold text-warning">{uptimeStats.incidents}</p>
                  <p className="text-muted-foreground">Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} opacity-60 border-dashed hover:shadow-xl transition-all duration-300`}>
            <CardHeader {...headerProps} className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-muted">
                  <WidgetIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                {widget.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Widget coming soon...</p>
            </CardContent>
            {behavior?.quickLinks && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {behavior.quickLinks.map((link) => (
                    <Button
                      key={link.label}
                      variant="link"
                      size="sm"
                      onClick={() => doAction(link.action)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
    }
  };

  if (serversLoading || jobsLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading enterprise dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-background via-background to-muted/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
            Enterprise Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive infrastructure management and monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refreshServers} className="hover:shadow-md transition-all">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setConfigOpen(true)} className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {dashboardStats.alertStats.critical > 0 && (
        <Card className="border-error bg-gradient-to-r from-error/5 via-error/10 to-error/5 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-error/20">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-error">Critical Alerts Require Immediate Attention</p>
                <p className="text-sm text-muted-foreground">
                  {dashboardStats.alertStats.critical} critical alerts detected across your infrastructure
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => doAction({ type: 'navigate' as const, path: '/alerts' })}
                className="hover:shadow-md transition-all"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Alerts
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Bar */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Actions
            </h3>
            <Badge variant="secondary" className="text-xs">
              Frequently Used
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  onClick={() => doAction(action.action)}
                  className="h-auto p-4 flex-col gap-2 hover:shadow-lg hover:scale-105 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${action.gradient}`}>
                    <ActionIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Widgets Grid */}
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-min"
            >
              {enabledWidgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative group ${snapshot.isDragging ? 'z-50 rotate-3 scale-105' : ''}`}
                    >
                      <div 
                        {...provided.dragHandleProps}
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background/80 backdrop-blur-sm"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {renderWidget(widget)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {/* Add Widget Button */}
              <Card 
                className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer min-h-[200px] flex items-center justify-center"
                onClick={() => setConfigOpen(true)}
              >
                <div className="text-center">
                  <div className="p-3 rounded-full bg-muted/50 mx-auto mb-3">
                    <PlusCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">Add Widget</p>
                  <p className="text-sm text-muted-foreground">Customize your dashboard</p>
                </div>
              </Card>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Dashboard Configuration Modal */}
      <DashboardConfig
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        widgets={widgets}
        onUpdateWidgets={handleUpdateWidgets}
      />
    </div>
  );
}