import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdmConfiguration } from "./IdmConfiguration";
import { SecuritySettings } from "./SecuritySettings";
import { SetupDebug } from "@/components/debug/SetupDebug";
import { Settings } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient">Settings</h1>
          <p className="text-muted-foreground text-lg">
            Manage your system configuration and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="security">Security & Authentication</TabsTrigger>
          <TabsTrigger value="identity">Identity Management</TabsTrigger>
          <TabsTrigger value="debug">Setup Debug</TabsTrigger>
        </TabsList>
        
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>
        
        <TabsContent value="identity" className="space-y-4">
          <IdmConfiguration />
        </TabsContent>
        
        <TabsContent value="debug" className="space-y-4">
          <SetupDebug />
        </TabsContent>
      </Tabs>
    </div>
  );
}