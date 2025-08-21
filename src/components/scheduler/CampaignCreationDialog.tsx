import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Building2, Shield, Cpu, HardDrive } from "lucide-react";

interface CampaignCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datacenters: any[];
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
                    <div className="text-xs text-muted-foreground">
                      {dc.maintenance_window_start} - {dc.maintenance_window_end}
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
              <Label htmlFor="window_start">Maintenance Window Start</Label>
              <Input
                id="window_start"
                type="time"
                value={formData.maintenance_window_start}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenance_window_start: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="window_end">Maintenance Window End</Label>
              <Input
                id="window_end"
                type="time"
                value={formData.maintenance_window_end}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenance_window_end: e.target.value }))}
              />
            </div>
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