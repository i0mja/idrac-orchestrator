import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useEnhancedServers } from '@/hooks/useEnhancedServers';
import { useUpdateJobs } from '@/hooks/useUpdateJobs';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import { useVCenterService } from '@/hooks/useVCenterService';
import { useFirmwarePackages } from '@/hooks/useFirmwarePackages';
import { useMaintenanceWindows } from '@/hooks/useMaintenanceWindows';
import { DashboardConfig, DashboardWidget, DEFAULT_WIDGETS } from './DashboardConfig';
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
  const navigate = useNavigate();
  const { servers, datacenters, eolAlerts, loading: serversLoading, refresh: refreshServers } = useEnhancedServers();
  const { jobs, loading: jobsLoading } = useUpdateJobs();
  const { events, criticalEvents, warningEvents, loading: eventsLoading } = useSystemEvents();
  const { vcenters, clusters } = useVCenterService();
  const { packages } = useFirmwarePackages();
  const { windows: maintenanceWindows } = useMaintenanceWindows();
  const { toast } = useToast();

  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [configOpen, setConfigOpen] = useState(false);

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  // Save to localStorage when widgets change
  const handleUpdateWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
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
      onClick: () => navigate('/discovery'),
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: PlayCircle,
      label: "Schedule Command",
      description: "Remote execution",
      onClick: () => navigate('/scheduler'),
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Bell,
      label: "View Alerts",
      description: "System notifications",
      onClick: () => navigate('/alerts'),
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Calendar,
      label: "Maintenance",
      description: "Schedule downtime",
      onClick: () => navigate('/scheduler'),
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      label: "Analytics",
      description: "Performance insights",
      onClick: () => navigate('/inventory'),
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: Settings,
      label: "System Config",
      description: "Global settings",
      onClick: () => navigate('/settings'),
      gradient: "from-gray-500 to-slate-500"
    }
  ];

  const renderWidget = (widget: DashboardWidget) => {
    const { fleetStats, securityStats, updateStats, alertStats } = dashboardStats;
    
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
            <CardHeader className="pb-2">
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
          </Card>
        );

      case 'security-dashboard':
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-orange-500/5 via-red-500/10 to-orange-500/5 border-orange-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader className="pb-2">
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
            <CardHeader className="pb-2">
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
          </Card>
        );

      case 'quick-actions':
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} bg-gradient-to-br from-purple-500/5 via-pink-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-xl transition-all duration-300`}>
            <CardHeader className="pb-2">
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
                      onClick={action.onClick}
                      className="h-auto p-3 flex-col gap-1 hover:shadow-md transition-all"
                    >
                      <ActionIcon className="h-4 w-4" />
                      <span className="text-xs font-medium truncate w-full">{action.label.split(' ')[0]}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={widget.id} className={`${getWidgetClassName()} opacity-60 border-dashed hover:shadow-xl transition-all duration-300`}>
            <CardHeader className="pb-2">
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
              <Button variant="outline" size="sm" onClick={() => navigate('/alerts')} className="hover:shadow-md transition-all">
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
                  onClick={action.onClick}
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