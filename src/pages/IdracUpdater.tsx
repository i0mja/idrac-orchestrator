import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { UnifiedServerManagement } from "@/components/inventory/UnifiedServerManagement";
import { GlobalInventoryDashboard } from "@/components/inventory/GlobalInventoryDashboard";
import { DellEnterpriseManagement } from "@/components/enterprise/DellEnterpriseManagement";
import { FirmwareManagement } from "@/components/firmware/FirmwareManagement";
import { JobScheduler } from "@/components/scheduler/JobScheduler";
import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import AlertsEventsPage from "@/components/alerts/AlertsEventsPage";
import SetupWizard from "@/components/setup/SetupWizard";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { useAuth } from "@/hooks/useAuth";

type UserRole = "admin" | "operator" | "viewer";
type PageType = "dashboard" | "inventory" | "global-inventory" | "enterprise" | "firmware" | "scheduler" | "health" | "users" | "settings";

export default function IdracUpdater() {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const { config, loading, updateConfig } = useSystemConfig();
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);
  
  // Show loading while checking auth or system config
  if (loading || authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authLoading ? "Checking authentication..." : "Loading system configuration..."}
          </p>
        </div>
      </div>
    );
  }

  // Return null if not authenticated (useEffect will handle redirect)
  if (!isAuthenticated) {
    return null;
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
        return <UnifiedServerManagement />;
      case "global-inventory":
        return <GlobalInventoryDashboard />;
      case "enterprise":
        return <DellEnterpriseManagement />;
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
        userRole={(profile?.role as "admin" | "operator" | "viewer") || "operator"}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          userRole={(profile?.role as "admin" | "operator" | "viewer") || "operator"} 
          userName={profile?.full_name || profile?.username || user?.email || "User"} 
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}