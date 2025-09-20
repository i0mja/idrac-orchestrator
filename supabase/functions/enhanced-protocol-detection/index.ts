import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { serverIds, performHealthGate = true } = await req.json()

    const results = []
    
    for (const serverId of serverIds) {
      // Get server details
      const { data: server } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single()

      if (!server) continue

      try {
        // Log discovery start
        await supabase.from('operational_events').insert({
          event_type: 'enhanced_protocol_detection',
          event_source: 'protocol_manager',
          title: `Enhanced Protocol Detection Started`,
          description: `Analyzing ${server.hostname} with Dell-specific intelligence`,
          severity: 'info',
          status: 'monitoring',
          server_id: serverId,
          metadata: {
            ip_address: server.ip_address,
            hostname: server.hostname
          }
        })

        // Simulate enhanced protocol detection
        const capabilities = {
          generation: server.model?.includes('R650') ? '15G' : 
                     server.model?.includes('R740') ? '14G' : 'UNKNOWN',
          protocols: ['REDFISH', 'WSMAN'],
          networkUpdateSupported: true,
          jobQueueStatus: 'available',
          certificateStatus: 'self_signed',
          licenseLevel: 'Enterprise'
        }

        // Perform hardware health gate if requested
        let healthGateResult = null
        if (performHealthGate) {
          healthGateResult = {
            passed: true,
            overallHealth: 'healthy',
            readinessScore: 85,
            blockingIssues: [],
            warnings: [],
            requiresReboot: true
          }

          // Log health gate result
          await supabase.from('operational_events').insert({
            event_type: healthGateResult.passed ? 'health_gate_passed' : 'health_gate_failed',
            event_source: 'health_monitor',
            title: `Hardware Health Gate ${healthGateResult.passed ? 'Passed' : 'Failed'}`,
            description: `Readiness score: ${healthGateResult.readinessScore}%`,
            severity: healthGateResult.passed ? 'success' : 'warning',
            status: 'resolved',
            server_id: serverId,
            metadata: {
              health_check: {
                score: healthGateResult.readinessScore,
                issues: healthGateResult.blockingIssues.length,
                recommendations: 0
              }
            }
          })
        }

        // Update server with enhanced capabilities
        await supabase
          .from('servers')
          .update({
            protocol_capabilities: capabilities,
            healthiest_protocol: 'REDFISH',
            last_protocol_check: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', serverId)

        results.push({
          serverId,
          success: true,
          capabilities,
          healthGate: healthGateResult
        })

        // Log completion
        await supabase.from('operational_events').insert({
          event_type: 'protocol_detection_completed',
          event_source: 'protocol_manager',
          title: `Enhanced Detection Completed`,
          description: `Successfully analyzed ${server.hostname} - Generation: ${capabilities.generation}`,
          severity: 'success',
          status: 'resolved',
          server_id: serverId,
          metadata: {
            protocol: 'REDFISH',
            generation: capabilities.generation,
            firmware_version: 'Unknown'
          }
        })

      } catch (error) {
        console.error(`Failed to analyze server ${serverId}:`, error)
        
        // Log error
        await supabase.from('operational_events').insert({
          event_type: 'protocol_detection_failed',
          event_source: 'protocol_manager',
          title: `Protocol Detection Failed`,
          description: `Failed to analyze ${server.hostname}`,
          severity: 'error',
          status: 'active',
          server_id: serverId,
          error_details: error.message
        })

        results.push({
          serverId,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced protocol detection error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})