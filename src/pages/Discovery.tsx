import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkDiscovery } from "@/components/discovery/NetworkDiscovery";
import { OmePage } from "@/pages/ome/OmePage";

export default function Discovery() {
  return (
    <Tabs defaultValue="network" className="space-y-6">
      <TabsList>
        <TabsTrigger value="network">Network Discovery</TabsTrigger>
        <TabsTrigger value="ome">OME</TabsTrigger>
      </TabsList>
      <TabsContent value="network">
        <NetworkDiscovery />
      </TabsContent>
      <TabsContent value="ome">
        <OmePage />
      </TabsContent>
    </Tabs>
  );
}

