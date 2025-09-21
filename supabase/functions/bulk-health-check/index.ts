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

    const { serverIds, scheduledAt, description, checkType = 'comprehensive' } = await req.json()

    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      throw new Error('Server IDs array is required')
    }

    const healthChecks = []

    // Define health check commands
    const getHealthCheckCommand = (type: string) => {
      switch (type) {
        case 'basic':
          return 'racadm getsysinfo && racadm serveraction powerstatus'
        case 'hardware':
          return 'racadm getsysinfo && racadm getsel && racadm getsensorinfo'
        case 'comprehensive':
          return 'racadm getsysinfo && racadm getsel && racadm getsensorinfo && racadm storage get controllers && racadm get BIOS'
        case 'network':
          return 'racadm getniccfg && ping -c 4 8.8.8.8'
        default:
          return 'racadm getsysinfo'
      }
    }

    // Create health check job for each server
    for (const serverId of serverIds) {
      const { data: healthCheck, error } = await supabase
        .from('background_jobs')
        .insert({
          job_type: 'health_check',
          status: scheduledAt ? 'scheduled' : 'pending',
          scheduled_at: scheduledAt,
          data: {
            server_id: serverId,
            command: getHealthCheckCommand(checkType),
            check_type: checkType,
            description: description || `Health check (${checkType})`
          }
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create health check for server ${serverId}:`, error)
        throw error
      }

      healthChecks.push(healthCheck)
    }

    // Log bulk operation
    await supabase
      .from('system_events')
      .insert({
        title: 'Bulk Health Check',
        description: description || `Bulk health check (${checkType}) initiated for ${serverIds.length} servers`,
        event_type: 'bulk_health_check',
        severity: 'info',
        metadata: {
          server_count: serverIds.length,
          check_type: checkType,
          scheduled_at: scheduledAt,
          health_check_ids: healthChecks.map(h => h.id)
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled ${healthChecks.length} health checks`,
        healthChecks 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Bulk health check error:', error)
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