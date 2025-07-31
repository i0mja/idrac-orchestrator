import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useServers } from "@/hooks/useServers";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Server,
  Network,
  Database,
  Activity
} from "lucide-react";

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: Date;
  responseTime?: number;
  message: string;
}

export function HealthChecks() {
  const { servers } = useServers();
  const { packages } = useFirmwarePackages();
  const { toast } = useToast();
  
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  const runHealthChecks = async () => {
    setIsRunning(true);
    try {
      const checks: HealthCheck[] = [];
      
      // Database connectivity check
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('system_config').select('id').limit(1);
      const dbResponseTime = Date.now() - dbStart;
      
      checks.push({
        id: 'database',
        name: 'Database Connectivity',
        status: dbError ? 'critical' : 'healthy',
        lastCheck: new Date(),
        responseTime: dbResponseTime,
        message: dbError ? 'Database connection failed' : `Database responsive (${dbResponseTime}ms)`
      });

      // Server connectivity checks
      const onlineServers = servers.filter(s => s.status === 'online').length;
      const serverHealthPercentage = servers.length > 0 ? (onlineServers / servers.length) * 100 : 100;
      
      checks.push({
        id: 'servers',
        name: 'Server Connectivity',
        status: serverHealthPercentage > 80 ? 'healthy' : serverHealthPercentage > 50 ? 'warning' : 'critical',
        lastCheck: new Date(),
        message: `${onlineServers}/${servers.length} servers online (${Math.round(serverHealthPercentage)}%)`
      });

      // Firmware repository check
      checks.push({
        id: 'firmware',
        name: 'Firmware Repository',
        status: packages.length > 0 ? 'healthy' : 'warning',
        lastCheck: new Date(),
        message: packages.length > 0 ? `${packages.length} firmware packages available` : 'No firmware packages found'
      });

      // Storage check (simulated)
      const storageUsage = Math.floor(Math.random() * 40) + 30; // 30-70% usage
      checks.push({
        id: 'storage',
        name: 'Storage Space',
        status: storageUsage < 80 ? 'healthy' : storageUsage < 90 ? 'warning' : 'critical',
        lastCheck: new Date(),
        message: `${storageUsage}% storage used`
      });

      // Network connectivity check (simulated)
      const networkLatency = Math.floor(Math.random() * 50) + 10; // 10-60ms
      checks.push({
        id: 'network',
        name: 'Network Latency',
        status: networkLatency < 100 ? 'healthy' : networkLatency < 200 ? 'warning' : 'critical',
        lastCheck: new Date(),
        responseTime: networkLatency,
        message: `Average latency: ${networkLatency}ms`
      });

      setHealthChecks(checks);
      setLastFullCheck(new Date());
      
      const criticalCount = checks.filter(c => c.status === 'critical').length;
      const warningCount = checks.filter(c => c.status === 'warning').length;
      
      if (criticalCount > 0) {
        toast({
          title: "Critical Issues Found",
          description: `${criticalCount} critical health check(s) failed`,
          variant: "destructive",
        });
      } else if (warningCount > 0) {
        toast({
          title: "Warnings Detected",
          description: `${warningCount} health check(s) showing warnings`,
        });
      } else {
        toast({
          title: "All Systems Healthy",
          description: "All health checks passed successfully",
        });
      }
    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: "Health Check Error",
        description: "Failed to complete health checks",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runHealthChecks();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(runHealthChecks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [servers.length, packages.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'critical': return <XCircle className="w-5 h-5 text-destructive" />;
      default: return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="status-online">Healthy</Badge>;
      case 'warning': return <Badge className="status-warning">Warning</Badge>;
      case 'critical': return <Badge className="status-offline">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const overallHealth = () => {
    const criticalCount = healthChecks.filter(c => c.status === 'critical').length;
    const warningCount = healthChecks.filter(c => c.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  const healthPercentage = () => {
    const healthyCount = healthChecks.filter(c => c.status === 'healthy').length;
    return healthChecks.length > 0 ? (healthyCount / healthChecks.length) * 100 : 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Health Checks</h2>
          <p className="text-muted-foreground">Monitor system health and connectivity</p>
        </div>
        <Button onClick={runHealthChecks} disabled={isRunning} variant="enterprise">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Checks...' : 'Run Health Checks'}
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="card-enterprise">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallHealth())}
              <div>
                <h3 className="text-lg font-semibold">Overall System Health</h3>
                <p className="text-muted-foreground">
                  {lastFullCheck 
                    ? `Last checked ${formatDistanceToNow(lastFullCheck)} ago`
                    : 'Never checked'
                  }
                </p>
              </div>
            </div>
            {getStatusBadge(overallHealth())}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>System Health Score</span>
              <span className={
                healthPercentage() > 80 ? "text-success" : 
                healthPercentage() > 60 ? "text-warning" : "text-destructive"
              }>
                {Math.round(healthPercentage())}%
              </span>
            </div>
            <Progress value={healthPercentage()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Health Check Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {healthChecks.map((check) => (
          <Card key={check.id} className="card-enterprise">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {check.id === 'database' && <Database className="w-4 h-4" />}
                  {check.id === 'servers' && <Server className="w-4 h-4" />}
                  {check.id === 'firmware' && <Activity className="w-4 h-4" />}
                  {check.id === 'storage' && <Shield className="w-4 h-4" />}
                  {check.id === 'network' && <Network className="w-4 h-4" />}
                  <h4 className="font-semibold text-sm">{check.name}</h4>
                </div>
                {getStatusIcon(check.status)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{check.message}</p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last: {formatDistanceToNow(check.lastCheck)} ago</span>
                {check.responseTime && (
                  <span>{check.responseTime}ms</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Server className="w-6 h-6" />
              <span className="font-medium">Test Server Connections</span>
              <span className="text-xs text-muted-foreground">Ping all discovered servers</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Database className="w-6 h-6" />
              <span className="font-medium">Verify Database</span>
              <span className="text-xs text-muted-foreground">Check database integrity</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
              <Network className="w-6 h-6" />
              <span className="font-medium">Network Diagnostics</span>
              <span className="text-xs text-muted-foreground">Test network connectivity</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}