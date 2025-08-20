import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVCenterService } from "@/hooks/useVCenterService";
import { VCenterSyncManager } from "./VCenterSyncManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit2,
  Server,
  Shield,
  Network
} from "lucide-react";

interface VCenterConfig {
  id?: string;
  name: string;
  hostname: string;
  username: string;
  password: string;
  port: number;
  ignore_ssl: boolean;
}

export function VCenterConfiguration() {
  const { vcenters, loadVCenters, refresh } = useVCenterService();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVCenter, setEditingVCenter] = useState<VCenterConfig | null>(null);
  const [formData, setFormData] = useState<VCenterConfig>({
    name: '',
    hostname: '',
    username: '',
    password: '',
    port: 443,
    ignore_ssl: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      hostname: '',
      username: '',
      password: '',
      port: 443,
      ignore_ssl: true
    });
    setEditingVCenter(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.hostname || !formData.username) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingVCenter?.id) {
        // Update existing
        const { error } = await supabase
          .from('vcenters')
          .update({
            name: formData.name,
            hostname: formData.hostname,
            username: formData.username,
            port: formData.port,
            ignore_ssl: formData.ignore_ssl,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVCenter.id);

        if (error) throw error;

        toast({
          title: "vCenter Updated",
          description: "Configuration has been updated successfully",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('vcenters')
          .insert({
            name: formData.name,
            hostname: formData.hostname,
            username: formData.username,
            port: formData.port,
            ignore_ssl: formData.ignore_ssl
          });

        if (error) throw error;

        toast({
          title: "vCenter Added",
          description: "New vCenter configuration has been saved",
        });
      }

      await loadVCenters();
      await refresh(); // Refresh all vCenter data
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to save vCenter:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save vCenter configuration",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vcenter: any) => {
    setEditingVCenter(vcenter);
    setFormData({
      id: vcenter.id,
      name: vcenter.name,
      hostname: vcenter.hostname,
      username: vcenter.username,
      password: '', // Don't populate password for security
      port: vcenter.port,
      ignore_ssl: vcenter.ignore_ssl
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (vcenterId: string) => {
    if (!confirm('Are you sure you want to delete this vCenter configuration?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vcenters')
        .delete()
        .eq('id', vcenterId);

      if (error) throw error;

      toast({
        title: "vCenter Deleted",
        description: "Configuration has been removed",
      });

      await loadVCenters();
      await refresh(); // Refresh all vCenter data
    } catch (error: any) {
      console.error('Failed to delete vCenter:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete vCenter configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">vCenter Management</h2>
          <p className="text-muted-foreground">
            Centralized configuration and synchronization for all vCenter connections
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add vCenter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVCenter ? 'Edit vCenter' : 'Add vCenter'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Production vCenter"
                />
              </div>
              <div>
                <Label htmlFor="hostname">Hostname/IP</Label>
                <Input
                  id="hostname"
                  value={formData.hostname}
                  onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
                  placeholder="vcenter.company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="administrator@vsphere.local"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingVCenter ? "Leave blank to keep current" : "Enter password"}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ignore-ssl"
                  checked={formData.ignore_ssl}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ignore_ssl: checked }))}
                />
                <Label htmlFor="ignore-ssl">Ignore SSL Certificate Errors</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  {editingVCenter ? 'Update' : 'Add'} vCenter
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-4">
        {vcenters.map((vcenter) => (
          <Card key={vcenter.id} className="card-enterprise">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>{vcenter.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {vcenter.hostname}:{vcenter.port}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {vcenter.ignore_ssl && (
                    <Shield className="w-4 h-4 text-yellow-500" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(vcenter)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(vcenter.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Username:</span>
                  <div className="font-medium">{vcenter.username}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Port:</span>
                  <div className="font-medium">{vcenter.port}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">SSL:</span>
                  <div className="font-medium">
                    {vcenter.ignore_ssl ? 'Disabled' : 'Enabled'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Synchronization Manager - Integrated with the app */}
      <div className="mb-6">
        <VCenterSyncManager showAllVCenters={true} />
      </div>

      {/* Quick Integration Status */}
      <Card className="card-enterprise mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            vCenter Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {vcenters.length}
              </div>
              <div className="text-sm text-muted-foreground">Connected vCenters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">
                {vcenters.filter(vc => 
                  new Date().getTime() - new Date(vc.updated_at).getTime() < 3600000
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Recently Synced</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {/* This would show managed hosts from integrated servers */}
                TBD
              </div>
              <div className="text-sm text-muted-foreground">Managed Hosts</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}