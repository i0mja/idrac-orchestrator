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

    const { serverIds, scheduledAt, description, patchLevel = 'security' } = await req.json()

    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      throw new Error('Server IDs array is required')
    }

    const patches = []

    // Create patch job for each server
    for (const serverId of serverIds) {
      // Get server OS info to determine patch command
      const { data: server } = await supabase
        .from('servers')
        .select('operating_system')
        .eq('id', serverId)
        .single()

      let patchCommand = ''
      const os = server?.operating_system?.toLowerCase() || ''

      if (os.includes('ubuntu') || os.includes('debian')) {
        patchCommand = patchLevel === 'all' 
          ? 'apt-get update && apt-get upgrade -y'
          : 'apt-get update && apt-get upgrade -y --only-upgrade $(apt list --upgradable 2>/dev/null | grep -i security | cut -d/ -f1)'
      } else if (os.includes('rhel') || os.includes('centos') || os.includes('rocky')) {
        patchCommand = patchLevel === 'all'
          ? 'yum update -y'
          : 'yum update --security -y'
      } else if (os.includes('windows')) {
        patchCommand = 'Install-WindowsUpdate -AcceptAll -AutoReboot'
      } else {
        patchCommand = 'echo "OS not supported for automated patching"'
      }

      const { data: patch, error } = await supabase
        .from('background_jobs')
        .insert({
          job_type: 'security_patch',
          status: scheduledAt ? 'scheduled' : 'pending',
          scheduled_at: scheduledAt,
          data: {
            server_id: serverId,
            command: patchCommand,
            patch_level: patchLevel,
            operating_system: server?.operating_system,
            description: description || `Security patches (${patchLevel})`
          }
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create patch job for server ${serverId}:`, error)
        throw error
      }

      patches.push(patch)
    }

    // Log bulk operation
    await supabase
      .from('system_events')
      .insert({
        title: 'Bulk Security Patch',
        description: description || `Bulk security patching (${patchLevel}) initiated for ${serverIds.length} servers`,
        event_type: 'bulk_security_patch',
        severity: 'info',
        metadata: {
          server_count: serverIds.length,
          patch_level: patchLevel,
          scheduled_at: scheduledAt,
          patch_ids: patches.map(p => p.id)
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled ${patches.length} security patch jobs`,
        patches 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Bulk security patch error:', error)
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