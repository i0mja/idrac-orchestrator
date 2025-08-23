import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { EnhancedGlobalInventory } from "@/components/inventory/EnhancedGlobalInventory";
import { EnhancedCommandControl } from "@/components/scheduler/EnhancedCommandControl";
import AlertsEventsPage from "@/components/alerts/AlertsEventsPage";
import VCenterManagement from "@/pages/VCenterManagement";
import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { DatacenterSettings } from "@/components/settings/DatacenterSettings";
import { NetworkDiscovery } from "@/components/discovery/NetworkDiscovery";
import { EnterpriseManagement } from "@/components/enterprise/EnterpriseManagement";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<EnhancedDashboard />} />
        <Route path="inventory" element={<EnhancedGlobalInventory />} />
        <Route path="discovery" element={<NetworkDiscovery />} />
        <Route path="scheduler" element={<EnhancedCommandControl />} />
        <Route path="enterprise" element={<EnterpriseManagement />} />
        <Route path="alerts" element={<AlertsEventsPage />} />
        <Route path="vcenter" element={<VCenterManagement />} />
        <Route path="health" element={<HealthChecks />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/datacenters" element={<DatacenterSettings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}