import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NetworkDiscovery } from '@/components/discovery/NetworkDiscovery';
import { DiscoveryTab as OmeDiscoveryTab } from '@/pages/ome/DiscoveryTab';
import { AssetsTab } from '@/pages/ome/AssetsTab';
import { RunsTab } from '@/pages/ome/RunsTab';
import { Wifi, Server, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DiscoveryPage() {
  const [activeTab, setActiveTab] = useState('network');

  const tabs = [
    { id: 'network', label: 'Network Discovery', icon: Wifi },
    { id: 'ome-discovery', label: 'OME Discovery', icon: Server },
    { id: 'ome-assets', label: 'OME Assets', icon: Database },
    { id: 'ome-runs', label: 'OME Runs', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 transition-all duration-200",
                isActive 
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant" 
                  : "hover:bg-muted/50 hover:scale-105"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
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
