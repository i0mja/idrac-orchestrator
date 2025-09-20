import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobProcessorRequest {
  action: 'process_next' | 'process_job';
  jobId?: string;
  maxJobs?: number;
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

    const { action, jobId, maxJobs = 5 }: JobProcessorRequest = await req.json();

    switch (action) {
      case 'process_next':
        // Atomically claim jobs to prevent race conditions
        const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_jobs', {
          max_jobs: maxJobs,
          processor_id: crypto.randomUUID()
        });

        if (claimError) {
          console.error('Failed to claim jobs:', claimError);
          // Fall back to non-atomic approach if RPC doesn't exist
          const { data: availableJobs, error: fetchError } = await supabase
            .from('background_jobs')
            .select('*')
            .eq('status', 'queued')
            .lte('scheduled_at', new Date().toISOString())
            .order('priority', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(maxJobs);

          if (fetchError) {
            throw fetchError;
          }

          // Use availableJobs as fallback
          let processedJobs = [];
          
          for (const job of availableJobs || []) {
            try {
              // Try to atomically mark as running before processing
              const { data: updateResult, error: updateError } = await supabase
                .from('background_jobs')
                .update({ 
                  status: 'running',
                  started_at: new Date().toISOString()
                })
                .eq('id', job.id)
                .eq('status', 'queued') // Only update if still queued
                .select();

              if (updateError || !updateResult?.length) {
                console.log(`Job ${job.id} was already claimed by another processor`);
                continue;
              }

              const result = await processJob(supabase, job);
              processedJobs.push(result);
            } catch (error) {
              console.error(`Failed to process job ${job.id}:`, error);
              await updateJobStatus(supabase, job.id, 'failed', 0, error.message);
            }
          }
        } else {
          // Process claimed jobs
          processedJobs = [];
          
          for (const job of claimedJobs || []) {
            try {
              const result = await processJob(supabase, job);
              processedJobs.push(result);
            } catch (error) {
              console.error(`Failed to process job ${job.id}:`, error);
              await updateJobStatus(supabase, job.id, 'failed', 0, error.message);
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          processedJobs: processedJobs.length,
          jobs: processedJobs
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'process_job':
        if (!jobId) {
          throw new Error('Job ID is required for process_job action');
        }

        const { data: job, error: jobError } = await supabase
          .from('background_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) {
          throw jobError;
        }

        const result = await processJob(supabase, job);

        return new Response(JSON.stringify({
          success: true,
          job: result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Error in background-job-processor:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processJob(supabase: any, job: any) {
  console.log(`Processing job ${job.id} of type ${job.job_type}`);
  
  // Mark job as running
  await updateJobStatus(supabase, job.id, 'running', 0, null, new Date().toISOString());

  try {
    let result;
    
    switch (job.job_type) {
      case 'firmware_update':
        result = await processFirmwareUpdate(supabase, job);
        break;
      case 'maintenance_mode':
        result = await processMaintenanceMode(supabase, job);
        break;
      case 'health_check':
        result = await processHealthCheck(supabase, job);
        break;
      case 'vcenter_sync':
        result = await processVCenterSync(supabase, job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }

    // Mark job as completed
    await updateJobStatus(
      supabase, 
      job.id, 
      'completed', 
      100, 
      null, 
      null, 
      new Date().toISOString(),
      result.logs
    );

    return {
      id: job.id,
      type: job.job_type,
      status: 'completed',
      result
    };

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await updateJobStatus(supabase, job.id, 'failed', job.progress || 0, error.message);
    throw error;
  }
}

async function processFirmwareUpdate(supabase: any, job: any) {
  const logs = [`Starting firmware update for server ${job.server_id}`];
  
  // Update progress periodically
  await updateJobStatus(supabase, job.id, 'running', 10, null, null, null, logs);
  
  // Call redfish-update function
  const { data, error } = await supabase.functions.invoke('redfish-update', {
    body: {
      serverId: job.server_id,
      firmwareUrl: job.metadata?.firmwareUrl,
      updateType: job.metadata?.updateType || 'immediate'
    }
  });

  if (error) {
    throw new Error(`Redfish update failed: ${error.message}`);
  }

  logs.push('Firmware update completed successfully');
  await updateJobStatus(supabase, job.id, 'running', 90, null, null, null, logs);

  return { 
    success: true, 
    redfishResult: data,
    logs 
  };
}

async function processMaintenanceMode(supabase: any, job: any) {
  const logs = [`Managing maintenance mode for server ${job.server_id}`];
  
  await updateJobStatus(supabase, job.id, 'running', 20, null, null, null, logs);

  // Call host-maintenance-mode function
  const { data, error } = await supabase.functions.invoke('host-maintenance-mode', {
    body: {
      serverId: job.server_id,
      action: job.metadata?.action || 'enter',
      force: job.metadata?.force || false
    }
  });

  if (error) {
    throw new Error(`Maintenance mode operation failed: ${error.message}`);
  }

  logs.push(`Maintenance mode ${job.metadata?.action || 'enter'} completed`);
  await updateJobStatus(supabase, job.id, 'running', 80, null, null, null, logs);

  return { 
    success: true, 
    maintenanceResult: data,
    logs 
  };
}

async function processHealthCheck(supabase: any, job: any) {
  const logs = [`Running health check for server ${job.server_id}`];
  
  await updateJobStatus(supabase, job.id, 'running', 30, null, null, null, logs);

  // Call host-readiness-check function
  const { data, error } = await supabase.functions.invoke('host-readiness-check', {
    body: {
      serverId: job.server_id,
      checkType: job.metadata?.checkType || 'full'
    }
  });

  if (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }

  logs.push('Health check completed successfully');
  await updateJobStatus(supabase, job.id, 'running', 90, null, null, null, logs);

  return { 
    success: true, 
    healthResult: data,
    logs 
  };
}

async function processVCenterSync(supabase: any, job: any) {
  const logs = [`Syncing vCenter data for server ${job.server_id}`];
  
  await updateJobStatus(supabase, job.id, 'running', 25, null, null, null, logs);

  // Call vcenter-integration function
  const { data, error } = await supabase.functions.invoke('vcenter-integration', {
    body: {
      action: 'sync_host',
      serverId: job.server_id,
      vcenterId: job.metadata?.vcenterId
    }
  });

  if (error) {
    throw new Error(`vCenter sync failed: ${error.message}`);
  }

  logs.push('vCenter sync completed successfully');
  await updateJobStatus(supabase, job.id, 'running', 85, null, null, null, logs);

  return { 
    success: true, 
    vcenterResult: data,
    logs 
  };
}

async function updateJobStatus(
  supabase: any, 
  jobId: string, 
  status: string, 
  progress: number, 
  errorMessage?: string | null,
  startedAt?: string | null,
  completedAt?: string | null,
  logs?: string[]
) {
  const updateData: any = { 
    status, 
    progress,
    updated_at: new Date().toISOString()
  };

  if (errorMessage !== undefined) updateData.error_message = errorMessage;
  if (startedAt) updateData.started_at = startedAt;
  if (completedAt) updateData.completed_at = completedAt;
  if (logs) updateData.logs = logs.join('\n');

  const { error } = await supabase
    .from('background_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to update job ${jobId} status:`, error);
  }
}