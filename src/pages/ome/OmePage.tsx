import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscoveryTab } from './DiscoveryTab';
import { AssetsTab } from './AssetsTab';
import { RunsTab } from './RunsTab';

export function OmePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">OpenManage Discovery & Assets</h1>
      <Tabs defaultValue="discovery">
        <TabsList>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>
        <TabsContent value="discovery">
          <DiscoveryTab />
        </TabsContent>
        <TabsContent value="assets">
          <AssetsTab />
        </TabsContent>
        <TabsContent value="runs">
          <RunsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
