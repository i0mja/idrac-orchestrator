import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'job' | 'condition' | 'parallel' | 'delay';
  config: Record<string, any>;
  nextSteps?: string[];
  condition?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  steps: WorkflowStep[];
  stepsCount: number;
  createdAt: string;
  isActive: boolean;
}

export interface WorkflowExecution {
  id: string;
  templateId: string;
  templateName?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  executionLog: any[];
  context: Record<string, any>;
  associatedJobs: any[];
}

export const useWorkflowEngineIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeWorkflow = useCallback(async (templateId: string, context: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: executeError } = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'execute',
          templateId,
          context
        }
      });

      if (executeError) {
        throw executeError;
      }

      if (data?.success) {
        return {
          executionId: data.executionId,
          templateId: data.templateId,
          status: data.status,
          message: data.message
        };
      } else {
        throw new Error(data?.error || 'Failed to execute workflow');
      }
    } catch (err) {
      console.error('Error executing workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute workflow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkflowStatus = useCallback(async (executionId: string): Promise<WorkflowExecution> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: statusError } = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'status',
          executionId
        }
      });

      if (statusError) {
        throw statusError;
      }

      if (data?.success) {
        return data.execution;
      } else {
        throw new Error(data?.error || 'Failed to get workflow status');
      }
    } catch (err) {
      console.error('Error getting workflow status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get workflow status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelWorkflow = useCallback(async (executionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: cancelError } = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'cancel',
          executionId
        }
      });

      if (cancelError) {
        throw cancelError;
      }

      if (data?.success) {
        return data;
      } else {
        throw new Error(data?.error || 'Failed to cancel workflow');
      }
    } catch (err) {
      console.error('Error cancelling workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel workflow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listWorkflowTemplates = useCallback(async (): Promise<WorkflowTemplate[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: listError } = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'list_templates'
        }
      });

      if (listError) {
        throw listError;
      }

      if (data?.success) {
        return data.templates;
      } else {
        throw new Error(data?.error || 'Failed to list workflow templates');
      }
    } catch (err) {
      console.error('Error listing workflow templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to list workflow templates');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflowTemplate = useCallback(async (templateData: {
    name: string;
    description?: string;
    category?: string;
    steps: WorkflowStep[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'create_template',
          templateData
        }
      });

      if (createError) {
        throw createError;
      }

      if (data?.success) {
        return data.template;
      } else {
        throw new Error(data?.error || 'Failed to create workflow template');
      }
    } catch (err) {
      console.error('Error creating workflow template:', err);
      setError(err instanceof Error ? err.message : 'Failed to create workflow template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to create common workflow templates
  const createFirmwareUpdateWorkflow = useCallback(async (name: string, serverId: string, firmwareUrl: string) => {
    const steps: WorkflowStep[] = [
      {
        id: 'precheck',
        name: 'Pre-update Health Check',
        type: 'job',
        config: {
          jobType: 'health_check',
          serverId,
          metadata: { checkType: 'readiness' }
        },
        nextSteps: ['enter_maintenance']
      },
      {
        id: 'enter_maintenance',
        name: 'Enter Maintenance Mode',
        type: 'job',
        config: {
          jobType: 'maintenance_mode',
          serverId,
          metadata: { action: 'enter' }
        },
        nextSteps: ['firmware_update']
      },
      {
        id: 'firmware_update',
        name: 'Apply Firmware Update',
        type: 'job',
        config: {
          jobType: 'firmware_update',
          serverId,
          metadata: { firmwareUrl, updateType: 'immediate' }
        },
        nextSteps: ['postcheck']
      },
      {
        id: 'postcheck',
        name: 'Post-update Health Check',
        type: 'job',
        config: {
          jobType: 'health_check',
          serverId,
          metadata: { checkType: 'post_update' }
        },
        nextSteps: ['exit_maintenance']
      },
      {
        id: 'exit_maintenance',
        name: 'Exit Maintenance Mode',
        type: 'job',
        config: {
          jobType: 'maintenance_mode',
          serverId,
          metadata: { action: 'exit' }
        }
      }
    ];

    return await createWorkflowTemplate({
      name,
      description: `Automated firmware update workflow for server ${serverId}`,
      category: 'firmware_update',
      steps
    });
  }, [createWorkflowTemplate]);

  return {
    loading,
    error,
    executeWorkflow,
    getWorkflowStatus,
    cancelWorkflow,
    listWorkflowTemplates,
    createWorkflowTemplate,
    createFirmwareUpdateWorkflow
  };
};

export default useWorkflowEngineIntegration;