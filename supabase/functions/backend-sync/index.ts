import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action: 'sync_host_run' | 'sync_background_job' | 'sync_all' | 'sync_from_local';
  hostRunId?: string;
  jobId?: string;
  data?: any;
  localApiUrl?: string;
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

    const { action, hostRunId, jobId, data, localApiUrl }: SyncRequest = await req.json();

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
      
      case 'sync_from_local':
        if (!localApiUrl) {
          throw new Error('Local API URL is required for sync_from_local action');
        }
        return await syncFromLocalApi(supabase, localApiUrl);
      
      case 'sync_all':
        return await syncAll(supabase, localApiUrl);
      
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

  throw new Error('Host run data is required');
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

  throw new Error('Job data is required');
}

async function syncFromLocalApi(supabase: any, localApiUrl: string) {
  console.log(`Syncing data from local API: ${localApiUrl}`);
  
  try {
    // Fetch host runs from local API
    const hostRunsResponse = await fetch(`${localApiUrl}/plans/status`);
    if (hostRunsResponse.ok) {
      const hostRunsData = await hostRunsResponse.json();
      
      for (const hostRun of hostRunsData.hosts || []) {
        await syncHostRun(supabase, hostRun.id, {
          serverId: hostRun.hostId,
          state: hostRun.state,
          status: 'running', // Map local state to Supabase status
          context: hostRun.ctx,
          startedAt: hostRun.createdAt,
          completedAt: hostRun.updatedAt,
          errorMessage: null
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully synced data from local API'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    throw new Error(`Failed to sync from local API: ${error.message}`);
  }
}

async function syncAll(supabase: any, localApiUrl?: string) {
  console.log('Performing full synchronization between backends');

  const results = {
    hostRuns: 0,
    backgroundJobs: 0,
    errors: []
  };

  try {
    if (localApiUrl) {
      await syncFromLocalApi(supabase, localApiUrl);
      results.hostRuns++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Full synchronization completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    results.errors.push(error.message);
    return new Response(JSON.stringify({
      success: false,
      message: 'Partial synchronization completed with errors',
      results
    }), {
      status: 207, // Multi-status
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}