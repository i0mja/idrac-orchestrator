import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkDiscovery } from '@/components/discovery/NetworkDiscovery';
import { DiscoveryTab as OmeDiscoveryTab } from '@/pages/ome/DiscoveryTab';
import { AssetsTab } from '@/pages/ome/AssetsTab';
import { RunsTab } from '@/pages/ome/RunsTab';

export function DiscoveryPage() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="network" className="space-y-4">
        <TabsList>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="ome-discovery">OME Discovery</TabsTrigger>
          <TabsTrigger value="ome-assets">OME Assets</TabsTrigger>
          <TabsTrigger value="ome-runs">OME Runs</TabsTrigger>
        </TabsList>
        <TabsContent value="network">
          <NetworkDiscovery />
        </TabsContent>
        <TabsContent value="ome-discovery">
          <OmeDiscoveryTab />
        </TabsContent>
        <TabsContent value="ome-assets">
          <AssetsTab />
        </TabsContent>
        <TabsContent value="ome-runs">
          <RunsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
