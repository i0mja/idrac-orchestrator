import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Clock, 
  Plus, 
  RefreshCw, 
  Settings,
  Edit2,
  Trash2
} from "lucide-react";

interface MaintenanceWindow {
  id: string;
  name: string;
  cluster_name?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence: 'none' | 'weekly' | 'monthly';
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface MaintenanceWindowManagerProps {
  servers?: any[];
}

export function MaintenanceWindowManager({ servers = [] }: MaintenanceWindowManagerProps) {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newWindow, setNewWindow] = useState({
    name: '',
    cluster_name: '',
    start_time: '',
    end_time: '',
    timezone: 'UTC',
    recurrence: 'none' as const,
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMaintenanceWindows();
  }, []);

  const loadMaintenanceWindows = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('maintenance-windows', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setWindows(data.result || []);
    } catch (error) {
      console.error('Failed to load maintenance windows:', error);
      toast({
        title: "Error",
        description: "Failed to load maintenance windows",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createMaintenanceWindow = async () => {
    if (!newWindow.name || !newWindow.start_time || !newWindow.end_time) {
      toast({
        title: "Missing Information",
        description: "Name, start time, and end time are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('maintenance-windows', {
        body: {
          action: 'create',
          window: newWindow
        }
      });

      if (error) throw error;

      setNewWindow({
        name: '',
        cluster_name: '',
        start_time: '',
        end_time: '',
        timezone: 'UTC',
        recurrence: 'none',
        description: ''
      });

      await loadMaintenanceWindows();
      toast({
        title: "Maintenance Window Created",
        description: "Maintenance window has been scheduled successfully",
      });
    } catch (error) {
      console.error('Failed to create maintenance window:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance window",
        variant: "destructive",
      });
    }
  };

  const deleteMaintenanceWindow = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('maintenance-windows', {
        body: {
          action: 'delete',
          windowId: id
        }
      });

      if (error) throw error;

      await loadMaintenanceWindows();
      toast({
        title: "Maintenance Window Deleted",
        description: "Maintenance window has been removed",
      });
    } catch (error) {
      console.error('Failed to delete maintenance window:', error);
      toast({
        title: "Error",
        description: "Failed to delete maintenance window",
        variant: "destructive",
      });
    }
  };

  const getRecurrenceBadge = (recurrence: string) => {
    switch (recurrence) {
      case 'weekly': return <Badge variant="outline" className="text-green-600">Weekly</Badge>;
      case 'monthly': return <Badge variant="outline" className="text-blue-600">Monthly</Badge>;
      default: return <Badge variant="outline">One-time</Badge>;
    }
  };

  const clusters = Array.from(new Set(servers.map(s => s.cluster_name).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Maintenance Windows</h3>
          <p className="text-sm text-muted-foreground">
            Schedule maintenance windows for coordinated updates
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Window
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Maintenance Window</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="window-name">Window Name</Label>
                <Input
                  id="window-name"
                  value={newWindow.name}
                  onChange={(e) => setNewWindow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Monthly Security Updates"
                />
              </div>
              <div>
                <Label htmlFor="cluster">Target Cluster (Optional)</Label>
                <Select value={newWindow.cluster_name} onValueChange={(value) => setNewWindow(prev => ({ ...prev, cluster_name: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clusters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All clusters</SelectItem>
                    {clusters.map((cluster) => (
                      <SelectItem key={cluster} value={cluster}>
                        {cluster}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={newWindow.start_time}
                    onChange={(e) => setNewWindow(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={newWindow.end_time}
                    onChange={(e) => setNewWindow(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select value={newWindow.recurrence} onValueChange={(value: any) => setNewWindow(prev => ({ ...prev, recurrence: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newWindow.description}
                  onChange={(e) => setNewWindow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Monthly critical firmware updates"
                />
              </div>
              <Button onClick={createMaintenanceWindow} className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Create Window
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Maintenance Windows List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading maintenance windows...</span>
          </div>
        ) : windows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Maintenance Windows</h3>
              <p className="text-muted-foreground mb-4">
                Create maintenance windows to schedule coordinated firmware updates
              </p>
            </CardContent>
          </Card>
        ) : (
          windows.map((window) => (
            <Card key={window.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {window.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getRecurrenceBadge(window.recurrence)}
                    {window.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span>
                    <p className="font-medium">{new Date(window.start_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>
                    <p className="font-medium">{new Date(window.end_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cluster:</span>
                    <p className="font-medium">{window.cluster_name || 'All clusters'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timezone:</span>
                    <p className="font-medium">{window.timezone}</p>
                  </div>
                </div>
                
                {window.description && (
                  <div>
                    <span className="text-muted-foreground text-sm">Description:</span>
                    <p className="text-sm">{window.description}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMaintenanceWindow(window.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}