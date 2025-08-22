import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Building2, Shield, Cpu, HardDrive, AlertTriangle, Info } from "lucide-react";

interface Datacenter {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
  maintenance_window_start: string;
  maintenance_window_end: string;
  is_active: boolean;
}

interface CampaignCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datacenters: Datacenter[];
  onCampaignCreated: () => void;
}

export function CampaignCreationDialog({ 
  open, 
  onOpenChange, 
  datacenters, 
  onCampaignCreated 
}: CampaignCreationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    update_type: 'firmware',
    priority: 'medium',
    rollout_strategy: 'sequential',
    target_datacenters: [] as string[],
    components: [] as string[],
    start_date: '',
    maintenance_window_start: '02:00',
    maintenance_window_end: '06:00',
    max_concurrent_updates: 3,
    requires_approval: true
  });

  const [scheduleWarnings, setScheduleWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const updateTypes = [
    { value: 'firmware', label: 'Firmware Update', icon: Shield },
    { value: 'bios', label: 'BIOS Update', icon: Cpu },
    { value: 'idrac', label: 'iDRAC Update', icon: Shield },
    { value: 'security_patch', label: 'Security Patch', icon: Shield },
    { value: 'emergency', label: 'Emergency Update', icon: Shield }
  ];

  const componentTypes = [
    'BIOS',
    'iDRAC',
    'NIC/LOM',
    'Storage Controller',
    'Power Supply',
    'System CPLD',
    'Lifecycle Controller'
  ];

  const rolloutStrategies = [
    { value: 'sequential', label: 'Sequential (One DC at a time)' },
    { value: 'parallel', label: 'Parallel (All DCs simultaneously)' },
    { value: 'canary', label: 'Canary (Test group first)' }
  ];

  const validateScheduleAgainstDatacenters = () => {
    const warnings: string[] = [];
    const scheduleStart = formData.maintenance_window_start;
    const scheduleEnd = formData.maintenance_window_end;

    const selectedDatacenters = datacenters.filter(dc => formData.target_datacenters.includes(dc.id));

    selectedDatacenters.forEach(dc => {
      const dcStart = dc.maintenance_window_start.slice(0, 5); // Remove seconds
      const dcEnd = dc.maintenance_window_end.slice(0, 5);

      // Convert times to minutes for comparison
      const scheduleStartMinutes = parseInt(scheduleStart.split(':')[0]) * 60 + parseInt(scheduleStart.split(':')[1]);
      const scheduleEndMinutes = parseInt(scheduleEnd.split(':')[0]) * 60 + parseInt(scheduleEnd.split(':')[1]);
      const dcStartMinutes = parseInt(dcStart.split(':')[0]) * 60 + parseInt(dcStart.split(':')[1]);
      const dcEndMinutes = parseInt(dcEnd.split(':')[0]) * 60 + parseInt(dcEnd.split(':')[1]);

      // Check if campaign window falls outside datacenter window
      if (scheduleStartMinutes < dcStartMinutes || scheduleEndMinutes > dcEndMinutes) {
        warnings.push(
          `${dc.name}: Campaign window (${scheduleStart}-${scheduleEnd}) is outside preferred maintenance window (${dcStart}-${dcEnd})`
        );
      }
    });

    setScheduleWarnings(warnings);
  };

  useEffect(() => {
    if (formData.target_datacenters.length > 0 && formData.maintenance_window_start && formData.maintenance_window_end) {
      validateScheduleAgainstDatacenters();
    } else {
      setScheduleWarnings([]);
    }
  }, [formData.target_datacenters, formData.maintenance_window_start, formData.maintenance_window_end, datacenters]);

  const handleDatacenterToggle = (datacenterId: string) => {
    setFormData(prev => ({
      ...prev,
      target_datacenters: prev.target_datacenters.includes(datacenterId)
        ? prev.target_datacenters.filter(id => id !== datacenterId)
        : [...prev.target_datacenters, datacenterId]
    }));
  };

  const handleComponentToggle = (component: string) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.includes(component)
        ? prev.components.filter(c => c !== component)
        : [...prev.components, component]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.target_datacenters.length || !formData.components.length) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create orchestration plan
      const { data, error } = await supabase
        .from('update_orchestration_plans')
        .insert({
          name: formData.name,
          server_ids: [], // Will be populated when servers are selected
          update_sequence: {
            update_type: formData.update_type,
            components: formData.components,
            rollout_strategy: formData.rollout_strategy,
            priority: formData.priority
          },
          safety_checks: {
            requires_approval: formData.requires_approval,
            max_concurrent_updates: formData.max_concurrent_updates,
            maintenance_window_start: formData.maintenance_window_start,
            maintenance_window_end: formData.maintenance_window_end
          },
          rollback_plan: {
            enabled: true,
            auto_rollback_on_failure: formData.priority === 'critical'
          },
          status: 'planned',
          total_steps: formData.target_datacenters.length
        })
        .select()
        .single();

      if (error) throw error;

      // Create system event
      await supabase
        .from('system_events')
        .insert({
          title: `Update Campaign Created: ${formData.name}`,
          description: `${formData.update_type} update campaign targeting ${formData.target_datacenters.length} datacenters`,
          event_type: 'campaign_created',
          severity: 'info',
          metadata: {
            campaign_id: data.id,
            target_datacenters: formData.target_datacenters,
            components: formData.components
          }
        });

      toast({
        title: "Campaign Created",
        description: `Update campaign "${formData.name}" has been created successfully`,
      });

      onCampaignCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: '',
        description: '',
        update_type: 'firmware',
        priority: 'medium',
        rollout_strategy: 'sequential',
        target_datacenters: [],
        components: [],
        start_date: '',
        maintenance_window_start: '02:00',
        maintenance_window_end: '06:00',
        max_concurrent_updates: 3,
        requires_approval: true
      });

    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create update campaign",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Update Campaign
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Q1 Security Update Campaign"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
              placeholder="Describe the purpose and scope of this update campaign..."
            />
          </div>

          {/* Update Type */}
          <div className="space-y-3">
            <Label>Update Type *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {updateTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.update_type === type.value
                        ? 'bg-primary/10 border-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, update_type: type.value }))}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Components */}
          <div className="space-y-3">
            <Label>Target Components *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {componentTypes.map((component) => (
                <div key={component} className="flex items-center space-x-2">
                  <Checkbox
                    id={component}
                    checked={formData.components.includes(component)}
                    onCheckedChange={() => handleComponentToggle(component)}
                  />
                  <Label htmlFor={component} className="text-sm">
                    {component}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Target Datacenters */}
          <div className="space-y-3">
            <Label>Target Datacenters *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {datacenters.map((dc) => (
                <div
                  key={dc.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.target_datacenters.includes(dc.id)
                      ? 'bg-primary/10 border-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleDatacenterToggle(dc.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <div>
                        <div className="font-medium">{dc.name}</div>
                        <div className="text-xs text-muted-foreground">{dc.location}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {dc.maintenance_window_start.slice(0, 5)} - {dc.maintenance_window_end.slice(0, 5)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dc.timezone}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rollout Strategy */}
          <div className="space-y-2">
            <Label>Rollout Strategy</Label>
            <Select value={formData.rollout_strategy} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, rollout_strategy: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rolloutStrategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="window_start">Campaign Window Start</Label>
                <Input
                  id="window_start"
                  type="time"
                  value={formData.maintenance_window_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, maintenance_window_start: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="window_end">Campaign Window End</Label>
                <Input
                  id="window_end"
                  type="time"
                  value={formData.maintenance_window_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, maintenance_window_end: e.target.value }))}
                />
              </div>
            </div>

            {/* Schedule Validation Warnings */}
            {scheduleWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Schedule Conflicts Detected:</div>
                    {scheduleWarnings.map((warning, index) => (
                      <div key={index} className="text-sm">{warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {formData.target_datacenters.length > 0 && scheduleWarnings.length === 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Campaign schedule aligns with all selected datacenter maintenance windows.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_approval"
                checked={formData.requires_approval}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, requires_approval: !!checked }))
                }
              />
              <Label htmlFor="requires_approval">Requires manual approval before execution</Label>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Campaign
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}