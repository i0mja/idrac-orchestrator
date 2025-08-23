// Enhanced: Multi-datacenter enterprise server management hub
import { useState, useEffect } from "react";
import { DemoDataSeeder } from "@/components/demo/DemoDataSeeder";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { EnhancedGlobalInventory } from "@/components/inventory/EnhancedGlobalInventory";
import { EnhancedCommandControl } from "@/components/scheduler/EnhancedCommandControl";
import { EnterpriseManagement } from "@/components/enterprise/EnterpriseManagement";
import { HealthChecks } from "@/components/health/HealthChecks";
import AlertsEventsPage from "@/components/alerts/AlertsEventsPage";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import VCenterManagement from "@/pages/VCenterManagement";
import { NetworkDiscovery } from "@/components/discovery/NetworkDiscovery";

type PageType = "dashboard" | "global-inventory" | "enterprise" | "health" | "users" | "settings" | "alerts" | "vcenter" | "scheduler" | "discovery";

const Index = () => {
  // Enhanced: Multi-user role support for enterprise environments
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [userRole] = useState<"admin" | "operator" | "viewer">("admin"); // Enhanced: From LDAP/IDM integration
  const [userName] = useState("Administrator"); // Enhanced: From authentication context
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    checkForData();
  }, []);

  const checkForData = async () => {
    try {
      const { data } = await supabase.from('servers').select('id').limit(1);
      setHasData((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking for data:', error);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <EnhancedDashboard />;
      case "global-inventory":
        return <EnhancedGlobalInventory />;
      case "discovery":
        return <NetworkDiscovery />;
      case "scheduler":
        return <EnhancedCommandControl />;
      case "enterprise":
        return <EnterpriseManagement />;
      case "health":
        return <HealthChecks />;
      case "alerts":
        return <AlertsEventsPage />;
      case "users":
        return <UserManagement />;
      case "settings":
        return <SettingsPage />;
      case "vcenter":
        return <VCenterManagement />;
      default:
        return <EnhancedDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userRole={userRole} userName={userName} />
        <main className="flex-1 overflow-auto p-6">
          {/* Enhanced: Demo data seeder for first-time setup */}
          {!hasData && <DemoDataSeeder />}
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default Index;
