import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ServerInventory } from "@/components/inventory/ServerInventory";
import { FirmwareManagement } from "@/components/firmware/FirmwareManagement";
import { JobScheduler } from "@/components/scheduler/JobScheduler";
import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import SetupWizard from "@/components/setup/SetupWizard";
import { useSystemConfig } from "@/hooks/useSystemConfig";

type UserRole = "admin" | "operator" | "viewer";
type PageType = "dashboard" | "inventory" | "firmware" | "scheduler" | "health" | "users" | "settings";

export default function IdracUpdater() {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [userRole] = useState<UserRole>("admin"); // Simulated user role
  const [userName] = useState("John Administrator");
  const { config, loading, updateConfig } = useSystemConfig();
  
  // Show setup wizard if system is not configured
  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading system configuration...</p>
        </div>
      </div>
    );
  }
  
  if (!config?.setup_completed) {
    return (
      <SetupWizard 
        onComplete={() => {
          updateConfig('setup_completed', true);
        }}
      />
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardOverview />;
      case "inventory":
        return <ServerInventory />;
      case "firmware":
        return <FirmwareManagement />;
      case "scheduler":
        return <JobScheduler />;
      case "health":
        return <HealthChecks />;
      case "users":
        return <UserManagement />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="h-screen bg-background flex">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
        userRole={userRole}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userRole={userRole} userName={userName} />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}