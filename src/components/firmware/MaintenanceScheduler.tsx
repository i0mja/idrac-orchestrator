import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Edit,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface MaintenanceSchedulerProps {
  servers: any[];
}

interface MaintenanceWindow {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  affectedSystems: string[];
  approvalRequired: boolean;
}

export function MaintenanceScheduler({ servers }: MaintenanceSchedulerProps) {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [showCreateWindow, setShowCreateWindow] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWindow, setNewWindow] = useState({
    name: '',
    description: '',
    startDate: undefined as Date | undefined,
    startTime: '02:00',
    duration: 120, // minutes
    affectedSystems: [] as string[],
    approvalRequired: false,
    recurrence: 'none'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMaintenanceWindows();
  }, []);

  const loadMaintenanceWindows = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('maintenance-windows', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setWindows(data.result || []);
    } catch (error) {
      console.error('Failed to load maintenance windows:', error);
    }
  };

  const handleCreateWindow = async () => {
    if (!newWindow.name || !newWindow.startDate) {
      toast({
        title: "Missing Information",
        description: "Please provide window name and start date",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const startDateTime = new Date(newWindow.startDate);
      const [hours, minutes] = newWindow.startTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime.getTime() + newWindow.duration * 60000);

      const { data, error } = await supabase.functions.invoke('maintenance-windows', {
        body: {
          action: 'create',
          name: newWindow.name,
          description: newWindow.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          affectedSystems: newWindow.affectedSystems,
          approvalRequired: newWindow.approvalRequired,
          recurrence: newWindow.recurrence
        }
      });

      if (error) throw error;

      toast({
        title: "Maintenance Window Created",
        description: `${newWindow.name} scheduled for ${format(startDateTime, 'PPP')}`,
      });

      setShowCreateWindow(false);
      setNewWindow({
        name: '',
        description: '',
        startDate: undefined,
        startTime: '02:00',
        duration: 120,
        affectedSystems: [],
        approvalRequired: false,
        recurrence: 'none'
      });
      
      await loadMaintenanceWindows();

    } catch (error) {
      console.error('Failed to create maintenance window:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create maintenance window",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleScheduleUpdates = async (windowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('maintenance-windows', {
        body: {
          action: 'schedule',
          windowId: windowId
        }
      });

      if (error) throw error;

      toast({
        title: "Updates Scheduled",
        description: `${data.result.scheduledJobs} update jobs scheduled for maintenance window`,
      });

    } catch (error) {
      console.error('Failed to schedule updates:', error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule updates for maintenance window",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="outline" className="text-blue-600 border-blue-600">Scheduled</Badge>;
      case 'active': return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
      case 'completed': return <Badge variant="outline" className="text-gray-600 border-gray-600">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Maintenance Windows</h2>
          <p className="text-muted-foreground">
            Schedule and manage maintenance windows for firmware updates
          </p>
        </div>
        <Button onClick={() => setShowCreateWindow(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Window
        </Button>
      </div>

      {/* Create Window Form */}
      {showCreateWindow && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Create Maintenance Window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Window Name</label>
                <Input
                  placeholder="e.g., Monthly Firmware Updates"
                  value={newWindow.name}
                  onChange={(e) => setNewWindow({ ...newWindow, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newWindow.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newWindow.startDate ? format(newWindow.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newWindow.startDate}
                      onSelect={(date) => setNewWindow({ ...newWindow, startDate: date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={newWindow.startTime}
                  onChange={(e) => setNewWindow({ ...newWindow, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Select 
                  value={newWindow.duration.toString()} 
                  onValueChange={(value) => setNewWindow({ ...newWindow, duration: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the maintenance activities..."
                value={newWindow.description}
                onChange={(e) => setNewWindow({ ...newWindow, description: e.target.value })}
              />
            </div>

            {/* Affected Systems */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Affected Systems</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {servers.map((server) => (
                  <div key={server.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={server.id}
                      checked={newWindow.affectedSystems.includes(server.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewWindow({
                            ...newWindow,
                            affectedSystems: [...newWindow.affectedSystems, server.id]
                          });
                        } else {
                          setNewWindow({
                            ...newWindow,
                            affectedSystems: newWindow.affectedSystems.filter(id => id !== server.id)
                          });
                        }
                      }}
                    />
                    <label htmlFor={server.id} className="text-sm cursor-pointer">
                      {server.hostname} ({server.model || 'Unknown'})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approval"
                checked={newWindow.approvalRequired}
                onCheckedChange={(checked) => setNewWindow({ ...newWindow, approvalRequired: !!checked })}
              />
              <label htmlFor="approval" className="text-sm cursor-pointer">
                Require approval before execution
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateWindow(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWindow} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Window'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Windows List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {windows.map((window) => (
          <Card key={window.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{window.name}</CardTitle>
                {getStatusBadge(window.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{window.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Start:</span>
                  <p className="text-muted-foreground">
                    {format(new Date(window.startTime), 'PPP p')}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <p className="text-muted-foreground">{formatDuration(window.duration)}</p>
                </div>
                <div>
                  <span className="font-medium">Affected Systems:</span>
                  <p className="text-muted-foreground">{window.affectedSystems.length} servers</p>
                </div>
                <div>
                  <span className="font-medium">Approval:</span>
                  <p className="text-muted-foreground">
                    {window.approvalRequired ? 'Required' : 'Not required'}
                  </p>
                </div>
              </div>

              {window.status === 'scheduled' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleScheduleUpdates(window.id)}
                    className="gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Schedule Updates
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}

              {window.status === 'active' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Maintenance window is active</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Updates are currently being executed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {windows.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Maintenance Windows</h3>
            <p className="text-muted-foreground mb-6">
              Create maintenance windows to schedule firmware updates during planned downtime
            </p>
            <Button onClick={() => setShowCreateWindow(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Window
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}