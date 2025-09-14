import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Clock, 
  Plus, 
  Edit, 
  MapPin, 
  Mail, 
  Globe,
  Settings,
  AlertCircle,
  Network,
  Trash2,
  Info
} from "lucide-react";

interface IpScope {
  subnet: string;
  vlan?: number;
  description?: string;
}

interface Datacenter {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
  contact_email: string | null;
  maintenance_window_start: string;
  maintenance_window_end: string;
  is_active: boolean;
  ip_scopes: IpScope[];
  created_at: string;
}

interface DatacenterFormProps {
  datacenter?: Datacenter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DatacenterForm({ datacenter, open, onOpenChange, onSuccess }: DatacenterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    timezone: 'UTC',
    contact_email: '',
    maintenance_window_start: '02:00:00',
    maintenance_window_end: '06:00:00',
    is_active: true,
    ip_scopes: [] as IpScope[]
  });

  const { toast } = useToast();

  useEffect(() => {
    if (datacenter) {
      setFormData({
        name: datacenter.name,
        location: datacenter.location || '',
        timezone: datacenter.timezone,
        contact_email: datacenter.contact_email || '',
        maintenance_window_start: datacenter.maintenance_window_start,
        maintenance_window_end: datacenter.maintenance_window_end,
        is_active: datacenter.is_active,
        ip_scopes: datacenter.ip_scopes || []
      });
    } else {
      setFormData({
        name: '',
        location: '',
        timezone: 'UTC',
        contact_email: '',
        maintenance_window_start: '02:00:00',
        maintenance_window_end: '06:00:00',
        is_active: true,
        ip_scopes: []
      });
    }
  }, [datacenter, open]);

  const validateMaintenanceWindow = () => {
    const start = formData.maintenance_window_start;
    const end = formData.maintenance_window_end;
    
    if (start >= end) {
      toast({
        title: "Invalid Maintenance Window",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return false;
    }
    
    // Calculate window duration (handle cross-midnight windows)
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    const duration = endMinutes > startMinutes ? endMinutes - startMinutes : (24 * 60) - startMinutes + endMinutes;
    
    if (duration < 60) {
      toast({
        title: "Maintenance Window Too Short",
        description: "Maintenance window must be at least 1 hour",
        variant: "destructive"
      });
      return false;
    }
    
    if (duration > 8 * 60) {
      toast({
        title: "Maintenance Window Too Long",
        description: "Maintenance window should not exceed 8 hours",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Datacenter name is required",
        variant: "destructive"
      });
      return;
    }

    if (!validateMaintenanceWindow()) {
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        ip_scopes: formData.ip_scopes as any
      };

      if (datacenter) {
        const { error } = await supabase
          .from('datacenters')
          .update(dataToSubmit)
          .eq('id', datacenter.id);

        if (error) throw error;

        toast({
          title: "Datacenter Updated",
          description: `${formData.name} has been updated successfully`
        });
      } else {
        const { error } = await supabase
          .from('datacenters')
          .insert(dataToSubmit);

        if (error) throw error;

        toast({
          title: "Datacenter Created",
          description: `${formData.name} has been created successfully`
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving datacenter:', error);
      toast({
        title: "Error",
        description: "Failed to save datacenter",
        variant: "destructive"
      });
    }
  };

  const addIpScope = () => {
    setFormData(prev => ({
      ...prev,
      ip_scopes: [...prev.ip_scopes, { subnet: '', vlan: undefined, description: '' }]
    }));
  };

  const updateIpScope = (index: number, field: keyof IpScope, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ip_scopes: prev.ip_scopes.map((scope, i) => 
        i === index ? { ...scope, [field]: value } : scope
      )
    }));
  };

  const removeIpScope = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ip_scopes: prev.ip_scopes.filter((_, i) => i !== index)
    }));
  };

  const timezones = [
    'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Australia/Sydney'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {datacenter ? 'Edit Datacenter' : 'Add New Datacenter'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Datacenter Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="DC-East01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="New York, NY"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="admin@company.com"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              <Label className="text-base font-medium">IP Scopes & Network Ranges</Label>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>Define IP ranges that belong to this datacenter for auto-discovery</span>
              </div>
              
              {formData.ip_scopes.map((scope, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Subnet (CIDR)</Label>
                    <Input
                      placeholder="192.168.1.0/24"
                      value={scope.subnet}
                      onChange={(e) => updateIpScope(index, 'subnet', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">VLAN</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={scope.vlan || ''}
                      onChange={(e) => updateIpScope(index, 'vlan', parseInt(e.target.value) || undefined)}
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="Production Network"
                      value={scope.description || ''}
                      onChange={(e) => updateIpScope(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIpScope(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIpScope}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add IP Scope
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <Label className="text-base font-medium">Maintenance Window</Label>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Define the preferred time window for scheduled maintenance (in datacenter local time)</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintenance_start">Start Time</Label>
                  <Input
                    id="maintenance_start"
                    type="time"
                    value={formData.maintenance_window_start}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maintenance_window_start: e.target.value + ':00' 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_end">End Time</Label>
                  <Input
                    id="maintenance_end"
                    type="time"
                    value={formData.maintenance_window_end}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maintenance_window_end: e.target.value + ':00' 
                    }))}
                  />
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Window Duration: {(() => {
                  const start = formData.maintenance_window_start;
                  const end = formData.maintenance_window_end;
                  const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
                  const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
                  const duration = endMinutes > startMinutes ? endMinutes - startMinutes : (24 * 60) - startMinutes + endMinutes;
                  const hours = Math.floor(duration / 60);
                  const minutes = duration % 60;
                  return `${hours}h ${minutes}m`;
                })()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              <Label htmlFor="is_active">Active datacenter</Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="w-full sm:w-auto"
              >
                {datacenter ? 'Update' : 'Create'} Datacenter
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DatacenterManagement() {
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDatacenter, setSelectedDatacenter] = useState<Datacenter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchDatacenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('datacenters')
        .select('*')
        .order('name');

      if (error) throw error;
      setDatacenters((data || []).map(dc => ({
        ...dc,
        ip_scopes: (dc.ip_scopes as any) || []
      })));
    } catch (error) {
      console.error('Error fetching datacenters:', error);
      toast({
        title: "Error",
        description: "Failed to load datacenters",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatacenters();
  }, []);

  const handleEdit = (datacenter: Datacenter) => {
    setSelectedDatacenter(datacenter);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedDatacenter(null);
    setDialogOpen(true);
  };

  const formatMaintenanceWindow = (start: string, end: string, timezone: string) => {
    return `${start.slice(0, 5)} - ${end.slice(0, 5)} (${timezone})`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient">Datacenter Management</h1>
              <p className="text-muted-foreground text-lg">Loading datacenter configurations...</p>
            </div>
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Datacenter Management</h2>
          <p className="text-muted-foreground">
            Manage datacenters and their maintenance windows
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Datacenter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datacenters.map((datacenter) => (
          <Card key={datacenter.id} className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {datacenter.name}
                </div>
                <Badge variant={datacenter.is_active ? "default" : "secondary"}>
                  {datacenter.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {datacenter.location && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3" />
                    {datacenter.location}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span>Timezone: {datacenter.timezone}</span>
              </div>
              
              {datacenter.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{datacenter.contact_email}</span>
                </div>
              )}
              
              {datacenter.ip_scopes && datacenter.ip_scopes.length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Network className="w-4 h-4" />
                    Network Scopes ({datacenter.ip_scopes.length})
                  </div>
                  <div className="space-y-2">
                    {datacenter.ip_scopes.map((scope, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{scope.subnet}</span>
                          {scope.vlan && (
                            <Badge variant="outline" className="text-xs">
                              VLAN {scope.vlan}
                            </Badge>
                          )}
                        </div>
                        {scope.description && (
                          <div className="text-xs text-muted-foreground/80">
                            {scope.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Clock className="w-4 h-4" />
                  Maintenance Window
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatMaintenanceWindow(
                    datacenter.maintenance_window_start,
                    datacenter.maintenance_window_end,
                    datacenter.timezone
                  )}
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => handleEdit(datacenter)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Settings
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <DatacenterForm
        datacenter={selectedDatacenter}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchDatacenters}
      />
    </div>
  );
}