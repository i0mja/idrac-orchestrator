import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StateMachineRequest {
  action: 'start' | 'transition' | 'status' | 'cancel';
  hostRunId: string;
  targetState?: string;
  context?: Record<string, any>;
}

interface StateTransition {
  from: string;
  to: string;
  action: string;
  condition?: string;
}

const STATE_MACHINE_CONFIG = {
  states: ['PRECHECKS', 'ENTER_MAINT', 'APPLY', 'POSTCHECKS', 'EXIT_MAINT', 'DONE', 'ERROR'],
  transitions: [
    { from: 'PRECHECKS', to: 'ENTER_MAINT', action: 'precheck_passed' },
    { from: 'PRECHECKS', to: 'ERROR', action: 'precheck_failed' },
    { from: 'ENTER_MAINT', to: 'APPLY', action: 'maintenance_entered' },
    { from: 'ENTER_MAINT', to: 'ERROR', action: 'maintenance_failed' },
    { from: 'APPLY', to: 'POSTCHECKS', action: 'update_completed' },
    { from: 'APPLY', to: 'ERROR', action: 'update_failed' },
    { from: 'POSTCHECKS', to: 'EXIT_MAINT', action: 'postcheck_passed' },
    { from: 'POSTCHECKS', to: 'ERROR', action: 'postcheck_failed' },
    { from: 'EXIT_MAINT', to: 'DONE', action: 'maintenance_exited' },
    { from: 'EXIT_MAINT', to: 'ERROR', action: 'exit_failed' },
    { from: 'ERROR', to: 'PRECHECKS', action: 'retry' }
  ] as StateTransition[]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, hostRunId, targetState, context }: StateMachineRequest = await req.json();

    switch (action) {
      case 'start':
        return await startStateMachine(supabase, hostRunId, context || {});
      
      case 'transition':
        if (!targetState) {
          throw new Error('Target state is required for transition action');
        }
        return await transitionState(supabase, hostRunId, targetState, context || {});
      
      case 'status':
        return await getStateMachineStatus(supabase, hostRunId);
      
      case 'cancel':
        return await cancelStateMachine(supabase, hostRunId);
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Error in state-machine-orchestrator:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function startStateMachine(supabase: any, hostRunId: string, context: Record<string, any>) {
  console.log(`Starting state machine for host run ${hostRunId}`);

  // Create or update host run record
  const { data: hostRun, error: hostRunError } = await supabase
    .from('host_runs')
    .upsert({
      id: hostRunId,
      state: 'PRECHECKS',
      context: context,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (hostRunError) {
    console.error('Failed to create host run:', hostRunError);
    throw hostRunError;
  }

  // Start with prechecks
  await executeStateAction(supabase, hostRunId, 'PRECHECKS', context);

  return new Response(JSON.stringify({
    success: true,
    hostRunId,
    currentState: 'PRECHECKS',
    message: 'State machine started with prechecks'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function transitionState(supabase: any, hostRunId: string, targetState: string, context: Record<string, any>) {
  // Get current state
  const { data: hostRun, error: fetchError } = await supabase
    .from('host_runs')
    .select('*')
    .eq('id', hostRunId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const currentState = hostRun.state;
  
  // Validate transition
  const validTransition = STATE_MACHINE_CONFIG.transitions.find(
    t => t.from === currentState && t.to === targetState
  );

  if (!validTransition) {
    throw new Error(`Invalid transition from ${currentState} to ${targetState}`);
  }

  // Update state
  const { error: updateError } = await supabase
    .from('host_runs')
    .update({
      state: targetState,
      context: { ...hostRun.context, ...context },
      updated_at: new Date().toISOString()
    })
    .eq('id', hostRunId);

  if (updateError) {
    throw updateError;
  }

  // Execute state action
  await executeStateAction(supabase, hostRunId, targetState, { ...hostRun.context, ...context });

  return new Response(JSON.stringify({
    success: true,
    hostRunId,
    previousState: currentState,
    currentState: targetState,
    message: `Transitioned from ${currentState} to ${targetState}`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function executeStateAction(supabase: any, hostRunId: string, state: string, context: Record<string, any>) {
  console.log(`Executing state action for ${state} on host run ${hostRunId}`);

  const serverId = context.serverId;
  if (!serverId) {
    throw new Error('serverId is required in context');
  }

  switch (state) {
    case 'PRECHECKS':
      // Queue readiness check job
      await supabase.functions.invoke('job-queue-manager', {
        body: {
          action: 'create',
          jobData: {
            type: 'health_check',
            hostRunId,
            serverId,
            priority: 1,
            metadata: { checkType: 'readiness', state: 'PRECHECKS' }
          }
        }
      });
      break;

    case 'ENTER_MAINT':
      // Queue maintenance mode entry job
      await supabase.functions.invoke('job-queue-manager', {
        body: {
          action: 'create',
          jobData: {
            type: 'maintenance_mode',
            hostRunId,
            serverId,
            priority: 2,
            metadata: { action: 'enter', state: 'ENTER_MAINT' }
          }
        }
      });
      break;

    case 'APPLY':
      // Queue firmware update job
      await supabase.functions.invoke('job-queue-manager', {
        body: {
          action: 'create',
          jobData: {
            type: 'firmware_update',
            hostRunId,
            serverId,
            priority: 3,
            metadata: { 
              firmwareUrl: context.firmwareUrl,
              updateType: context.updateType || 'immediate',
              state: 'APPLY'
            }
          }
        }
      });
      break;

    case 'POSTCHECKS':
      // Queue post-update health check
      await supabase.functions.invoke('job-queue-manager', {
        body: {
          action: 'create',
          jobData: {
            type: 'health_check',
            hostRunId,
            serverId,
            priority: 4,
            metadata: { checkType: 'post_update', state: 'POSTCHECKS' }
          }
        }
      });
      break;

    case 'EXIT_MAINT':
      // Queue maintenance mode exit job
      await supabase.functions.invoke('job-queue-manager', {
        body: {
          action: 'create',
          jobData: {
            type: 'maintenance_mode',
            hostRunId,
            serverId,
            priority: 5,
            metadata: { action: 'exit', state: 'EXIT_MAINT' }
          }
        }
      });
      break;

    case 'DONE':
      // Mark host run as completed
      await supabase
        .from('host_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', hostRunId);

      // Log completion event
      await supabase.from('system_events').insert({
        event_type: 'host_update_completed',
        severity: 'success',
        title: 'Host Update Completed',
        description: `Host run ${hostRunId} completed successfully`,
        metadata: { hostRunId, serverId, finalState: 'DONE' }
      });
      break;

    case 'ERROR':
      // Mark host run as failed
      await supabase
        .from('host_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: context.errorMessage || 'State machine entered error state'
        })
        .eq('id', hostRunId);

      // Log error event
      await supabase.from('system_events').insert({
        event_type: 'host_update_failed',
        severity: 'error',
        title: 'Host Update Failed',
        description: `Host run ${hostRunId} failed: ${context.errorMessage || 'Unknown error'}`,
        metadata: { hostRunId, serverId, errorState: 'ERROR' }
      });
      break;
  }
}

async function getStateMachineStatus(supabase: any, hostRunId: string) {
  const { data: hostRun, error } = await supabase
    .from('host_runs')
    .select('*')
    .eq('id', hostRunId)
    .single();

  if (error) {
    throw error;
  }

  // Get associated jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('host_run_id', hostRunId)
    .order('created_at', { ascending: true });

  if (jobsError) {
    console.error('Failed to fetch jobs:', jobsError);
  }

  return new Response(JSON.stringify({
    success: true,
    hostRun: {
      id: hostRun.id,
      state: hostRun.state,
      status: hostRun.status,
      context: hostRun.context,
      startedAt: hostRun.started_at,
      completedAt: hostRun.completed_at,
      errorMessage: hostRun.error_message
    },
    jobs: jobs || [],
    availableTransitions: getAvailableTransitions(hostRun.state)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function cancelStateMachine(supabase: any, hostRunId: string) {
  // Cancel all pending jobs for this host run
  await supabase
    .from('background_jobs')
    .update({ 
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'State machine cancelled'
    })
    .eq('host_run_id', hostRunId)
    .in('status', ['queued', 'running']);

  // Update host run status
  await supabase
    .from('host_runs')
    .update({
      state: 'ERROR',
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'State machine cancelled by user'
    })
    .eq('id', hostRunId);

  return new Response(JSON.stringify({
    success: true,
    hostRunId,
    message: 'State machine cancelled'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function getAvailableTransitions(currentState: string): string[] {
  return STATE_MACHINE_CONFIG.transitions
    .filter(t => t.from === currentState)
    .map(t => t.to);
}