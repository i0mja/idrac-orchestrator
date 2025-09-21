import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { serverIds, firmwarePackageId, scheduledAt, description } = await req.json()

    // Validate input
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      throw new Error('Server IDs array is required')
    }

    if (!firmwarePackageId) {
      throw new Error('Firmware package ID is required')
    }

    const jobs = []

    // Create update job for each server
    for (const serverId of serverIds) {
      const { data: job, error } = await supabase
        .from('update_jobs')
        .insert({
          server_id: serverId,
          firmware_package_id: firmwarePackageId,
          status: scheduledAt ? 'scheduled' : 'pending',
          scheduled_at: scheduledAt,
          progress: 0
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create job for server ${serverId}:`, error)
        throw error
      }

      jobs.push(job)
    }

    // Log bulk operation
    const { error: logError } = await supabase
      .from('system_events')
      .insert({
        title: 'Bulk Firmware Update',
        description: description || `Bulk firmware update initiated for ${serverIds.length} servers`,
        event_type: 'bulk_firmware_update',
        severity: 'info',
        metadata: {
          server_count: serverIds.length,
          firmware_package_id: firmwarePackageId,
          scheduled_at: scheduledAt,
          job_ids: jobs.map(j => j.id)
        }
      })

    if (logError) {
      console.error('Failed to log bulk operation:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${jobs.length} firmware update jobs`,
        jobs 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Bulk firmware update error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})