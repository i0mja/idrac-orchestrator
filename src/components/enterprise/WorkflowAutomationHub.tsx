import React, { useState } from 'react';
import { useWorkflowEngine } from '@/hooks/useWorkflowEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Settings, Play, Square, RotateCcw, Clock, CheckCircle, 
  XCircle, Zap, Bot, Workflow, Plus, Edit, Trash2,
  Calendar, AlertTriangle, TrendingUp, Activity
} from 'lucide-react';
import { format } from 'date-fns';

export function WorkflowAutomationHub() {
  const {
    templates,
    executions,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    executeWorkflow,
    cancelExecution,
    getTemplatesByCategory,
    getExecutionStats,
    getRecentExecutions
  } = useWorkflowEngine();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'general',
    trigger_type: 'manual' as const,
    trigger_config: {},
    steps: [],
    is_active: true
  });

  const stats = getExecutionStats();
  const recentExecutions = getRecentExecutions(5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed': return <XCircle className="w-4 h-4 text-error" />;
      case 'running': return <Activity className="w-4 h-4 text-primary animate-pulse" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'cancelled': return <Square className="w-4 h-4 text-muted-foreground" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'default',
      pending: 'secondary',
      cancelled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      await createTemplate({
        ...newTemplate,
        steps: [
          {
            type: 'notify',
            config: { message: 'Workflow started', channels: ['email'] }
          },
          {
            type: 'execute',
            config: { command: 'echo "Hello World"' }
          },
          {
            type: 'notify',
            config: { message: 'Workflow completed', channels: ['email'] }
          }
        ]
      });
      
      setIsCreating(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'general',
        trigger_type: 'manual',
        trigger_config: {},
        steps: []
      });
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Workflow Automation</h1>
            <p className="text-muted-foreground text-lg">
              Intelligent automation engine for streamlined operations
            </p>
          </div>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button variant="enterprise">
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Workflow Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter workflow name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="deployment">Deployment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="trigger">Trigger Type</Label>
                <Select value={newTemplate.trigger_type} onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, trigger_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="event">Event-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <h3 className="text-2xl font-bold">{stats.successRate}%</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Templates</p>
                <h3 className="text-2xl font-bold">{templates.filter(t => t.is_active).length}</h3>
              </div>
              <Workflow className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running Now</p>
                <h3 className="text-2xl font-bold">{stats.running}</h3>
              </div>
              <Zap className="w-8 h-8 text-error" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="card-enterprise">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {template.description || 'No description provided'}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{template.trigger_type}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => executeWorkflow(template.id)}
                      disabled={!template.is_active}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Execute
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <Card className="card-enterprise col-span-full">
                <CardContent className="text-center py-8">
                  <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Workflow Templates</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first workflow template to get started with automation.
                  </p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="executions">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {executions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(execution.status)}
                        <div>
                          <h4 className="font-medium">
                            {execution.template?.name || 'Unknown Template'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Started {format(new Date(execution.started_at), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(execution.status)}
                        {execution.status === 'running' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelExecution(execution.id)}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {executions.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Executions Yet</h3>
                      <p className="text-muted-foreground">
                        Workflow executions will appear here once you start running templates.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>Execution Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success mb-2">{stats.successRate}%</div>
                    <div className="text-sm text-muted-foreground">Overall Success Rate</div>
                  </div>
                  <Progress value={stats.successRate} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-success">{stats.completed}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-error">{stats.failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-warning">{stats.running + stats.pending}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Workflow Engine</span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Queue Processing</span>
                    <Badge variant="default">Normal</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Template Validation</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Event Listeners</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}