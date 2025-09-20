import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Eye, Plus, Workflow, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useWorkflowEngineIntegration, WorkflowTemplate, WorkflowExecution } from '@/hooks/useWorkflowEngineIntegration';
import { useToast } from '@/hooks/use-toast';

const WorkflowManagementPanel = () => {
  const {
    loading,
    error,
    executeWorkflow,
    getWorkflowStatus,
    cancelWorkflow,
    listWorkflowTemplates,
    createFirmwareUpdateWorkflow
  } = useWorkflowEngineIntegration();

  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExecutionDetails, setShowExecutionDetails] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [executionContext, setExecutionContext] = useState('{}');
  
  // Create workflow form
  const [workflowName, setWorkflowName] = useState('');
  const [serverId, setServerId] = useState('');
  const [firmwareUrl, setFirmwareUrl] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templateList = await listWorkflowTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!selectedTemplate) return;

    try {
      let context = {};
      try {
        context = JSON.parse(executionContext);
      } catch (e) {
        toast({
          title: "Error",
          description: "Invalid JSON in execution context",
          variant: "destructive"
        });
        return;
      }

      const result = await executeWorkflow(selectedTemplate.id, context);
      
      toast({
        title: "Success",
        description: "Workflow execution started",
      });

      setShowExecuteDialog(false);
      setExecutionContext('{}');
      
      // Add to executions list
      const newExecution: WorkflowExecution = {
        id: result.executionId,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        executionLog: [],
        context,
        associatedJobs: []
      };
      setExecutions([newExecution, ...executions]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute workflow",
        variant: "destructive"
      });
    }
  };

  const handleCreateFirmwareWorkflow = async () => {
    if (!workflowName || !serverId || !firmwareUrl) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    try {
      await createFirmwareUpdateWorkflow(workflowName, serverId, firmwareUrl);
      
      toast({
        title: "Success",
        description: "Firmware update workflow created",
      });

      setShowCreateDialog(false);
      setWorkflowName('');
      setServerId('');
      setFirmwareUrl('');
      
      // Reload templates
      await loadTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive"
      });
    }
  };

  const handleViewExecution = async (execution: WorkflowExecution) => {
    try {
      const details = await getWorkflowStatus(execution.id);
      setSelectedExecution(details);
      setShowExecutionDetails(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load execution details",
        variant: "destructive"
      });
    }
  };

  const handleCancelExecution = async (executionId: string) => {
    try {
      await cancelWorkflow(executionId);
      
      toast({
        title: "Success",
        description: "Workflow execution cancelled",
      });

      // Update execution status
      setExecutions(executions.map(exec => 
        exec.id === executionId ? { ...exec, status: 'cancelled' } : exec
      ));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel workflow",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const renderTemplateCard = (template: WorkflowTemplate) => (
    <Card key={template.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">{template.name}</CardTitle>
            <Badge variant="outline">{template.category}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTemplate(template);
                setShowExecuteDialog(true);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {template.description || 'No description provided'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{template.stepsCount} steps</span>
          <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderExecutionCard = (execution: WorkflowExecution) => (
    <Card key={execution.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(execution.status)}
            <CardTitle className="text-base">{execution.templateName}</CardTitle>
            <Badge className={getStatusColor(execution.status)}>
              {execution.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewExecution(execution)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {execution.status === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelExecution(execution.id)}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Started: {new Date(execution.startedAt).toLocaleString()}
          {execution.completedAt && (
            <> • Completed: {new Date(execution.completedAt).toLocaleString()}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Execution ID: {execution.id}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{executions.length}</div>
            <p className="text-xs text-muted-foreground">Executions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {executions.filter(e => e.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workflow Management</CardTitle>
              <CardDescription>Create and execute workflow templates</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
              <TabsTrigger value="executions">Executions ({executions.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates">
              <ScrollArea className="h-[600px]">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No workflow templates found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map(renderTemplateCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="executions">
              <ScrollArea className="h-[600px]">
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No workflow executions found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {executions.map(renderExecutionCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Execute Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Workflow</DialogTitle>
            <DialogDescription>
              Configure execution context for {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="context">Execution Context (JSON)</Label>
              <Textarea
                id="context"
                value={executionContext}
                onChange={(e) => setExecutionContext(e.target.value)}
                placeholder='{"serverId": "server-uuid", "firmwareUrl": "https://..."}'
                className="h-32 font-mono"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteWorkflow}>
              Execute Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Firmware Update Workflow</DialogTitle>
            <DialogDescription>
              Create a new automated firmware update workflow
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflowName">Workflow Name</Label>
              <Input
                id="workflowName"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Firmware Update for Server X"
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
              <Label htmlFor="firmwareUrl">Firmware URL</Label>
              <Input
                id="firmwareUrl"
                value={firmwareUrl}
                onChange={(e) => setFirmwareUrl(e.target.value)}
                placeholder="https://example.com/firmware.bin"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFirmwareWorkflow}>
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution Details Dialog */}
      <Dialog open={showExecutionDetails} onOpenChange={setShowExecutionDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Workflow Execution Details</DialogTitle>
            <DialogDescription>
              Detailed view of workflow execution progress
            </DialogDescription>
          </DialogHeader>
          
          {selectedExecution && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Execution ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedExecution.id}</p>
                </div>
                <div>
                  <Label>Template</Label>
                  <p className="text-sm text-muted-foreground">{selectedExecution.templateName}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedExecution.status)}
                    <Badge className={getStatusColor(selectedExecution.status)}>
                      {selectedExecution.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Started At</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedExecution.startedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedExecution.executionLog && selectedExecution.executionLog.length > 0 && (
                <div>
                  <Label>Execution Log</Label>
                  <ScrollArea className="h-40 mt-2">
                    <div className="space-y-2">
                      {selectedExecution.executionLog.map((log: any, index: number) => (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.step_name}</span>
                            <Badge variant="outline" className={getStatusColor(log.status)}>
                              {log.status}
                            </Badge>
                          </div>
                          {log.error_message && (
                            <p className="text-red-600 text-xs mt-1">{log.error_message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {selectedExecution.associatedJobs && selectedExecution.associatedJobs.length > 0 && (
                <div>
                  <Label>Associated Jobs</Label>
                  <div className="mt-2 space-y-2">
                    {selectedExecution.associatedJobs.map((job: any) => (
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
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecutionDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowManagementPanel;