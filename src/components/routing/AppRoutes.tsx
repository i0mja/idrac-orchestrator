import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { EnterpriseCommandCenter } from "@/components/enterprise/EnterpriseCommandCenter";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ComprehensiveGlobalInventory } from "@/components/inventory/ComprehensiveGlobalInventory";
import { ModernSchedulerHub } from "@/components/scheduler/ModernSchedulerHub";
import EnhancedAlertsEventsPage from "@/components/alerts/EnhancedAlertsEventsPage";
import VCenterManagement from "@/pages/VCenterManagement";
import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { DiscoveryPage } from "@/pages/DiscoveryPage";
import { EnterpriseManagement } from "@/components/enterprise/EnterpriseManagement";
import { OrganizationManagement } from "@/components/enterprise/OrganizationManagement";
import { AdvancedIntegrationsHub } from "@/components/enterprise/AdvancedIntegrationsHub";
import { ComplianceManagement } from "@/components/enterprise/ComplianceManagement";
import { WorkflowAutomationHub } from "@/components/enterprise/WorkflowAutomationHub";
import { EnterpriseAnalyticsDashboard } from "@/components/enterprise/EnterpriseAnalyticsDashboard";
import JobsManagement from "@/pages/JobsManagement";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<EnterpriseCommandCenter />} />
        <Route path="legacy-dashboard" element={<DashboardOverview />} />
        <Route path="inventory" element={<ComprehensiveGlobalInventory />} />
        <Route path="discovery" element={<DiscoveryPage />} />
        <Route path="scheduler" element={<ModernSchedulerHub />} />
        <Route path="enterprise" element={<EnterpriseManagement />} />
        <Route path="organization" element={<OrganizationManagement />} />
        <Route path="integrations" element={<AdvancedIntegrationsHub />} />
        <Route path="compliance" element={<ComplianceManagement />} />
        <Route path="workflows" element={<WorkflowAutomationHub />} />
        <Route path="analytics" element={<EnterpriseAnalyticsDashboard />} />
        <Route path="alerts" element={<EnhancedAlertsEventsPage />} />
        <Route path="vcenter" element={<VCenterManagement />} />
        <Route path="jobs" element={<JobsManagement />} />
        <Route path="health" element={<HealthChecks />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}