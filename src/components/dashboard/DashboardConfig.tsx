import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Action } from './_widgetActions';
import { 
  Server, Shield, RefreshCw, MapPin, Activity, HardDrive, 
  TrendingUp, Calendar, Database, Cloud, AlertTriangle, 
  Clock, Users, DollarSign, Archive
} from 'lucide-react';

export interface DashboardWidget {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'overview' | 'operations' | 'security' | 'analytics';
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
  primaryAction?: Action;
  quickLinks?: Array<{ label: string; action: Action; icon?: React.ElementType }>;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'fleet-overview', name: 'Fleet Overview', description: 'Total servers, health score, and availability', icon: Server, category: 'overview', enabled: true, order: 1, size: 'large' },
  { id: 'security-dashboard', name: 'Security Dashboard', description: 'Security alerts, compliance status, and risk assessment', icon: Shield, category: 'security', enabled: true, order: 2, size: 'medium' },
  { id: 'update-status', name: 'Update Status', description: 'Firmware updates, pending jobs, and success rates', icon: RefreshCw, category: 'operations', enabled: true, order: 3, size: 'medium' },
  { id: 'datacenter-health', name: 'Datacenter Health', description: 'Geographic distribution and site status', icon: MapPin, category: 'overview', enabled: true, order: 4, size: 'medium' },
  { id: 'activity-feed', name: 'Activity Feed', description: 'Recent system events and job completions', icon: Activity, category: 'overview', enabled: true, order: 5, size: 'medium' },
  { id: 'firmware-compliance', name: 'Firmware Compliance', description: 'Package inventory and compliance rates', icon: HardDrive, category: 'operations', enabled: true, order: 6, size: 'medium' },
  { id: 'performance-metrics', name: 'Performance Metrics', description: 'Response times, throughput, and error rates', icon: TrendingUp, category: 'analytics', enabled: true, order: 7, size: 'medium' },
  { id: 'maintenance-windows', name: 'Maintenance Windows', description: 'Scheduled maintenance and downtime planning', icon: Calendar, category: 'operations', enabled: true, order: 8, size: 'medium' },
  { id: 'os-distribution', name: 'OS Distribution', description: 'Operating system breakdown and EOL status', icon: Database, category: 'analytics', enabled: true, order: 9, size: 'medium' },
  { id: 'vcenter-integration', name: 'vCenter Integration', description: 'VMware infrastructure and cluster status', icon: Cloud, category: 'overview', enabled: true, order: 10, size: 'medium' },
  { id: 'alert-summary', name: 'Alert Summary', description: 'Critical warnings and notification center', icon: AlertTriangle, category: 'security', enabled: true, order: 11, size: 'small' },
  { id: 'capacity-planning', name: 'Capacity Planning', description: 'Resource utilization and growth projections', icon: TrendingUp, category: 'analytics', enabled: false, order: 12, size: 'large' },
  { id: 'cost-analysis', name: 'Cost Analysis', description: 'Infrastructure costs and optimization opportunities', icon: DollarSign, category: 'analytics', enabled: false, order: 13, size: 'medium' },
  { id: 'backup-status', name: 'Backup Status', description: 'Data protection and recovery readiness', icon: Archive, category: 'operations', enabled: false, order: 14, size: 'medium' },
  { id: 'user-activity', name: 'User Activity', description: 'Admin actions and system access logs', icon: Users, category: 'security', enabled: false, order: 15, size: 'medium' },
  { id: 'uptime-monitor', name: 'Uptime Monitor', description: 'Service availability and downtime tracking', icon: Clock, category: 'operations', enabled: false, order: 16, size: 'medium' },
];

export const WIDGET_BEHAVIORS: Record<string, Pick<DashboardWidget,'primaryAction'|'quickLinks'>> = {
  'fleet-overview': {
    primaryAction: { type: 'navigate', path: '/inventory' },
    quickLinks: [
      { label: 'Online',  action: { type:'navigate', path:'/inventory', params:{ status:'online' } } },
      { label: 'Offline', action: { type:'navigate', path:'/inventory', params:{ status:'offline' } } },
      { label: 'Updating',action: { type:'navigate', path:'/inventory', params:{ status:'updating' } } },
    ]
  },
  'update-status': {
    primaryAction: { type:'navigate', path:'/scheduler', params:{ tab:'history' } }
  },
  'firmware-compliance': {
    primaryAction: { type:'navigate', path:'/scheduler', params:{ tab:'templates' } },
    quickLinks: [
      { label:'Non-compliant', action:{ type:'navigate', path:'/inventory', params:{ tag:'noncompliant' } } }
    ]
  },
  'datacenter-health': {
    primaryAction: { type:'navigate', path:'/health', params:{ category:'idrac' } }
  },
  'alert-summary': {
    primaryAction: { type:'navigate', path:'/alerts' },
    quickLinks: [
      { label:'Critical', action:{ type:'navigate', path:'/alerts', params:{ severity:'critical' } } },
      { label:'Warnings', action:{ type:'navigate', path:'/alerts', params:{ severity:'warning' } } },
    ]
  },
  'maintenance-windows': {
    primaryAction: { type:'navigate', path:'/scheduler', params:{ tab:'windows' } },
    quickLinks: [{ label:'Create window', action:{ type:'modal', id:'maintenance' } }]
  },
  'vcenter-integration': { primaryAction: { type:'navigate', path:'/vcenter' } },
  'os-distribution':     { primaryAction: { type:'navigate', path:'/inventory', params:{ view:'os' } } },
};

interface DashboardConfigProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidget[];
  onUpdateWidgets: (widgets: DashboardWidget[]) => void;
}

export function DashboardConfig({ isOpen, onClose, widgets, onUpdateWidgets }: DashboardConfigProps) {
  const [localWidgets, setLocalWidgets] = useState(widgets);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Widgets' },
    { value: 'overview', label: 'Overview' },
    { value: 'operations', label: 'Operations' },
    { value: 'security', label: 'Security' },
    { value: 'analytics', label: 'Analytics' }
  ];

  const filteredWidgets = localWidgets.filter(widget => 
    selectedCategory === 'all' || widget.category === selectedCategory
  );

  const enabledCount = localWidgets.filter(w => w.enabled).length;
  const totalCount = localWidgets.length;

  const handleToggleWidget = (widgetId: string) => {
    setLocalWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, enabled: !widget.enabled }
        : widget
    ));
  };

  const handleSizeChange = (widgetId: string, size: DashboardWidget['size']) => {
    setLocalWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, size }
        : widget
    ));
  };

  const handleSave = () => {
    onUpdateWidgets(localWidgets);
    onClose();
  };

  const handleReset = () => {
    setLocalWidgets(DEFAULT_WIDGETS);
  };

  const handleEnableAll = () => {
    setLocalWidgets(prev => prev.map(widget => ({ ...widget, enabled: true })));
  };

  const handleDisableAll = () => {
    setLocalWidgets(prev => prev.map(widget => ({ ...widget, enabled: false })));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            Dashboard Configuration
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Customize your dashboard by enabling/disabling widgets and adjusting their sizes.
          </p>
        </DialogHeader>

        {/* Stats Banner */}
        <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{enabledCount}</p>
                  <p className="text-xs text-muted-foreground">Enabled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalCount - enabledCount}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEnableAll}>
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisableAll}>
                  Disable All
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset to Default
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Widget List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {filteredWidgets.map(widget => {
              const Icon = widget.icon;
              return (
                <Card key={widget.id} className={`transition-all hover:shadow-md ${widget.enabled ? 'border-primary/30 bg-primary/5' : 'border-muted'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${widget.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${widget.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{widget.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {widget.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {widget.size}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{widget.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 ml-4">
                            {/* Size Selection */}
                            <div className="flex gap-1">
                              {['small', 'medium', 'large'].map(size => (
                                <Button
                                  key={size}
                                  variant={widget.size === size ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleSizeChange(widget.id, size as DashboardWidget['size'])}
                                  disabled={!widget.enabled}
                                >
                                  {size[0].toUpperCase()}
                                </Button>
                              ))}
                            </div>
                            
                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center gap-2">
                              <Label htmlFor={widget.id} className="text-sm">
                                {widget.enabled ? 'Enabled' : 'Disabled'}
                              </Label>
                              <Switch
                                id={widget.id}
                                checked={widget.enabled}
                                onCheckedChange={() => handleToggleWidget(widget.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {enabledCount} of {totalCount} widgets enabled
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-primary-glow">
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_WIDGETS };
export default DashboardConfig;