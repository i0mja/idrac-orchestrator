import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ServerInventory } from "@/components/inventory/ServerInventory";
import { FirmwareManagement } from "@/components/firmware/FirmwareManagement";

type UserRole = "admin" | "operator" | "viewer";
type PageType = "dashboard" | "inventory" | "firmware" | "scheduler" | "health" | "users" | "settings";

export default function IdracUpdater() {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [userRole] = useState<UserRole>("admin"); // Simulated user role
  const [userName] = useState("John Administrator");

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardOverview />;
      case "inventory":
        return <ServerInventory />;
      case "firmware":
        return <FirmwareManagement />;
      case "scheduler":
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Job Scheduler</h2>
            <p className="text-muted-foreground">Flexible scheduling engine using APScheduler (cron and interval support)</p>
          </div>
        );
      case "health":
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Health Checks</h2>
            <p className="text-muted-foreground">Built-in vCenter and iDRAC connectivity validation</p>
          </div>
        );
      case "users":
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>
            <p className="text-muted-foreground">Role-based access control (Admin / Operator / Viewer) via AD groups</p>
          </div>
        );
      case "settings":
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-muted-foreground">System configuration and preferences</p>
          </div>
        );
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