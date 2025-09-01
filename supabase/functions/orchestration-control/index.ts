import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrchestrationControlRequest {
  plan_id: string;
  action: 'pause' | 'resume' | 'cancel' | 'status';
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { plan_id, action, reason }: OrchestrationControlRequest = await req.json()
    
    console.log(`Orchestration control: ${action} for plan ${plan_id}`)

    // Get current plan status
    const { data: plan, error: planError } = await supabase
      .from('update_orchestration_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      throw new Error(`Plan not found: ${planError?.message}`)
    }

    if (action === 'status') {
      // Get current job statuses for this plan
      const { data: jobs, error: jobsError } = await supabase
        .from('update_jobs')
        .select(`
          *,
          server:servers(hostname, ip_address),
          firmware_package:firmware_packages(name, version)
        `)
        .in('server_id', plan.server_ids)
        .order('created_at', { ascending: false })

      if (jobsError) {
        throw new Error(`Failed to get job statuses: ${jobsError.message}`)
      }

      const jobsByStatus = {
        pending: jobs?.filter(j => j.status === 'pending').length || 0,
        running: jobs?.filter(j => j.status === 'running').length || 0,
        completed: jobs?.filter(j => j.status === 'completed').length || 0,
        failed: jobs?.filter(j => j.status === 'failed').length || 0,
        cancelled: jobs?.filter(j => j.status === 'cancelled').length || 0,
      }

      const overallProgress = plan.total_steps > 0 ? 
        Math.round((plan.current_step / plan.total_steps) * 100) : 0

      return new Response(JSON.stringify({
        success: true,
        plan: plan,
        jobs_summary: jobsByStatus,
        total_jobs: jobs?.length || 0,
        overall_progress: overallProgress,
        recent_jobs: jobs?.slice(0, 10) || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let newStatus = plan.status
    let statusMessage = ''

    if (action === 'pause') {
      if (plan.status === 'running') {
        newStatus = 'paused'
        statusMessage = `Plan paused${reason ? ': ' + reason : ''}`
        
        // Cancel any pending jobs
        await supabase
          .from('update_jobs')
          .update({ status: 'cancelled' })
          .in('server_id', plan.server_ids)
          .eq('status', 'pending')

      } else {
        throw new Error(`Cannot pause plan in status: ${plan.status}`)
      }
      
    } else if (action === 'resume') {
      if (plan.status === 'paused') {
        newStatus = 'running'
        statusMessage = `Plan resumed${reason ? ': ' + reason : ''}`
        
        // Get the next batch of servers that need updating
        const updateSequence = plan.update_sequence as any[]
        const currentBatch = plan.current_step + 1
        const nextBatch = updateSequence.filter(item => item.batch_number === currentBatch)
        
        // Create new jobs for the next batch
        for (const batchItem of nextBatch) {
          for (const firmwarePackageId of batchItem.firmware_packages) {
            await supabase
              .from('update_jobs')
              .insert({
                server_id: batchItem.server_id,
                firmware_package_id: firmwarePackageId,
                status: 'pending'
              })
          }
        }
        
      } else {
        throw new Error(`Cannot resume plan in status: ${plan.status}`)
      }
      
    } else if (action === 'cancel') {
      if (['pending', 'running', 'paused'].includes(plan.status)) {
        newStatus = 'cancelled'
        statusMessage = `Plan cancelled${reason ? ': ' + reason : ''}`
        
        // Cancel all pending and running jobs
        await supabase
          .from('update_jobs')
          .update({ 
            status: 'cancelled',
            error_message: `Cancelled due to plan cancellation${reason ? ': ' + reason : ''}`
          })
          .in('server_id', plan.server_ids)
          .in('status', ['pending', 'running'])

      } else {
        throw new Error(`Cannot cancel plan in status: ${plan.status}`)
      }
      
    } else {
      throw new Error(`Invalid action: ${action}`)
    }

    // Update the plan status
    const { data: updatedPlan, error: updateError } = await supabase
      .from('update_orchestration_plans')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update plan: ${updateError.message}`)
    }

    // Log system event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'orchestration_control',
        severity: action === 'cancel' ? 'warning' : 'info',
        title: `Orchestration ${action.toUpperCase()}`,
        description: statusMessage,
        metadata: {
          plan_id: plan_id,
          action: action,
          previous_status: plan.status,
          new_status: newStatus,
          reason: reason
        }
      })

    console.log(`Plan ${plan_id} ${action} completed. Status: ${plan.status} -> ${newStatus}`)

    return new Response(JSON.stringify({
      success: true,
      action: action,
      plan: updatedPlan,
      message: statusMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in orchestration control:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})