import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Play, Square, Eye, Activity, AlertTriangle } from 'lucide-react';
import { useStateMachine, HostRun } from '@/hooks/useStateMachine';
import { useToast } from '@/hooks/use-toast';

const StateMachinePanel = () => {
  const {
    hostRuns,
    loading,
    error,
    runningHostRuns,
    completedHostRuns,
    failedHostRuns,
    stateDistribution,
    startStateMachine,
    transitionState,
    getStateMachineStatus,
    cancelStateMachine
  } = useStateMachine();

  const { toast } = useToast();
  const [selectedHostRun, setSelectedHostRun] = useState<HostRun | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [newHostRunId, setNewHostRunId] = useState('');
  const [serverId, setServerId] = useState('');
  const [firmwareUrl, setFirmwareUrl] = useState('');
  const [hostRunDetails, setHostRunDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PRECHECKS':
        return 'bg-blue-500';
      case 'ENTER_MAINT':
        return 'bg-yellow-500';
      case 'APPLY':
        return 'bg-orange-500';
      case 'POSTCHECKS':
        return 'bg-purple-500';
      case 'EXIT_MAINT':
        return 'bg-indigo-500';
      case 'DONE':
        return 'bg-green-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleStartStateMachine = async () => {
    if (!newHostRunId || !serverId) {
      toast({
        title: "Error",
        description: "Host Run ID and Server ID are required",
        variant: "destructive"
      });
      return;
    }

    try {
      await startStateMachine(newHostRunId, {
        serverId,
        firmwareUrl: firmwareUrl || undefined
      });
      
      toast({
        title: "Success",
        description: "State machine started successfully",
      });
      
      setShowStartDialog(false);
      setNewHostRunId('');
      setServerId('');
      setFirmwareUrl('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start state machine",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = async (hostRun: HostRun) => {
    setSelectedHostRun(hostRun);
    setLoadingDetails(true);
    setShowDetails(true);

    try {
      const details = await getStateMachineStatus(hostRun.id);
      setHostRunDetails(details);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load host run details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleTransition = async (targetState: string) => {
    if (!selectedHostRun) return;

    try {
      await transitionState(selectedHostRun.id, targetState);
      toast({
        title: "Success",
        description: `Transitioned to ${targetState}`,
      });
      
      // Refresh details
      const details = await getStateMachineStatus(selectedHostRun.id);
      setHostRunDetails(details);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to transition state",
        variant: "destructive"
      });
    }
  };

  const handleCancel = async (hostRunId: string) => {
    try {
      await cancelStateMachine(hostRunId);
      toast({
        title: "Success",
        description: "State machine cancelled",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel state machine",
        variant: "destructive"
      });
    }
  };

  const renderHostRunCard = (hostRun: HostRun) => (
    <Card key={hostRun.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(hostRun.status)}
            <CardTitle className="text-base">{hostRun.id}</CardTitle>
            <Badge className={getStateColor(hostRun.state)}>
              {hostRun.state}
            </Badge>
            <Badge variant="outline">{hostRun.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(hostRun)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {hostRun.status === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancel(hostRun.id)}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Started: {new Date(hostRun.startedAt).toLocaleString()}
          {hostRun.completedAt && (
            <> • Completed: {new Date(hostRun.completedAt).toLocaleString()}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hostRun.errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {hostRun.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>State Machine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading state machines...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{hostRuns.length}</div>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{runningHostRuns.length}</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedHostRuns.length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{failedHostRuns.length}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* State Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>State Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stateDistribution).map(([state, count]) => (
              <Badge key={state} className={getStateColor(state)}>
                {state}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Host Runs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>State Machine Runs</CardTitle>
              <CardDescription>Monitor host update state machines</CardDescription>
            </div>
            <Button onClick={() => setShowStartDialog(true)}>
              Start New Run
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({hostRuns.length})</TabsTrigger>
              <TabsTrigger value="running">Running ({runningHostRuns.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedHostRuns.length})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({failedHostRuns.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ScrollArea className="h-[600px]">
                {hostRuns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No state machine runs found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hostRuns.map(renderHostRunCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="running">
              <ScrollArea className="h-[600px]">
                {runningHostRuns.map(renderHostRunCard)}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="completed">
              <ScrollArea className="h-[600px]">
                {completedHostRuns.map(renderHostRunCard)}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="failed">
              <ScrollArea className="h-[600px]">
                {failedHostRuns.map(renderHostRunCard)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Start Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start State Machine</DialogTitle>
            <DialogDescription>
              Configure and start a new host update state machine
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="hostRunId">Host Run ID</Label>
              <Input
                id="hostRunId"
                value={newHostRunId}
                onChange={(e) => setNewHostRunId(e.target.value)}
                placeholder="unique-host-run-id"
              />
            </div>
            
            <div>
              <Label htmlFor="serverId">Server ID</Label>
              <Input
                id="serverId"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="server-uuid"
              />
            </div>
            
            <div>
              <Label htmlFor="firmwareUrl">Firmware URL (Optional)</Label>
              <Input
                id="firmwareUrl"
                value={firmwareUrl}
                onChange={(e) => setFirmwareUrl(e.target.value)}
                placeholder="https://example.com/firmware.bin"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartStateMachine}>
              Start State Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>State Machine Details</DialogTitle>
            <DialogDescription>
              Detailed view of host run state and associated jobs
            </DialogDescription>
          </DialogHeader>
          
          {selectedHostRun && (
            <div className="space-y-6">
              {/* Host Run Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Host Run ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedHostRun.id}</p>
                </div>
                <div>
                  <Label>Current State</Label>
                  <div className="flex items-center gap-2">
                    <Badge className={getStateColor(selectedHostRun.state)}>
                      {selectedHostRun.state}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedHostRun.status)}
                    <Badge variant="outline">{selectedHostRun.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Started At</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedHostRun.startedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Available Transitions */}
              {hostRunDetails?.availableTransitions && hostRunDetails.availableTransitions.length > 0 && (
                <div>
                  <Label>Available Transitions</Label>
                  <div className="flex gap-2 mt-2">
                    {hostRunDetails.availableTransitions.map((state: string) => (
                      <Button
                        key={state}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransition(state)}
                        className="flex items-center gap-1"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {state}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Jobs */}
              {hostRunDetails?.jobs && hostRunDetails.jobs.length > 0 && (
                <div>
                  <Label>Associated Jobs</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {hostRunDetails.jobs.map((job: any) => (
                      <div key={job.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="text-sm font-medium">{job.job_type}</span>
                          <Badge className="ml-2" variant="outline">{job.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.progress}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Context */}
              {selectedHostRun.context && Object.keys(selectedHostRun.context).length > 0 && (
                <div>
                  <Label>Context</Label>
                  <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto mt-2">
                    {JSON.stringify(selectedHostRun.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StateMachinePanel;