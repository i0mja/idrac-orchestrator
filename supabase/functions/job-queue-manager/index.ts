import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobRequest {
  action: 'create' | 'cancel' | 'retry' | 'status' | 'list';
  jobData?: {
    type: 'firmware_update' | 'maintenance_mode' | 'health_check' | 'vcenter_sync';
    hostRunId: string;
    serverId: string;
    priority?: number;
    delay?: number;
    metadata?: Record<string, any>;
  };
  jobId?: string;
  filters?: {
    status?: string[];
    type?: string;
    serverId?: string;
  };
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

    const { action, jobData, jobId, filters }: JobRequest = await req.json();

    switch (action) {
      case 'create':
        if (!jobData) {
          throw new Error('Job data is required for create action');
        }

        // Create job record in database
        const { data: job, error: jobError } = await supabase
          .from('background_jobs')
          .insert({
            job_type: jobData.type,
            host_run_id: jobData.hostRunId,
            server_id: jobData.serverId,
            priority: jobData.priority || 10,
            status: 'queued',
            metadata: jobData.metadata || {},
            scheduled_at: jobData.delay ? new Date(Date.now() + jobData.delay * 1000) : new Date()
          })
          .select()
          .single();

        if (jobError) {
          console.error('Failed to create job:', jobError);
          throw jobError;
        }

        // Simulate Redis queue by updating job status
        console.log(`Job ${job.id} queued for processing`);

        return new Response(JSON.stringify({
          success: true,
          job: {
            id: job.id,
            type: job.job_type,
            status: job.status,
            queuedAt: job.created_at
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'cancel':
        if (!jobId) {
          throw new Error('Job ID is required for cancel action');
        }

        const { error: cancelError } = await supabase
          .from('background_jobs')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString(),
            error_message: 'Job cancelled by user'
          })
          .eq('id', jobId)
          .eq('status', 'queued'); // Only cancel queued jobs

        if (cancelError) {
          console.error('Failed to cancel job:', cancelError);
          throw cancelError;
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Job cancelled successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'retry':
        if (!jobId) {
          throw new Error('Job ID is required for retry action');
        }

        // Get current job to check retry count
        const { data: currentJob, error: fetchError } = await supabase
          .from('background_jobs')
          .select('retry_count, max_retries')
          .eq('id', jobId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (currentJob.retry_count >= currentJob.max_retries) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Job has exceeded maximum retry attempts'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: retryError } = await supabase
          .from('background_jobs')
          .update({
            status: 'queued',
            retry_count: currentJob.retry_count + 1,
            error_message: null,
            completed_at: null,
            scheduled_at: new Date().toISOString()
          })
          .eq('id', jobId)
          .in('status', ['failed', 'cancelled']);

        if (retryError) {
          console.error('Failed to retry job:', retryError);
          throw retryError;
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Job queued for retry'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'status':
        if (!jobId) {
          throw new Error('Job ID is required for status action');
        }

        const { data: statusJob, error: statusError } = await supabase
          .from('background_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (statusError) {
          console.error('Failed to get job status:', statusError);
          throw statusError;
        }

        return new Response(JSON.stringify({
          success: true,
          job: {
            id: statusJob.id,
            type: statusJob.job_type,
            status: statusJob.status,
            progress: statusJob.progress,
            createdAt: statusJob.created_at,
            startedAt: statusJob.started_at,
            completedAt: statusJob.completed_at,
            errorMessage: statusJob.error_message,
            logs: statusJob.logs,
            metadata: statusJob.metadata
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'list':
        let query = supabase
          .from('background_jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (filters?.status) {
          query = query.in('status', filters.status);
        }
        if (filters?.type) {
          query = query.eq('job_type', filters.type);
        }
        if (filters?.serverId) {
          query = query.eq('server_id', filters.serverId);
        }

        const { data: jobs, error: listError } = await query;

        if (listError) {
          console.error('Failed to list jobs:', listError);
          throw listError;
        }

        return new Response(JSON.stringify({
          success: true,
          jobs: jobs.map(job => ({
            id: job.id,
            type: job.job_type,
            status: job.status,
            progress: job.progress,
            serverId: job.server_id,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            errorMessage: job.error_message
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Error in job-queue-manager:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});