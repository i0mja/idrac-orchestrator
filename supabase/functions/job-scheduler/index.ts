import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Job scheduler running...');

    // Process pending jobs
    const { data: pendingJobs } = await supabase.functions.invoke('background-job-processor', {
      body: { action: 'process_next', maxJobs: 10 }
    });

    // Clean up old completed jobs (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { error: cleanupError } = await supabase
      .from('background_jobs')
      .delete()
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', sevenDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Failed to clean up old jobs:', cleanupError);
    }

    // Update job metrics
    const { data: jobStats, error: statsError } = await supabase
      .from('background_jobs')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (!statsError && jobStats) {
      const stats = jobStats.reduce((acc: any, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});

      console.log('Job statistics (last 24h):', stats);

      // Log system event if there are many failed jobs
      if (stats.failed > 10) {
        await supabase.from('system_events').insert({
          event_type: 'job_failures',
          severity: 'warning',
          title: 'High Job Failure Rate Detected',
          description: `${stats.failed} jobs failed in the last 24 hours`,
          metadata: { jobStats: stats }
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Job scheduler completed',
      processedJobs: pendingJobs?.processedJobs || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in job-scheduler:', error);
    
    // Log scheduler error as system event
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('system_events').insert({
        event_type: 'scheduler_error',
        severity: 'error',
        title: 'Job Scheduler Error',
        description: `Job scheduler failed: ${error.message}`,
        metadata: { error: error.message, stack: error.stack }
      });
    } catch (logError) {
      console.error('Failed to log scheduler error:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});