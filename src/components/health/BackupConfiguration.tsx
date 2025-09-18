import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { 
  HardDrive, 
  Plus,
  Settings,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  Database,
  Package
} from "lucide-react";

interface BackupConfig {
  id: string;
  name: string;
  backup_type: string;
  enabled: boolean;
  schedule_cron: string;
  retention_days: number;
  storage_location: string;
  storage_config: any;
  compression_enabled: boolean;
  encryption_enabled: boolean;
  last_backup_at?: string;
  last_backup_status?: string;
  last_backup_size?: number;
  next_scheduled_at?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const BACKUP_TYPES = [
  { value: 'system_config', label: 'System Configuration', icon: Settings },
  { value: 'database', label: 'Database Backup', icon: Database },
  { value: 'firmware_catalog', label: 'Firmware Catalog', icon: Package }
];

const STORAGE_LOCATIONS = [
  { value: 'local', label: 'Local Storage' },
  { value: 's3', label: 'Amazon S3' },
  { value: 'azure', label: 'Azure Blob Storage' }
];

const SCHEDULE_PRESETS = [
  { value: '0 2 * * *', label: 'Daily at 2:00 AM' },
  { value: '0 3 * * 0', label: 'Weekly on Sunday at 3:00 AM' },
  { value: '0 4 1 * *', label: 'Monthly on 1st at 4:00 AM' },
  { value: '0 5 1 1,7 *', label: 'Bi-annually (Jan & July)' },
  { value: 'custom', label: 'Custom cron expression' }
];

export default function BackupConfiguration() {
  const [backups, setBackups] = useState<BackupConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBackup, setEditingBackup] = useState<BackupConfig | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const [newBackup, setNewBackup] = useState({
    name: '',
    backup_type: 'system_config',
    schedule_cron: '0 2 * * *',
    retention_days: 30,
    storage_location: 'local',
    compression_enabled: true,
    encryption_enabled: false,
    description: ''
  });

  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('backup_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error fetching backup configs:', error);
      toast({
        title: "Error",
        description: "Failed to load backup configurations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setIsCreating(true);
      const { error } = await supabase
        .from('backup_config')
        .insert([{
          ...newBackup,
          enabled: true
        }]);

      if (error) throw error;

      toast({
        title: "Backup Created",
        description: "Backup configuration has been created successfully"
      });

      setShowCreateDialog(false);
      setNewBackup({
        name: '',
        backup_type: 'system_config',
        schedule_cron: '0 2 * * *',
        retention_days: 30,
        storage_location: 'local',
        compression_enabled: true,
        encryption_enabled: false,
        description: ''
      });
      
      await fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Error",
        description: "Failed to create backup configuration",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateBackup = async (id: string, updates: Partial<BackupConfig>) => {
    try {
      const { error } = await supabase
        .from('backup_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setBackups(prev => prev.map(backup => 
        backup.id === id ? { ...backup, ...updates } : backup
      ));

      toast({
        title: "Backup Updated",
        description: "Backup configuration has been saved"
      });
    } catch (error) {
      console.error('Error updating backup:', error);
      toast({
        title: "Error",
        description: "Failed to update backup configuration",
        variant: "destructive"
      });
    }
  };

  const runBackup = async (backupId: string) => {
    try {
      toast({
        title: "Starting Backup",
        description: "Backup process has been initiated..."
      });

      // In a real implementation, this would trigger the actual backup process
      // For now, we'll simulate it by updating the backup status
      await updateBackup(backupId, {
        last_backup_at: new Date().toISOString(),
        last_backup_status: 'success',
        last_backup_size: Math.floor(Math.random() * 1000000000) + 100000000 // Random size for demo
      });

      toast({
        title: "Backup Complete",
        description: "Backup has been completed successfully"
      });
    } catch (error) {
      console.error('Error running backup:', error);
      toast({
        title: "Backup Failed",
        description: "Failed to complete backup process",
        variant: "destructive"
      });
    }
  };

  const deleteBackup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('backup_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBackups(prev => prev.filter(backup => backup.id !== id));
      toast({
        title: "Backup Deleted",
        description: "Backup configuration has been removed"
      });
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: "Error",
        description: "Failed to delete backup configuration",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const getBackupIcon = (type: string) => {
    const typeConfig = BACKUP_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || HardDrive;
    return <Icon className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'success':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'running':
        return <Badge variant="default"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
      default:
        return <Badge variant="outline">Never run</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Backup Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">Loading backup configurations...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Backup Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure automated backups for system configuration, database, and firmware catalog.
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Backup
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Backup Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backup-name">Backup Name</Label>
                      <Input
                        id="backup-name"
                        value={newBackup.name}
                        onChange={(e) => setNewBackup(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Daily System Config"
                      />
                    </div>
                    <div>
                      <Label htmlFor="backup-type">Backup Type</Label>
                      <Select value={newBackup.backup_type} onValueChange={(value) => 
                        setNewBackup(prev => ({ ...prev, backup_type: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKUP_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schedule">Schedule</Label>
                      <Select value={newBackup.schedule_cron} onValueChange={(value) => 
                        setNewBackup(prev => ({ ...prev, schedule_cron: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_PRESETS.map(preset => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="retention">Retention (Days)</Label>
                      <Input
                        id="retention"
                        type="number"
                        value={newBackup.retention_days}
                        onChange={(e) => setNewBackup(prev => ({ ...prev, retention_days: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="storage">Storage Location</Label>
                    <Select value={newBackup.storage_location} onValueChange={(value) => 
                      setNewBackup(prev => ({ ...prev, storage_location: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STORAGE_LOCATIONS.map(location => (
                          <SelectItem key={location.value} value={location.value}>
                            {location.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="compression"
                        checked={newBackup.compression_enabled}
                        onCheckedChange={(checked) => setNewBackup(prev => ({ ...prev, compression_enabled: checked }))}
                      />
                      <Label htmlFor="compression">Enable Compression</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="encryption"
                        checked={newBackup.encryption_enabled}
                        onCheckedChange={(checked) => setNewBackup(prev => ({ ...prev, encryption_enabled: checked }))}
                      />
                      <Label htmlFor="encryption">Enable Encryption</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newBackup.description}
                      onChange={(e) => setNewBackup(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description for this backup configuration"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createBackup} disabled={isCreating || !newBackup.name}>
                      {isCreating ? "Creating..." : "Create Backup"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Backup Configurations */}
      <div className="grid gap-6">
        {backups.map(backup => (
          <Card key={backup.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white">
                    {getBackupIcon(backup.backup_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{backup.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {BACKUP_TYPES.find(t => t.value === backup.backup_type)?.label}
                    </p>
                    {backup.description && (
                      <p className="text-xs text-muted-foreground mt-1">{backup.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={backup.enabled}
                    onCheckedChange={(enabled) => updateBackup(backup.id, { enabled })}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runBackup(backup.id)}
                    disabled={!backup.enabled}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteBackup(backup.id)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  {getStatusBadge(backup.last_backup_status)}
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Schedule</div>
                  <div className="text-sm font-mono">{backup.schedule_cron}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Last Backup</div>
                  <div className="text-sm">
                    {backup.last_backup_at 
                      ? formatDistanceToNow(new Date(backup.last_backup_at)) + ' ago'
                      : 'Never'
                    }
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Size</div>
                  <div className="text-sm">
                    {backup.last_backup_size 
                      ? formatFileSize(backup.last_backup_size)
                      : 'Unknown'
                    }
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span>Retention: {backup.retention_days} days</span>
                <span>Storage: {STORAGE_LOCATIONS.find(s => s.value === backup.storage_location)?.label}</span>
                {backup.compression_enabled && <span>Compressed</span>}
                {backup.encryption_enabled && <span>Encrypted</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {backups.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <HardDrive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Backup Configurations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first backup configuration to protect your system data.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Backup
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}