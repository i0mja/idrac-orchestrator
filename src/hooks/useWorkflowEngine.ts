import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  trigger_config: any;
  steps: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface WorkflowStep {
  type: string;
  config: Record<string, any>;
  timeout_minutes?: number;
  retry_count?: number;
  on_failure?: 'stop' | 'continue' | 'retry';
}

interface WorkflowExecution {
  id: string;
  template_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  execution_log: any;
  triggered_by: string;
  context: any;
  template?: WorkflowTemplate;
}

interface ExecutionLogEntry {
  timestamp: string;
  step: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  data?: Record<string, any>;
}

export function useWorkflowEngine() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching workflow templates:', error);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          template:workflow_templates(*)
        `)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching workflow executions:', error);
    }
  }, []);

  const createTemplate = useCallback(async (template: Omit<WorkflowTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Workflow Template Created",
        description: `Template "${template.name}" has been created successfully.`,
      });

      await fetchTemplates();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [fetchTemplates, toast]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<WorkflowTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: "Workflow template has been updated successfully.",
      });

      await fetchTemplates();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [fetchTemplates, toast]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "Workflow template has been deleted successfully.",
      });

      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [fetchTemplates, toast]);

  const executeWorkflow = useCallback(async (templateId: string, context: Record<string, any> = {}) => {
    try {
      // Create execution record
      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert([{
          template_id: templateId,
          status: 'pending',
          context,
          execution_log: []
        }])
        .select()
        .single();

      if (executionError) throw executionError;

      toast({
        title: "Workflow Started",
        description: "The workflow execution has been initiated.",
      });

      // In a real implementation, this would trigger the actual workflow execution
      // For now, we'll simulate the execution process
      await simulateWorkflowExecution(execution.id);

      await fetchExecutions();
      return execution;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [fetchExecutions, toast]);

  const simulateWorkflowExecution = async (executionId: string) => {
    // This is a simulation - in a real implementation, this would be handled by an edge function
    try {
      // Update status to running
      await supabase
        .from('workflow_executions')
        .update({
          status: 'running',
          execution_log: [{
            timestamp: new Date().toISOString(),
            step: 'initialization',
            status: 'started',
            message: 'Workflow execution started'
          }]
        })
        .eq('id', executionId);

      // Simulate execution steps with delay
      setTimeout(async () => {
        const success = Math.random() > 0.2; // 80% success rate
        
        await supabase
          .from('workflow_executions')
          .update({
            status: success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            error_message: success ? null : 'Simulated execution failure',
            execution_log: [
              {
                timestamp: new Date().toISOString(),
                step: 'initialization',
                status: 'completed',
                message: 'Workflow initialization completed'
              },
              {
                timestamp: new Date().toISOString(),
                step: 'execution',
                status: success ? 'completed' : 'failed',
                message: success ? 'All steps completed successfully' : 'Step failed during execution'
              }
            ]
          })
          .eq('id', executionId);

        await fetchExecutions();
      }, 3000);
    } catch (error) {
      console.error('Error simulating workflow execution:', error);
    }
  };

  const cancelExecution = useCallback(async (executionId: string) => {
    try {
      const { error } = await supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) throw error;

      toast({
        title: "Execution Cancelled",
        description: "The workflow execution has been cancelled.",
      });

      await fetchExecutions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [fetchExecutions, toast]);

  const getTemplatesByCategory = useCallback((category?: string) => {
    return category 
      ? templates.filter(t => t.category === category)
      : templates;
  }, [templates]);

  const getExecutionStats = useCallback(() => {
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const running = executions.filter(e => e.status === 'running').length;
    const pending = executions.filter(e => e.status === 'pending').length;

    return {
      total,
      completed,
      failed,
      running,
      pending,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [executions]);

  const getRecentExecutions = useCallback((limit: number = 10) => {
    return executions.slice(0, limit);
  }, [executions]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchExecutions()]);
      setLoading(false);
    };

    loadData();
  }, [fetchTemplates, fetchExecutions]);

  // Set up real-time subscriptions
  useEffect(() => {
    const templatesSubscription = supabase
      .channel('workflow-templates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_templates'
      }, () => {
        fetchTemplates();
      })
      .subscribe();

    const executionsSubscription = supabase
      .channel('workflow-executions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_executions'
      }, () => {
        fetchExecutions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(templatesSubscription);
      supabase.removeChannel(executionsSubscription);
    };
  }, [fetchTemplates, fetchExecutions]);

  return {
    templates,
    executions,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    executeWorkflow,
    cancelExecution,
    getTemplatesByCategory,
    getExecutionStats,
    getRecentExecutions,
    refresh: useCallback(async () => {
      await Promise.all([fetchTemplates(), fetchExecutions()]);
    }, [fetchTemplates, fetchExecutions])
  };
}