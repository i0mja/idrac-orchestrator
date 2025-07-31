import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, LogOut } from "lucide-react";

interface HeaderProps {
  userRole: "admin" | "operator" | "viewer";
  userName: string;
}

export function Header({ userRole, userName }: HeaderProps) {
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
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Connected to 247 servers
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
          </Button>

          <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-muted/50">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs h-4">
                {userRole.toUpperCase()}
              </Badge>
            </div>
          </div>

          <Button variant="ghost" size="sm">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}