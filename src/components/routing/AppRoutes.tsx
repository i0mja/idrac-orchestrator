// Enhanced: Comprehensive routing for multi-datacenter enterprise management
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { EnhancedGlobalInventory } from "@/components/inventory/EnhancedGlobalInventory";
import { EnhancedCommandControl } from "@/components/scheduler/EnhancedCommandControl";
import AlertsEventsPage from "@/components/alerts/AlertsEventsPage";
import VCenterManagement from "@/pages/VCenterManagement";
import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { DatacenterSettings } from "@/components/settings/DatacenterSettings";
import { NetworkDiscovery } from "@/components/discovery/NetworkDiscovery";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/inventory" element={<EnhancedGlobalInventory />} />
      <Route path="/discovery" element={<NetworkDiscovery />} />
      <Route path="/scheduler" element={<EnhancedCommandControl />} />
      <Route path="/alerts" element={<AlertsEventsPage />} />
      <Route path="/vcenter" element={<VCenterManagement />} />
      <Route path="/health" element={<HealthChecks />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/datacenters" element={<DatacenterSettings />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}