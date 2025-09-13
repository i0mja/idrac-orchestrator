import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VCenterConnections } from "@/components/vcenter/VCenterConnections";
import { VCenterInfrastructure } from "@/components/vcenter/VCenterInfrastructure";
import { VCenterClusters } from "@/components/vcenter/VCenterClusters";
import { Server, Network, Settings, Globe } from "lucide-react";

export default function VCenterManagement() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient">vCenter Management</h1>
          <p className="text-muted-foreground text-lg">
            Manage vCenter connections and monitor your virtual infrastructure
          </p>
        </div>
      </div>

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Infrastructure
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Clusters
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <VCenterConnections />
        </TabsContent>

        <TabsContent value="infrastructure">
          <VCenterInfrastructure />
        </TabsContent>

        <TabsContent value="clusters">
          <VCenterClusters />
        </TabsContent>

        <TabsContent value="settings">
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">vCenter Settings</h3>
            <p className="text-muted-foreground">
              Global vCenter management settings will be available here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}