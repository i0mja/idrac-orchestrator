import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DiscoveryDashboard } from '@/components/discovery/DiscoveryDashboard';
import { DiscoveryControl } from '@/components/discovery/DiscoveryControl';
import { NetworkTopology } from '@/components/discovery/NetworkTopology';
import { NetworkDiscovery } from '@/components/discovery/NetworkDiscovery';
import { DiscoveryTab as OmeDiscoveryTab } from '@/pages/ome/DiscoveryTab';
import { AssetsTab } from '@/pages/ome/AssetsTab';
import { RunsTab } from '@/pages/ome/RunsTab';
import { useUnifiedDiscovery } from '@/hooks/useUnifiedDiscovery';
import { 
  Search, 
  Server, 
  Database, 
  Activity, 
  Network,
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DiscoveryPage() {
  const [activeView, setActiveView] = useState('unified');
  const { results, isDiscovering } = useUnifiedDiscovery();

  const views = [
    {
      id: 'unified',
      label: 'Unified Discovery',
      icon: Search,
      description: 'Enterprise discovery dashboard with unified network and OME scanning',
    },
    {
      id: 'network',
      label: 'Network Discovery',
      icon: Network,
      description: 'Advanced network scanning with protocol detection and topology mapping',
    },
    {
      id: 'ome-discovery',
      label: 'OME Discovery',
      icon: Server,
      description: 'OpenManage Enterprise integration for device management',
    },
    {
      id: 'ome-assets',
      label: 'OME Assets',
      icon: Database,
      description: 'Asset inventory from OpenManage Enterprise instances',
    },
    {
      id: 'ome-runs',
      label: 'Discovery Runs',
      icon: Activity,
      description: 'Historical discovery job tracking and analytics',
    },
  ];

  const active = views.find((v) => v.id === activeView) ?? views[0];

  const getViewStats = () => {
    if (!results?.stats) return null;

    return {
      totalServers: results.stats.totalServers,
      healthyProtocols: results.stats.protocolHealth.redfish + results.stats.protocolHealth.wsman,
      complianceRate: Math.round((results.stats.firmwareCompliance.upToDate / results.stats.totalServers) * 100) || 0,
      readyForUpdate: results.stats.readinessStatus.ready,
    };
  };

  const stats = getViewStats();

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl" />
        <div className="relative flex items-center justify-between p-6 bg-card/50 backdrop-blur-sm rounded-xl border">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <active.icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient mb-1">{active.label}</h1>
              <p className="text-muted-foreground">{active.description}</p>
            </div>
          </div>
          
          {/* Stats Preview */}
          {stats && (
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalServers}</div>
                <div className="text-xs text-muted-foreground">Total Servers</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{stats.complianceRate}%</div>
                <div className="text-xs text-muted-foreground">Compliant</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.readyForUpdate}</div>
                <div className="text-xs text-muted-foreground">Update Ready</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Navigation with Icons */}
      <Card className="overflow-hidden">
        <div className="flex overflow-x-auto">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 min-w-fit",
                  isActive 
                    ? "bg-primary/5 text-primary border-primary" 
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{view.label}</span>
                {isActive && isDiscovering && (
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Dynamic Content Area */}
      <div className="space-y-6">
        {activeView === 'unified' && (
          <>
            {/* Discovery Dashboard */}
            <DiscoveryDashboard />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Discovery Control */}
              <DiscoveryControl />
              
              {/* Network Topology */}
              <NetworkTopology 
                servers={results?.combinedServers || []}
                onNodeSelect={(node) => console.log('Node selected:', node)}
              />
            </div>
          </>
        )}
        
        {activeView === 'network' && <NetworkDiscovery />}
        {activeView === 'ome-discovery' && <OmeDiscoveryTab />}
        {activeView === 'ome-assets' && <AssetsTab />}
        {activeView === 'ome-runs' && <RunsTab />}
      </div>
    </div>
  );
}
