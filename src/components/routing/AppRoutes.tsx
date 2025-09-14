import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { ModernEnterpriseDashboard } from "@/components/dashboard/ModernEnterpriseDashboard";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ComprehensiveGlobalInventory } from "@/components/inventory/ComprehensiveGlobalInventory";
import { EnhancedCommandControl } from "@/components/scheduler/EnhancedCommandControl";
import EnhancedAlertsEventsPage from "@/components/alerts/EnhancedAlertsEventsPage";
import VCenterManagement from "@/pages/VCenterManagement";
import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { DiscoveryPage } from "@/pages/DiscoveryPage";
import { EnterpriseManagement } from "@/components/enterprise/EnterpriseManagement";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<ModernEnterpriseDashboard />} />
        <Route path="legacy-dashboard" element={<DashboardOverview />} />
        <Route path="inventory" element={<ComprehensiveGlobalInventory />} />
        <Route path="discovery" element={<DiscoveryPage />} />
        <Route path="scheduler" element={<EnhancedCommandControl />} />
        <Route path="enterprise" element={<EnterpriseManagement />} />
        <Route path="alerts" element={<EnhancedAlertsEventsPage />} />
        <Route path="vcenter" element={<VCenterManagement />} />
        <Route path="health" element={<HealthChecks />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}