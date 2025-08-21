import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Building2 } from "lucide-react";

interface MaintenanceSchedulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datacenters: any[];
  onWindowCreated: () => void;
}

export function MaintenanceSchedulingDialog({ 
  open, 
  onOpenChange, 
  datacenters, 
  onWindowCreated 
}: MaintenanceSchedulingDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    datacenter_id: '',
    start_time: '02:00',
    end_time: '06:00',
    max_concurrent_updates: 3,
    recurrence: 'weekly',
    notify_before_hours: 24
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.datacenter_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the datacenter with new maintenance window
      const { error: dcError } = await supabase
        .from('datacenters')
        .update({
          maintenance_window_start: formData.start_time + ':00',
          maintenance_window_end: formData.end_time + ':00'
        })
        .eq('id', formData.datacenter_id);

      if (dcError) throw dcError;

      // Create system event
      await supabase
        .from('system_events')
        .insert({
          title: `Maintenance Window Scheduled: ${formData.name}`,
          description: `New maintenance window configured for datacenter`,
          event_type: 'maintenance_scheduled',
          severity: 'info',
          metadata: {
            datacenter_id: formData.datacenter_id,
            window_start: formData.start_time,
            window_end: formData.end_time,
            max_concurrent: formData.max_concurrent_updates
          }
        });

      toast({
        title: "Maintenance Window Scheduled",
        description: `"${formData.name}" has been scheduled successfully`,
      });

      onWindowCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: '',
        description: '',
        datacenter_id: '',
        start_time: '02:00',
        end_time: '06:00',
        max_concurrent_updates: 3,
        recurrence: 'weekly',
        notify_before_hours: 24
      });

    } catch (error) {
      console.error('Error scheduling maintenance window:', error);
      toast({
        title: "Error",
        description: "Failed to schedule maintenance window",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Maintenance Window
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Window Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Weekend Maintenance Window"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datacenter">Datacenter *</Label>
              <Select value={formData.datacenter_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, datacenter_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select datacenter" />
                </SelectTrigger>
                <SelectContent>
                  {datacenters.map((dc) => (
                    <SelectItem key={dc.id} value={dc.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{dc.name} - {dc.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the maintenance window purpose and scope..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_concurrent">Max Concurrent Updates</Label>
              <Input
                id="max_concurrent"
                type="number"
                min="1"
                max="10"
                value={formData.max_concurrent_updates}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_concurrent_updates: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select value={formData.recurrence} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, recurrence: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify_hours">Notify Before (Hours)</Label>
              <Input
                id="notify_hours"
                type="number"
                min="1"
                max="168"
                value={formData.notify_before_hours}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  notify_before_hours: parseInt(e.target.value) || 24 
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Schedule Window
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}