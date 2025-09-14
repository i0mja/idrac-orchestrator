import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVCenterService } from "@/hooks/useVCenterService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Server, 
  Shield, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  PlayCircle,
  AlertCircle
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

export function VCenterConnections() {
  const { vcenters, loadVCenters, testConnection } = useVCenterService();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVCenter, setEditingVCenter] = useState<VCenterConfig | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | null>>({});
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
    if (!formData.name || !formData.hostname || !formData.username || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const vCenterData = {
        name: formData.name,
        hostname: formData.hostname,
        username: formData.username,
        password: formData.password,
        port: formData.port,
        ignore_ssl: formData.ignore_ssl,
        updated_at: new Date().toISOString()
      };

      if (editingVCenter?.id) {
        const { error } = await supabase
          .from('vcenters')
          .update(vCenterData)
          .eq('id', editingVCenter.id);

        if (error) throw error;

        toast({
          title: "vCenter Updated",
          description: "Configuration has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('vcenters')
          .insert(vCenterData);

        if (error) throw error;

        toast({
          title: "vCenter Added",
          description: "New vCenter configuration has been saved",
        });
      }

      await loadVCenters();
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
      password: '',
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
      setConnectionStatus(prev => {
        const updated = { ...prev };
        delete updated[vcenterId];
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to delete vCenter:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete vCenter configuration",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async (vcenterId: string) => {
    setTestingConnections(prev => new Set([...prev, vcenterId]));
    
    try {
      const result = await testConnection(vcenterId);
      setConnectionStatus(prev => ({
        ...prev,
        [vcenterId]: result ? 'success' : 'error'
      }));
      
      toast({
        title: result ? "Connection Successful" : "Connection Failed",
        description: result 
          ? "vCenter connection is working properly" 
          : "Failed to connect to vCenter server",
        variant: result ? "default" : "destructive",
      });
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [vcenterId]: 'error'
      }));
    } finally {
      setTestingConnections(prev => {
        const updated = new Set([...prev]);
        updated.delete(vcenterId);
        return updated;
      });
    }
  };

  const getConnectionStatusBadge = (vcenterId: string) => {
    const status = connectionStatus[vcenterId];
    if (testingConnections.has(vcenterId)) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Testing
        </Badge>
      );
    }
    
    if (status === 'success') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    }
    
    if (status === 'error') {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <AlertCircle className="w-3 h-3 mr-1" />
        Untested
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">vCenter Connections</h2>
          <p className="text-muted-foreground">
            Manage your vCenter server connections and test connectivity
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add vCenter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVCenter ? 'Edit vCenter Connection' : 'Add vCenter Connection'}
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
                <Label htmlFor="hostname">Hostname/IP Address</Label>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 443 }))}
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

      {/* vCenter Cards */}
      <div className="grid gap-4">
        {vcenters.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Server className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No vCenter Connections</h3>
              <p className="text-muted-foreground mb-4">
                Add your first vCenter server to start managing your virtual infrastructure
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add vCenter
              </Button>
            </CardContent>
          </Card>
        ) : (
          vcenters.map((vcenter) => (
            <Card key={vcenter.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {vcenter.name}
                        {getConnectionStatusBadge(vcenter.id)}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {vcenter.hostname}:{vcenter.port}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {vcenter.ignore_ssl && (
                      <Shield className="w-4 h-4 text-yellow-500" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(vcenter.id)}
                      disabled={testingConnections.has(vcenter.id)}
                      className="px-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vcenter)}
                      className="px-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(vcenter.id)}
                      className="px-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Username:</span>
                    <div className="font-medium">{vcenter.username}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SSL Verification:</span>
                    <div className="font-medium">
                      {vcenter.ignore_ssl ? 'Disabled' : 'Enabled'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <div className="font-medium">
                      {formatDistanceToNow(new Date(vcenter.updated_at))} ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}