import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

import { GlobalInventoryDashboard } from "@/components/inventory/GlobalInventoryDashboard";
import { EnterpriseManagement } from "@/components/enterprise/EnterpriseManagement";

import { HealthChecks } from "@/components/health/HealthChecks";
import { UserManagement } from "@/components/users/UserManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";
import AlertsEventsPage from "@/components/alerts/AlertsEventsPage";
import SetupWizard from "@/components/setup/SetupWizard";

import { CommandControlCenter } from "@/components/scheduler/CommandControlCenter";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { useAuth } from "@/hooks/useAuth";
import { Globe } from "lucide-react";

type UserRole = "admin" | "operator" | "viewer";
type PageType = "dashboard" | "global-inventory" | "enterprise" | "health" | "users" | "settings" | "alerts" | "vcenter" | "scheduler";

export default function IdracUpdater() {
  // Initialize currentPage from URL hash
  const getPageFromHash = () => {
    const hash = window.location.hash.slice(1); // Remove the #
    const validPages: PageType[] = ["dashboard", "global-inventory", "enterprise", "health", "users", "settings", "alerts", "vcenter", "scheduler"];
    return validPages.includes(hash as PageType) ? (hash as PageType) : "dashboard";
  };

  const [currentPage, setCurrentPage] = useState<PageType>(getPageFromHash());
  const { config, loading, updateConfig } = useSystemConfig();
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Listen for hash changes to sync currentPage with URL
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash when currentPage changes
  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

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
      case "global-inventory":
        return <GlobalInventoryDashboard />;
      case "enterprise":
        return <EnterpriseManagement />;
      case "health":
        return <HealthChecks />;
      case "alerts":
        return <AlertsEventsPage />;
      case "vcenter":
        return <div className="text-center py-12">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">vCenter Management</h3>
          <p className="text-muted-foreground">
            Please use the dedicated vCenter management section
          </p>
        </div>;
      case "scheduler":
        return <CommandControlCenter />;
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
        onPageChange={handlePageChange}
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