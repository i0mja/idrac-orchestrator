import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMaintenanceWindows } from "@/hooks/useMaintenanceWindows";
import { MaintenanceSchedulingDialog } from "./MaintenanceSchedulingDialog";
import { MaintenanceExecutionPanel } from "./MaintenanceExecutionPanel";
import { 
  Calendar, 
  Clock, 
  Plus, 
  RefreshCw, 
  Edit2,
  Trash2,
  Building2,
  AlertCircle,
  Play
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MaintenanceWindowManagerProps {
  servers?: any[];
}

export function MaintenanceWindowManager({ servers = [] }: MaintenanceWindowManagerProps) {
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false);
  const { windows, datacenters, isLoading, refetch, deleteWindow } = useMaintenanceWindows();

  const formatTime = (timeString: string) => {
    return timeString?.slice(0, 5) || '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="outline" className="text-blue-600">Scheduled</Badge>;
      case 'active': return <Badge variant="default" className="text-green-600">Active</Badge>;
      case 'completed': return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecurrenceBadge = (recurrence: string) => {
    switch (recurrence) {
      case 'weekly': return <Badge variant="outline" className="text-green-600">Weekly</Badge>;
      case 'monthly': return <Badge variant="outline" className="text-blue-600">Monthly</Badge>;
      case 'quarterly': return <Badge variant="outline" className="text-purple-600">Quarterly</Badge>;
      default: return <Badge variant="outline">One-time</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading maintenance windows...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Maintenance Management</h3>
          <p className="text-sm text-muted-foreground">
            Schedule, execute, and monitor maintenance windows
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setIsSchedulingDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Schedule Maintenance
          </Button>
        </div>
      </div>

      <Tabs defaultValue="execution" className="space-y-6">
        <TabsList>
          <TabsTrigger value="execution" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Execution
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Defaults
          </TabsTrigger>
        </TabsList>

        {/* Execution Tab */}
        <TabsContent value="execution">
          <MaintenanceExecutionPanel 
            windows={windows}
            onRefresh={refetch}
          />
        </TabsContent>

        {/* Schedule Management Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduled Maintenance Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {windows.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No maintenance windows scheduled. Click "Schedule Maintenance" to create specific maintenance events.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {windows.map((window) => (
                    <Card key={window.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{window.name}</h4>
                            {getStatusBadge(window.status)}
                            {getRecurrenceBadge(window.recurrence)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span>{window.datacenters?.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 w-4" />
                              <span>{formatDate(window.scheduled_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(window.start_time)} - {formatTime(window.end_time)}</span>
                            </div>
                          </div>

                          {window.description && (
                            <p className="text-sm text-muted-foreground">{window.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Max concurrent: {window.max_concurrent_updates}</span>
                            <span>Notify {window.notification_hours_before}h before</span>
                            {window.next_occurrence && (
                              <span>Next: {formatDate(window.next_occurrence)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteWindow(window.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datacenter Defaults Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Datacenter Default Windows
              </CardTitle>
            </CardHeader>
            <CardContent>
              {datacenters.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No datacenters configured. Set up datacenters in the OOBE to define default maintenance windows.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {datacenters.map((datacenter) => (
                    <Card key={datacenter.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{datacenter.name}</h4>
                          <Badge variant="secondary">Default</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{datacenter.location}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatTime(datacenter.maintenance_window_start)} - {formatTime(datacenter.maintenance_window_end)} daily
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scheduling Dialog */}
      <MaintenanceSchedulingDialog
        open={isSchedulingDialogOpen}
        onOpenChange={setIsSchedulingDialogOpen}
        datacenters={datacenters}
        onWindowCreated={refetch}
      />
    </div>
  );
}