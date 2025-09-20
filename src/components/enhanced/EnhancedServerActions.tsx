import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Play, Zap, Wrench, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs';
import { useStateMachine } from '@/hooks/useStateMachine';
import { useWorkflowEngineIntegration } from '@/hooks/useWorkflowEngineIntegration';
import { useToast } from '@/hooks/use-toast';

interface EnhancedServerActionsProps {
  serverId: string;
  serverName: string;
  ipAddress: string;
}

const EnhancedServerActions: React.FC<EnhancedServerActionsProps> = ({ 
  serverId, 
  serverName, 
  ipAddress 
}) => {
  const { createJob } = useBackgroundJobs();
  const { startStateMachine } = useStateMachine();
  const { createFirmwareUpdateWorkflow, executeWorkflow, listWorkflowTemplates } = useWorkflowEngineIntegration();
  const { toast } = useToast();

  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showStateMachineDialog, setShowStateMachineDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<'firmware_update' | 'maintenance_mode' | 'health_check' | 'vcenter_sync'>('health_check');
  const [firmwareUrl, setFirmwareUrl] = useState('');
  const [hostRunId, setHostRunId] = useState('');
  const [workflowName, setWorkflowName] = useState('');

  const jobTypes = [
    { value: 'health_check', label: 'Health Check', icon: CheckCircle, description: 'Perform system health validation' },
    { value: 'firmware_update', label: 'Firmware Update', icon: Zap, description: 'Update server firmware' },
    { value: 'maintenance_mode', label: 'Maintenance Mode', icon: Wrench, description: 'Enter/exit maintenance mode' },
    { value: 'vcenter_sync', label: 'vCenter Sync', icon: Activity, description: 'Synchronize vCenter data' }
  ];

  const handleCreateJob = async () => {
    try {
      const metadata: Record<string, any> = {};
      
      if (selectedJobType === 'firmware_update' && firmwareUrl) {
        metadata.firmwareUrl = firmwareUrl;
        metadata.updateType = 'immediate';
      }
      
      if (selectedJobType === 'maintenance_mode') {
        metadata.action = 'enter';
      }

      await createJob({
        type: selectedJobType,
        hostRunId: `manual-${Date.now()}`,
        serverId,
        priority: 5,
        metadata
      });

      toast({
        title: "Success",
        description: `${jobTypes.find(j => j.value === selectedJobType)?.label} job created`,
      });

      setShowJobDialog(false);
      setFirmwareUrl('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive"
      });
    }
  };

  const handleStartStateMachine = async () => {
    if (!hostRunId) {
      toast({
        title: "Error",
        description: "Host Run ID is required",
        variant: "destructive"
      });
      return;
    }

    try {
      await startStateMachine(hostRunId, {
        serverId,
        firmwareUrl: firmwareUrl || undefined
      });

      toast({
        title: "Success",
        description: "State machine started successfully",
      });

      setShowStateMachineDialog(false);
      setHostRunId('');
      setFirmwareUrl('');
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to start state machine",
        variant: "destructive"
      });
    }
  };

  const handleCreateWorkflow = async () => {
    if (!workflowName || !firmwareUrl) {
      toast({
        title: "Error",
        description: "Workflow name and firmware URL are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const template = await createFirmwareUpdateWorkflow(workflowName, serverId, firmwareUrl);
      
      // Execute the workflow immediately
      await executeWorkflow(template.id, { serverId });

      toast({
        title: "Success",
        description: "Workflow created and executed",
      });

      setShowWorkflowDialog(false);
      setWorkflowName('');
      setFirmwareUrl('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create and execute workflow",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Enhanced Server Actions
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{serverName}</Badge>
          <Badge variant="secondary">{ipAddress}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quick Job Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Quick Jobs</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowJobDialog(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </div>
          </div>

          {/* State Machine Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">State Machine</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowStateMachineDialog(true)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Start State Machine
              </Button>
            </div>
          </div>

          {/* Workflow Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Workflows</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowWorkflowDialog(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="text-xs text-muted-foreground">
          Use these enhanced actions to leverage the new backend orchestration system.
          Jobs are queued and processed asynchronously with full monitoring capabilities.
        </div>
      </CardContent>

      {/* Job Creation Dialog */}
      <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Background Job</DialogTitle>
            <DialogDescription>
              Create a new background job for {serverName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Job Type</Label>
              <Select value={selectedJobType} onValueChange={(value) => setSelectedJobType(value as typeof selectedJobType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJobType === 'firmware_update' && (
              <div>
                <Label htmlFor="firmwareUrl">Firmware URL</Label>
                <Input
                  id="firmwareUrl"
                  value={firmwareUrl}
                  onChange={(e) => setFirmwareUrl(e.target.value)}
                  placeholder="https://example.com/firmware.bin"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateJob}>
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* State Machine Dialog */}
      <Dialog open={showStateMachineDialog} onOpenChange={setShowStateMachineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start State Machine</DialogTitle>
            <DialogDescription>
              Start a complete update state machine for {serverName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="hostRunId">Host Run ID</Label>
              <Input
                id="hostRunId"
                value={hostRunId}
                onChange={(e) => setHostRunId(e.target.value)}
                placeholder="unique-host-run-id"
              />
            </div>

            <div>
              <Label htmlFor="firmwareUrlSM">Firmware URL (Optional)</Label>
              <Input
                id="firmwareUrlSM"
                value={firmwareUrl}
                onChange={(e) => setFirmwareUrl(e.target.value)}
                placeholder="https://example.com/firmware.bin"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm text-blue-700">
                <strong>State Machine Flow:</strong>
                <div className="text-xs mt-1 space-y-1">
                  <div>1. PRECHECKS - Validate server readiness</div>
                  <div>2. ENTER_MAINT - Enter maintenance mode</div>
                  <div>3. APPLY - Apply firmware updates</div>
                  <div>4. POSTCHECKS - Validate updates</div>
                  <div>5. EXIT_MAINT - Exit maintenance mode</div>
                  <div>6. DONE - Complete</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStateMachineDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartStateMachine}>
              Start State Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Firmware Update Workflow</DialogTitle>
            <DialogDescription>
              Create and execute a complete firmware update workflow for {serverName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="workflowName">Workflow Name</Label>
              <Input
                id="workflowName"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder={`Firmware Update - ${serverName}`}
              />
            </div>

            <div>
              <Label htmlFor="firmwareUrlWF">Firmware URL</Label>
              <Input
                id="firmwareUrlWF"
                value={firmwareUrl}
                onChange={(e) => setFirmwareUrl(e.target.value)}
                placeholder="https://example.com/firmware.bin"
              />
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-sm text-green-700">
                <strong>Workflow includes:</strong>
                <div className="text-xs mt-1 space-y-1">
                  <div>• Pre-update health check</div>
                  <div>• Maintenance mode entry</div>
                  <div>• Firmware update application</div>
                  <div>• Post-update health check</div>
                  <div>• Maintenance mode exit</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkflowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow}>
              Create & Execute Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EnhancedServerActions;