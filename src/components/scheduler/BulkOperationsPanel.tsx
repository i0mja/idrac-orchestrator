import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  RefreshCw, 
  Shield, 
  Monitor, 
  CheckCircle, 
  Clock, 
  AlertTriangle 
} from "lucide-react";

interface BulkOperationsPanelProps {
  selectedServers: string[];
  servers: any[];
}

interface BulkOperationDialog {
  open: boolean;
  type: 'firmware' | 'reboot' | 'security' | 'health' | null;
  title: string;
}

export function BulkOperationsPanel({ selectedServers, servers }: BulkOperationsPanelProps) {
  const [dialog, setDialog] = useState<BulkOperationDialog>({ open: false, type: null, title: '' });
  const [operationDetails, setOperationDetails] = useState({
    description: '',
    command: '',
    scheduled_date: '',
    scheduled_time: '',
    execute_immediately: true
  });
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { toast } = useToast();

  const bulkOperations = [
    {
      id: 'firmware',
      title: 'Update Firmware',
      description: 'Deploy firmware updates to selected servers',
      icon: Zap,
      variant: 'default' as const,
      defaultCommand: 'racadm update -f /tmp/firmware.exe',
      color: 'text-blue-600'
    },
    {
      id: 'reboot',
      title: 'Reboot Servers',
      description: 'Perform controlled reboot of selected servers',
      icon: RefreshCw,
      variant: 'outline' as const,
      defaultCommand: 'racadm serveraction gracefulreboot',
      color: 'text-orange-600'
    },
    {
      id: 'security',
      title: 'Apply Security Patches',
      description: 'Deploy critical security updates',
      icon: Shield,
      variant: 'secondary' as const,
      defaultCommand: 'yum update --security -y || apt-get update && apt-get upgrade -y',
      color: 'text-red-600'
    },
    {
      id: 'health',
      title: 'Health Check',
      description: 'Run comprehensive health diagnostics',
      icon: Monitor,
      variant: 'outline' as const,
      defaultCommand: 'racadm getsysinfo && racadm getsel',
      color: 'text-green-600'
    }
  ];

  const openDialog = (operationType: string) => {
    const operation = bulkOperations.find(op => op.id === operationType);
    if (!operation) return;

    setDialog({
      open: true,
      type: operationType as any,
      title: operation.title
    });

    setOperationDetails({
      description: `${operation.title} for ${selectedServers.length} servers`,
      command: operation.defaultCommand,
      scheduled_date: '',
      scheduled_time: '',
      execute_immediately: true
    });
  };

  const closeDialog = () => {
    setDialog({ open: false, type: null, title: '' });
    setOperationDetails({
      description: '',
      command: '',
      scheduled_date: '',
      scheduled_time: '',
      execute_immediately: true
    });
  };

  const executeBulkOperation = async () => {
    if (!dialog.type || selectedServers.length === 0) return;

    setIsExecuting(true);
    try {
      const scheduledAt = operationDetails.execute_immediately 
        ? null 
        : `${operationDetails.scheduled_date}T${operationDetails.scheduled_time}:00.000Z`;

      // Create a bulk operation record
      const { data: bulkOperation, error: bulkError } = await supabase
        .from('system_events')
        .insert({
          title: `Bulk ${dialog.title}`,
          description: `${dialog.title} initiated for ${selectedServers.length} servers`,
          event_type: 'bulk_operation',
          severity: 'info',
          metadata: {
            operation_type: dialog.type,
            server_count: selectedServers.length,
            scheduled_at: scheduledAt,
            command: operationDetails.command
          }
        })
        .select()
        .single();

      if (bulkError) throw bulkError;

      // Create individual jobs for each server based on operation type
      let operationResult;

      switch (dialog.type) {
        case 'firmware':
          // For firmware updates, we need a firmware package ID
          operationResult = await supabase.functions.invoke('bulk-firmware-update', {
            body: {
              serverIds: selectedServers,
              firmwarePackageId: 'default-package', // This should come from user selection
              scheduledAt,
              description: operationDetails.description
            }
          });
          break;

        case 'reboot':
          operationResult = await supabase.functions.invoke('bulk-server-reboot', {
            body: {
              serverIds: selectedServers,
              scheduledAt,
              description: operationDetails.description,
              rebootType: 'graceful'
            }
          });
          break;

        case 'security':
          operationResult = await supabase.functions.invoke('bulk-security-patch', {
            body: {
              serverIds: selectedServers,
              scheduledAt,
              description: operationDetails.description,
              patchLevel: 'security'
            }
          });
          break;

        case 'health':
          operationResult = await supabase.functions.invoke('bulk-health-check', {
            body: {
              serverIds: selectedServers,
              scheduledAt,
              description: operationDetails.description,
              checkType: 'comprehensive'
            }
          });
          break;

        default:
          throw new Error('Unknown operation type');
      }

      if (operationResult.error) {
        throw new Error(operationResult.error.message || 'Operation failed');
      }

      const successful = selectedServers.length;
      const failed = 0;

      if (successful === selectedServers.length) {
        toast({
          title: "Bulk Operation Started",
          description: `${dialog.title} ${operationDetails.execute_immediately ? 'started' : 'scheduled'} for all ${selectedServers.length} servers`,
        });
      } else if (successful > 0) {
        toast({
          title: "Partial Success",
          description: `${successful} operations started successfully, ${failed} failed`,
          variant: "destructive"
        });
      } else {
        throw new Error('All operations failed to start');
      }

      closeDialog();

    } catch (error) {
      console.error('Error executing bulk operation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute bulk operation",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getSelectedServerNames = () => {
    return selectedServers
      .map(id => servers.find(s => s.id === id)?.hostname)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <>
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bulkOperations.map((operation) => (
              <Button
                key={operation.id}
                variant={operation.variant}
                onClick={() => openDialog(operation.id)}
                disabled={selectedServers.length === 0}
                className="h-auto p-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <operation.icon className={`w-5 h-5 ${operation.color}`} />
                  <span className="font-semibold">{operation.title}</span>
                </div>
                <p className="text-xs text-left opacity-80">
                  {operation.description}
                </p>
                {selectedServers.length > 0 && (
                  <div className="text-xs bg-primary/10 px-2 py-1 rounded mt-1">
                    {selectedServers.length} servers selected
                  </div>
                )}
              </Button>
            ))}
          </div>

          {selectedServers.length === 0 ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Select servers to enable bulk operations
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                {selectedServers.length} server(s) selected: {getSelectedServerNames()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operation Dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialog.type && (
                <>
                  {bulkOperations.find(op => op.id === dialog.type)?.icon && 
                    React.createElement(bulkOperations.find(op => op.id === dialog.type)!.icon, { className: "w-5 h-5" })
                  }
                  {dialog.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                This operation will affect {selectedServers.length} servers
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={operationDetails.description}
                onChange={(e) => setOperationDetails(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this operation..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="command">Command to Execute</Label>
              <Textarea
                id="command"
                value={operationDetails.command}
                onChange={(e) => setOperationDetails(prev => ({ ...prev, command: e.target.value }))}
                placeholder="Enter the command to execute..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="execute-immediately"
                  checked={operationDetails.execute_immediately}
                  onChange={(e) => setOperationDetails(prev => ({ ...prev, execute_immediately: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="execute-immediately">Execute Immediately</Label>
              </div>

              {!operationDetails.execute_immediately && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={operationDetails.scheduled_date}
                      onChange={(e) => setOperationDetails(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Scheduled Time</Label>
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={operationDetails.scheduled_time}
                      onChange={(e) => setOperationDetails(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button 
                onClick={executeBulkOperation} 
                disabled={isExecuting || !operationDetails.command.trim()}
              >
                {isExecuting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    {operationDetails.execute_immediately ? 'Execute Now' : 'Schedule Operation'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}