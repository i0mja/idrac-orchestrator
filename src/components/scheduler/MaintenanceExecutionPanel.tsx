import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, 
  Square, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";

interface MaintenanceExecutionPanelProps {
  windows: any[];
  onRefresh: () => void;
}

export function MaintenanceExecutionPanel({ windows, onRefresh }: MaintenanceExecutionPanelProps) {
  const [executingWindows, setExecutingWindows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const executeMaintenanceWindow = async (windowId: string, windowName: string) => {
    setExecutingWindows(prev => new Set(prev).add(windowId));

    try {
      toast({
        title: "Starting Maintenance",
        description: `Initiating maintenance window: ${windowName}`,
      });

      const { data, error } = await supabase.functions.invoke('maintenance-orchestrator', {
        body: {
          action: 'execute_maintenance',
          window_id: windowId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Maintenance Started",
          description: `Successfully initiated maintenance for: ${windowName}`,
        });
      } else {
        throw new Error(data?.message || 'Unknown error');
      }

      onRefresh();

    } catch (error) {
      console.error('Failed to execute maintenance window:', error);
      toast({
        title: "Execution Failed",
        description: `Failed to start maintenance: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setExecutingWindows(prev => {
        const newSet = new Set(prev);
        newSet.delete(windowId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'active':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'active': return 'text-orange-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const canExecuteWindow = (window: any) => {
    const now = new Date();
    const scheduledDate = new Date(window.scheduled_date);
    const todayStr = now.toISOString().split('T')[0];
    const windowDateStr = scheduledDate.toISOString().split('T')[0];
    
    // Can execute if it's scheduled for today or in the past, and status is scheduled
    return window.status === 'scheduled' && windowDateStr <= todayStr;
  };

  const scheduledWindows = windows.filter(w => ['scheduled', 'active'].includes(w.status));
  const completedWindows = windows.filter(w => ['completed', 'cancelled'].includes(w.status));

  if (windows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No maintenance windows found. Schedule a maintenance window to get started.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active/Scheduled Windows */}
      {scheduledWindows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Active & Scheduled Windows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledWindows.map((window) => (
                <Card key={window.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(window.status)}
                        <h4 className="font-medium">{window.name}</h4>
                        <Badge variant="outline" className={getStatusColor(window.status)}>
                          {window.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <div>Datacenter: {window.datacenters?.name}</div>
                        <div>Scheduled: {new Date(window.scheduled_date).toLocaleDateString()} at {window.start_time?.slice(0, 5)}</div>
                        <div>Max concurrent updates: {window.max_concurrent_updates}</div>
                      </div>

                      {window.status === 'active' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Maintenance in progress...</span>
                          </div>
                          <Progress value={50} className="h-2" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {window.status === 'scheduled' && canExecuteWindow(window) && (
                        <Button
                          onClick={() => executeMaintenanceWindow(window.id, window.name)}
                          disabled={executingWindows.has(window.id)}
                          size="sm"
                        >
                          {executingWindows.has(window.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {executingWindows.has(window.id) ? 'Starting...' : 'Execute Now'}
                        </Button>
                      )}
                      
                      {window.status === 'active' && (
                        <Button variant="outline" size="sm" disabled>
                          <Square className="h-4 w-4 mr-2" />
                          Stop (Coming Soon)
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Windows */}
      {completedWindows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Completed Windows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedWindows.slice(0, 5).map((window) => (
                <div key={window.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(window.status)}
                    <div>
                      <div className="font-medium">{window.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(window.scheduled_date).toLocaleDateString()} - {window.datacenters?.name}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(window.status)}>
                    {window.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Info */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Automatic Execution:</strong> Maintenance windows are automatically executed every 5 minutes when their scheduled time arrives. 
          You can also manually execute scheduled windows using the "Execute Now" button.
        </AlertDescription>
      </Alert>
    </div>
  );
}