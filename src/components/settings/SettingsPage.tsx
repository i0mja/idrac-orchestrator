import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdmConfiguration } from "./IdmConfiguration";
import { SecuritySettings } from "./SecuritySettings";
import { SetupDebug } from "@/components/debug/SetupDebug";
import { ApiDocumentation } from "./ApiDocumentation";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your system configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="security">Security & Authentication</TabsTrigger>
          <TabsTrigger value="identity">Identity Management</TabsTrigger>
          <TabsTrigger value="api">API Documentation</TabsTrigger>
          <TabsTrigger value="debug">Setup Debug</TabsTrigger>
        </TabsList>
        
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>
        
        <TabsContent value="identity" className="space-y-4">
          <IdmConfiguration />
        </TabsContent>
        
        <TabsContent value="api" className="space-y-4">
          <ApiDocumentation />
        </TabsContent>
        
        <TabsContent value="debug" className="space-y-4">
          <SetupDebug />
        </TabsContent>
      </Tabs>
    </div>
  );
}