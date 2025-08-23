import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DemoDataSeeder } from "@/components/demo/DemoDataSeeder";
import { supabase } from "@/integrations/supabase/client";

type PageType = "dashboard" | "global-inventory" | "enterprise" | "health" | "users" | "settings" | "alerts" | "vcenter" | "scheduler" | "discovery";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole] = useState<"admin" | "operator" | "viewer">("admin");
  const [userName] = useState("Administrator");
  const [hasData, setHasData] = useState(true);

  // Map current route to sidebar page type
  const getCurrentPage = (): PageType => {
    const path = location.pathname;
    switch (path) {
      case "/":
        return "dashboard";
      case "/inventory":
        return "global-inventory";
      case "/discovery":
        return "discovery";
      case "/scheduler":
        return "scheduler";
      case "/enterprise":
        return "enterprise";
      case "/health":
        return "health";
      case "/alerts":
        return "alerts";
      case "/users":
        return "users";
      case "/settings":
      case "/settings/datacenters":
        return "settings";
      case "/vcenter":
        return "vcenter";
      default:
        return "dashboard";
    }
  };

  const handlePageChange = (page: PageType) => {
    switch (page) {
      case "dashboard":
        navigate("/");
        break;
      case "global-inventory":
        navigate("/inventory");
        break;
      case "discovery":
        navigate("/discovery");
        break;
      case "scheduler":
        navigate("/scheduler");
        break;
      case "enterprise":
        navigate("/enterprise");
        break;
      case "health":
        navigate("/health");
        break;
      case "alerts":
        navigate("/alerts");
        break;
      case "users":
        navigate("/users");
        break;
      case "settings":
        navigate("/settings");
        break;
      case "vcenter":
        navigate("/vcenter");
        break;
    }
  };

  // Enhanced: Check if system has demo data
  useEffect(() => {
    const checkDemoData = async () => {
      try {
        const { count } = await supabase
          .from('servers')
          .select('*', { count: 'exact', head: true });
        
        setHasData((count || 0) > 0);
      } catch (error) {
        console.error('Error checking demo data:', error);
      }
    };

    checkDemoData();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentPage={getCurrentPage()} 
        onPageChange={handlePageChange}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userRole={userRole} userName={userName} />
        <main className="flex-1 overflow-auto p-6">
          {/* Enhanced: Demo data seeder for first-time setup */}
          {!hasData && <DemoDataSeeder />}
          <Outlet />
        </main>
      </div>
    </div>
  );
}