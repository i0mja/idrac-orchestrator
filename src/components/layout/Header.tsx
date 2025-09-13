import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useServers } from "@/hooks/useServers";
import { NotificationDropdown } from "./NotificationDropdown";

interface HeaderProps {
  userRole: "admin" | "operator" | "viewer";
  userName: string;
}

export function Header({ userRole, userName }: HeaderProps) {
  const { signOut } = useAuth();
  const { servers, loading } = useServers();
  
  const serverCount = servers.length;
  const onlineCount = servers.filter(server => server.status === 'online').length;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "operator": return "secondary"; 
      case "viewer": return "outline";
      default: return "outline";
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-muted animate-pulse' : serverCount > 0 ? 'bg-success animate-pulse' : 'bg-warning'}`} />
            <span className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : serverCount > 0 ? `${onlineCount}/${serverCount} servers online` : 'No servers connected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NotificationDropdown />

          <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-muted/50">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs h-4">
                {userRole.toUpperCase()}
              </Badge>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}