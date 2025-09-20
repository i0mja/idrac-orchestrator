import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useOmeConnections } from '@/hooks/useOmeConnections';
import { useCredentialProfiles } from '@/hooks/useCredentialProfiles';
import { useToast } from '@/hooks/use-toast';
import { 
  Server, 
  Plus, 
  TestTube, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';

export function OmeConnectionManager() {
  const { 
    connections, 
    loading, 
    selectedConnection, 
    setSelectedConnection,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection 
  } = useOmeConnections();
  const { profiles } = useCredentialProfiles();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    port: 443,
    use_ssl: true,
    credential_profile_id: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());

  const resetForm = () => {
    setFormData({
      name: '',
      hostname: '',
      port: 443,
      use_ssl: true,
      credential_profile_id: '',
    });
    setEditingConnection(null);
  };

  const handleOpenDialog = (connection?: any) => {
    if (connection) {
      setFormData({
        name: connection.name,
        hostname: connection.hostname,
        port: connection.port,
        use_ssl: connection.use_ssl,
        credential_profile_id: connection.credential_profile_id,
      });
      setEditingConnection(connection.id);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setFormLoading(true);

      if (!formData.name || !formData.hostname || !formData.credential_profile_id) {
        throw new Error('Please fill in all required fields');
      }

      if (editingConnection) {
        await updateConnection(editingConnection, formData);
      } else {
        await createConnection(formData);
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save connection',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      setTestingConnections(prev => new Set(prev).add(connectionId));
      await testConnection(connectionId);
      toast({
        title: 'Success',
        description: 'Connection test successful',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Connection Test Failed',
        description: error.message || 'Failed to connect to OME instance',
      });
    } finally {
      setTestingConnections(prev => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      await deleteConnection(connectionId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'error':
        return 'destructive';
      case 'testing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading connections...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>OME Connections</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingConnection ? 'Edit OME Connection' : 'Add OME Connection'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Connection Name *</Label>
                  <Input
                    id="name"
                    placeholder="Production OME"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hostname">Hostname/IP Address *</Label>
                  <Input
                    id="hostname"
                    placeholder="ome.company.local"
                    value={formData.hostname}
                    onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 443 }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ssl">Use SSL</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="ssl"
                        checked={formData.use_ssl}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_ssl: checked }))}
                      />
                      <Label htmlFor="ssl" className="text-sm">
                        {formData.use_ssl ? 'HTTPS' : 'HTTP'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credentials">Credential Profile *</Label>
                  <Select
                    value={formData.credential_profile_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, credential_profile_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select credential profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} ({profile.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={formLoading}>
                  {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingConnection ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No OME connections configured</p>
            <p className="text-sm">Add a connection to get started</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <Label>Active Connection</Label>
              <Select
                value={selectedConnection?.id || ''}
                onValueChange={(value) => {
                  const connection = connections.find(c => c.id === value);
                  setSelectedConnection(connection || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select OME connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(connection.status)}
                        <span>{connection.name}</span>
                        <span className="text-muted-foreground text-sm">
                          ({connection.hostname})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <Label>All Connections</Label>
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(connection.status)}
                    <div>
                      <div className="font-medium">{connection.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {connection.hostname}:{connection.port}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(connection.status)}>
                      {connection.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(connection.id)}
                      disabled={testingConnections.has(connection.id)}
                    >
                      {testingConnections.has(connection.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(connection)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteConnection(connection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
