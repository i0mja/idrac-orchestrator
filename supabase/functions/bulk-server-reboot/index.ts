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

    const { serverIds, scheduledAt, description, rebootType = 'graceful' } = await req.json()

    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      throw new Error('Server IDs array is required')
    }

    const commands = []

    // Create reboot command for each server
    for (const serverId of serverIds) {
      const rebootCommand = rebootType === 'force' 
        ? 'racadm serveraction powerdown && sleep 5 && racadm serveraction powerup'
        : 'racadm serveraction gracefulreboot'

      const { data: command, error } = await supabase
        .from('background_jobs')
        .insert({
          job_type: 'server_reboot',
          status: scheduledAt ? 'scheduled' : 'pending',
          scheduled_at: scheduledAt,
          data: {
            server_id: serverId,
            command: rebootCommand,
            reboot_type: rebootType,
            description: description || `Server reboot (${rebootType})`
          }
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create reboot command for server ${serverId}:`, error)
        throw error
      }

      commands.push(command)
    }

    // Log bulk operation
    await supabase
      .from('system_events')
      .insert({
        title: 'Bulk Server Reboot',
        description: description || `Bulk server reboot (${rebootType}) initiated for ${serverIds.length} servers`,
        event_type: 'bulk_server_reboot',
        severity: 'warning',
        metadata: {
          server_count: serverIds.length,
          reboot_type: rebootType,
          scheduled_at: scheduledAt,
          command_ids: commands.map(c => c.id)
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled ${commands.length} server reboots`,
        commands 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Bulk server reboot error:', error)
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