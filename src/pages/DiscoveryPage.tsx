import { useState } from 'react';
import { NetworkDiscovery } from '@/components/discovery/NetworkDiscovery';
import { DiscoveryTab as OmeDiscoveryTab } from '@/pages/ome/DiscoveryTab';
import { AssetsTab } from '@/pages/ome/AssetsTab';
import { RunsTab } from '@/pages/ome/RunsTab';
import { Wifi, Server, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DiscoveryPage() {
  const [activeTab, setActiveTab] = useState('network');

  const tabs = [
    {
      id: 'network',
      label: 'Network Discovery',
      icon: Wifi,
      description:
        'Discover Dell servers with iDRAC access across your network infrastructure',
    },
    {
      id: 'ome-discovery',
      label: 'OME Discovery',
      icon: Server,
      description:
        'Initiate device discovery through an OpenManage Enterprise instance',
    },
    {
      id: 'ome-assets',
      label: 'OME Assets',
      icon: Database,
      description:
        'Review and manage assets synced from OpenManage Enterprise',
    },
    {
      id: 'ome-runs',
      label: 'OME Runs',
      icon: Activity,
      description:
        'Track discovery job history and status from OpenManage Enterprise',
    },
  ];

  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
          <active.icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient">{active.label}</h1>
          <p className="text-muted-foreground text-lg">{active.description}</p>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-b border-border bg-card rounded-lg overflow-hidden">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2",
                  isActive 
                    ? "bg-muted/50 text-primary border-primary shadow-sm" 
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-[600px]">
        {activeTab === 'network' && <NetworkDiscovery />}
        {activeTab === 'ome-discovery' && <OmeDiscoveryTab />}
        {activeTab === 'ome-assets' && <AssetsTab />}
        {activeTab === 'ome-runs' && <RunsTab />}
      </div>
    </div>
  );
}
