import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action: 'sync_host_run' | 'sync_background_job' | 'sync_all';
  hostRunId?: string;
  jobId?: string;
  data?: any;
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

    const { action, hostRunId, jobId, data }: SyncRequest = await req.json();

    switch (action) {
      case 'sync_host_run':
        if (!hostRunId) {
          throw new Error('Host run ID is required for sync_host_run action');
        }
        return await syncHostRun(supabase, hostRunId, data);
      
      case 'sync_background_job':
        if (!jobId) {
          throw new Error('Job ID is required for sync_background_job action');
        }
        return await syncBackgroundJob(supabase, jobId, data);
      
      case 'sync_all':
        return await syncAll(supabase);
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Error in backend-sync:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function syncHostRun(supabase: any, hostRunId: string, data?: any) {
  console.log(`Syncing host run ${hostRunId} to Supabase`);

  // If data is provided, use it; otherwise we would need to fetch from local API
  if (data) {
    const { error } = await supabase
      .from('host_runs')
      .upsert({
        id: hostRunId,
        server_id: data.serverId,
        state: data.state,
        status: data.status,
        context: data.context,
        started_at: data.startedAt,
        completed_at: data.completedAt,
        error_message: data.errorMessage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Host run ${hostRunId} synced successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // If no data provided, we would need to fetch from local API
  // This would require the local API URL to be configured
  return new Response(JSON.stringify({
    success: false,
    error: 'Data synchronization from local API not yet implemented'
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function syncBackgroundJob(supabase: any, jobId: string, data?: any) {
  console.log(`Syncing background job ${jobId} to Supabase`);

  if (data) {
    const { error } = await supabase
      .from('background_jobs')
      .upsert({
        id: jobId,
        job_type: data.jobType,
        server_id: data.serverId,
        host_run_id: data.hostRunId,
        status: data.status,
        priority: data.priority || 10,
        progress: data.progress || 0,
        metadata: data.metadata || {},
        scheduled_at: data.scheduledAt || new Date().toISOString(),
        started_at: data.startedAt,
        completed_at: data.completedAt,
        error_message: data.errorMessage,
        logs: data.logs,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Background job ${jobId} synced successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Data synchronization from local API not yet implemented'
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function syncAll(supabase: any) {
  console.log('Performing full synchronization between backends');

  // This would be a comprehensive sync operation
  // For now, just return a placeholder response
  return new Response(JSON.stringify({
    success: true,
    message: 'Full synchronization would be implemented here',
    todo: [
      'Fetch all host_runs from local API',
      'Sync host_runs to Supabase',
      'Fetch all background_jobs from local API', 
      'Sync background_jobs to Supabase',
      'Handle conflicts and data consistency'
    ]
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}