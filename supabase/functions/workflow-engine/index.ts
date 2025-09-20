import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowRequest {
  action: 'execute' | 'status' | 'cancel' | 'list_templates' | 'create_template';
  templateId?: string;
  executionId?: string;
  context?: Record<string, any>;
  templateData?: {
    name: string;
    description?: string;
    category?: string;
    steps: WorkflowStep[];
  };
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'job' | 'condition' | 'parallel' | 'delay';
  config: Record<string, any>;
  nextSteps?: string[];
  condition?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, templateId, executionId, context, templateData }: WorkflowRequest = await req.json();

    switch (action) {
      case 'execute':
        if (!templateId) {
          throw new Error('Template ID is required for execute action');
        }
        return await executeWorkflow(supabase, templateId, context || {});
      
      case 'status':
        if (!executionId) {
          throw new Error('Execution ID is required for status action');
        }
        return await getWorkflowStatus(supabase, executionId);
      
      case 'cancel':
        if (!executionId) {
          throw new Error('Execution ID is required for cancel action');
        }
        return await cancelWorkflow(supabase, executionId);
      
      case 'list_templates':
        return await listWorkflowTemplates(supabase);
      
      case 'create_template':
        if (!templateData) {
          throw new Error('Template data is required for create_template action');
        }
        return await createWorkflowTemplate(supabase, templateData);
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Error in workflow-engine:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function executeWorkflow(supabase: any, templateId: string, context: Record<string, any>) {
  console.log(`Executing workflow template ${templateId}`);

  // Get workflow template
  const { data: template, error: templateError } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) {
    throw templateError;
  }

  // Create workflow execution record
  const executionId = crypto.randomUUID();
  const { data: execution, error: executionError } = await supabase
    .from('workflow_executions')
    .insert({
      id: executionId,
      template_id: templateId,
      status: 'running',
      context: context,
      execution_log: [],
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (executionError) {
    throw executionError;
  }

  // Start workflow execution
  await processWorkflowSteps(supabase, executionId, template.steps, context);

  return new Response(JSON.stringify({
    success: true,
    executionId,
    templateId,
    status: 'running',
    message: 'Workflow execution started'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processWorkflowSteps(supabase: any, executionId: string, steps: WorkflowStep[], context: Record<string, any>) {
  const executionLog = [];
  const visitedSteps = new Set<string>();
  
  // Find entry points (steps with no dependencies)
  const entrySteps = steps.filter(step => 
    !steps.some(s => s.nextSteps?.includes(step.id))
  );

  for (const step of entrySteps) {
    await executeWorkflowStep(supabase, executionId, step, steps, context, executionLog, visitedSteps);
  }

  // Update execution with final status
  const finalStatus = executionLog.some(log => log.status === 'failed') ? 'failed' : 'completed';
  
  await supabase
    .from('workflow_executions')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      execution_log: executionLog
    })
    .eq('id', executionId);
}

async function executeWorkflowStep(
  supabase: any, 
  executionId: string, 
  step: WorkflowStep, 
  allSteps: WorkflowStep[], 
  context: Record<string, any>,
  executionLog: any[],
  visitedSteps: Set<string>
) {
  // Prevent infinite loops and duplicate execution
  if (visitedSteps.has(step.id)) {
    console.log(`Skipping already visited step: ${step.name}`);
    return;
  }
  
  visitedSteps.add(step.id);
  console.log(`Executing workflow step: ${step.name} (${step.type})`);
  
  const logEntry = {
    step_id: step.id,
    step_name: step.name,
    started_at: new Date().toISOString(),
    status: 'running'
  };

  try {
    let result: any = {};

    switch (step.type) {
      case 'job':
        result = await executeJobStep(supabase, step, context, executionId);
        break;
      
      case 'condition':
        result = await executeConditionStep(step, context);
        break;
      
      case 'parallel':
        result = await executeParallelStep(supabase, executionId, step, allSteps, context, executionLog, visitedSteps);
        break;
      
      case 'delay':
        result = await executeDelayStep(step);
        break;
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    logEntry.status = 'completed';
    logEntry.completed_at = new Date().toISOString();
    logEntry.result = result;
    executionLog.push(logEntry);

    // Execute next steps if condition is met
    if (step.nextSteps && (!step.condition || evaluateCondition(step.condition, context, result))) {
      for (const nextStepId of step.nextSteps) {
        const nextStep = allSteps.find(s => s.id === nextStepId);
        if (nextStep && !visitedSteps.has(nextStepId)) {
          await executeWorkflowStep(supabase, executionId, nextStep, allSteps, context, executionLog, visitedSteps);
        }
      }
    }

  } catch (error) {
    console.error(`Workflow step ${step.name} failed:`, error);
    logEntry.status = 'failed';
    logEntry.completed_at = new Date().toISOString();
    logEntry.error_message = error.message;
    executionLog.push(logEntry);
  }
}

async function executeJobStep(supabase: any, step: WorkflowStep, context: Record<string, any>, executionId: string) {
  const { jobType, serverId, metadata = {} } = step.config;
  
  // Create background job
  const { data: jobResult, error: jobError } = await supabase.functions.invoke('job-queue-manager', {
    body: {
      action: 'create',
      jobData: {
        type: jobType,
        hostRunId: executionId,
        serverId: serverId || context.serverId,
        metadata: { ...metadata, workflowStep: step.id }
      }
    }
  });

  if (jobError) {
    throw jobError;
  }

  return { jobId: jobResult.job?.id, jobType };
}

async function executeConditionStep(step: WorkflowStep, context: Record<string, any>) {
  const { condition } = step.config;
  const result = evaluateCondition(condition, context);
  return { conditionResult: result };
}

async function executeParallelStep(
  supabase: any, 
  executionId: string, 
  step: WorkflowStep, 
  allSteps: WorkflowStep[], 
  context: Record<string, any>,
  executionLog: any[],
  visitedSteps: Set<string>
) {
  const { parallelSteps } = step.config;
  const promises = [];

  for (const stepId of parallelSteps) {
    const parallelStep = allSteps.find(s => s.id === stepId);
    if (parallelStep && !visitedSteps.has(stepId)) {
      // Create separate visited set for each parallel branch to prevent cross-contamination
      const branchVisited = new Set(visitedSteps);
      promises.push(executeWorkflowStep(supabase, executionId, parallelStep, allSteps, context, executionLog, branchVisited));
    }
  }

  await Promise.all(promises);
  return { parallelStepsCompleted: parallelSteps.length };
}

async function executeDelayStep(step: WorkflowStep) {
  const { delayMs } = step.config;
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return { delayCompleted: delayMs };
}

function evaluateCondition(condition: string, context: Record<string, any>, stepResult?: any): boolean {
  // Safe condition evaluation without eval
  try {
    // Support only simple comparisons to prevent code injection
    const supportedOperators = ['==', '!=', '>', '<', '>=', '<='];
    
    // Parse simple conditions like "status == 'success'" or "count > 5"
    for (const op of supportedOperators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        
        // Resolve variables
        const leftValue = resolveValue(left, context, stepResult);
        const rightValue = resolveValue(right, context, stepResult);
        
        switch (op) {
          case '==': return leftValue == rightValue;
          case '!=': return leftValue != rightValue;
          case '>': return Number(leftValue) > Number(rightValue);
          case '<': return Number(leftValue) < Number(rightValue);
          case '>=': return Number(leftValue) >= Number(rightValue);
          case '<=': return Number(leftValue) <= Number(rightValue);
        }
      }
    }
    
    // Simple boolean check
    return resolveValue(condition, context, stepResult) === true;
  } catch (error) {
    console.error('Condition evaluation failed:', error);
    return false;
  }
}

function resolveValue(value: string, context: Record<string, any>, stepResult?: any): any {
  // Remove quotes if present
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  
  // Check if it's a number
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  
  // Check if it's a boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Look up in context or step result
  return context[value] || stepResult?.[value] || value;
}

async function getWorkflowStatus(supabase: any, executionId: string) {
  const { data: execution, error } = await supabase
    .from('workflow_executions')
    .select('*, workflow_templates(*)')
    .eq('id', executionId)
    .single();

  if (error) {
    throw error;
  }

  // Get associated background jobs
  const { data: jobs } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('host_run_id', executionId);

  return new Response(JSON.stringify({
    success: true,
    execution: {
      id: execution.id,
      templateId: execution.template_id,
      templateName: execution.workflow_templates?.name,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      executionLog: execution.execution_log,
      context: execution.context
    },
    associatedJobs: jobs || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function cancelWorkflow(supabase: any, executionId: string) {
  // Cancel workflow execution
  await supabase
    .from('workflow_executions')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('id', executionId);

  // Cancel associated jobs
  await supabase
    .from('background_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'Workflow cancelled'
    })
    .eq('host_run_id', executionId)
    .in('status', ['queued', 'running']);

  return new Response(JSON.stringify({
    success: true,
    executionId,
    message: 'Workflow cancelled'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function listWorkflowTemplates(supabase: any) {
  const { data: templates, error } = await supabase
    .from('workflow_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({
    success: true,
    templates: templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      stepsCount: t.steps?.length || 0,
      createdAt: t.created_at,
      isActive: t.is_active
    }))
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createWorkflowTemplate(supabase: any, templateData: any) {
  const { data: template, error } = await supabase
    .from('workflow_templates')
    .insert({
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'general',
      steps: templateData.steps,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({
    success: true,
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      createdAt: template.created_at
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}