import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Settings,
  Activity,
  Shield,
  Database,
  Building2,
  Bell,
  Network,
  Calendar,
  Search,
  Plug,
  Scale,
  Zap,
  BarChart3
} from "lucide-react";

type PageType =
  | "dashboard"
  | "global-inventory"
  | "enterprise"
  | "organization"
  | "integrations"
  | "compliance"
  | "workflows"
  | "analytics"
  | "health"
  | "users"
  | "settings"
  | "alerts"
  | "vcenter"
  | "jobs"
  | "scheduler"
  | "discovery";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  userRole: "admin" | "operator" | "viewer";
}

const menuItems: Array<{
  id: PageType;
  label: string;
  icon: any;
  roles: string[];
  isEnterprise?: boolean;
}> = [
  { id: "dashboard", label: "Command Center", icon: Activity, roles: ["admin", "operator", "viewer"] },
  { id: "analytics", label: "Analytics Dashboard", icon: BarChart3, roles: ["admin", "operator", "viewer"], isEnterprise: true },
  { id: "global-inventory", label: "Global Inventory", icon: Database, roles: ["admin", "operator", "viewer"] },
  { id: "discovery", label: "Discovery", icon: Search, roles: ["admin", "operator"] },
  { id: "vcenter", label: "vCenter Management", icon: Network, roles: ["admin", "operator"] },
  { id: "jobs", label: "Jobs Management", icon: Activity, roles: ["admin", "operator"] },
  { id: "workflows", label: "Workflow Automation", icon: Zap, roles: ["admin", "operator"], isEnterprise: true },
  { id: "scheduler", label: "Command & Control", icon: Calendar, roles: ["admin", "operator"] },
  { id: "enterprise", label: "Infrastructure & Operations", icon: Building2, roles: ["admin", "operator"] },
  { id: "health", label: "Health Checks", icon: Shield, roles: ["admin", "operator", "viewer"] },
  { id: "alerts", label: "Alerts & Events", icon: Bell, roles: ["admin", "operator", "viewer"] },
  { id: "organization", label: "Organization", icon: Building2, roles: ["admin"], isEnterprise: true },
  { id: "integrations", label: "Integrations", icon: Plug, roles: ["admin"], isEnterprise: true },
  { id: "compliance", label: "Compliance", icon: Scale, roles: ["admin"], isEnterprise: true },
  { id: "users", label: "User Management", icon: Users, roles: ["admin"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function Sidebar({ currentPage, onPageChange, userRole }: SidebarProps) {
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gradient">iDrac Updater</h1>
            <p className="text-xs text-muted-foreground">Enterprise Edition</p>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10 text-sm",
                  currentPage === item.id && "bg-sidebar-accent text-sidebar-accent-foreground",
                  item.isEnterprise && "relative"
                )}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.isEnterprise && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                    PRO
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-4 left-4 w-56">
        <div className="card-enterprise p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-sm font-medium">System Status</span>
          </div>
          <p className="text-xs text-muted-foreground">Ready for operations</p>
        </div>
      </div>
    </div>
  );
}