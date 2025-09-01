import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RollingUpdateRequest {
  cluster_id: string;
  firmware_packages: Array<{
    firmware_package_id: string;
    servers?: string[]; // Optional: specific servers, otherwise all in cluster
  }>;
  maintenance_window_start?: string;
  maintenance_window_end?: string;
  max_concurrent_hosts?: number;
  force_update?: boolean;
}

interface PreflightCheck {
  check_name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  blocking: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { cluster_id, firmware_packages, maintenance_window_start, maintenance_window_end, max_concurrent_hosts = 1, force_update = false }: RollingUpdateRequest = await req.json()
    
    console.log('Starting rolling update for cluster:', cluster_id)

    // Get cluster information
    const { data: cluster, error: clusterError } = await supabase
      .from('vcenter_clusters')
      .select(`
        *,
        vcenter:vcenters(*)
      `)
      .eq('id', cluster_id)
      .single()

    if (clusterError || !cluster) {
      throw new Error(`Cluster not found: ${clusterError?.message}`)
    }

    // Get servers in the cluster
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('*')
      .eq('cluster_name', cluster.name)

    if (serversError) {
      throw new Error(`Failed to fetch servers: ${serversError.message}`)
    }

    if (!servers || servers.length === 0) {
      throw new Error('No servers found in cluster')
    }

    console.log(`Found ${servers.length} servers in cluster ${cluster.name}`)

    // Run preflight checks
    const preflightChecks: PreflightCheck[] = []

    // Check cluster HA/DRS status
    if (!cluster.ha_enabled && !force_update) {
      preflightChecks.push({
        check_name: 'ha_enabled',
        status: 'fail',
        message: 'HA is not enabled on this cluster. Updates may cause service disruption.',
        blocking: true
      })
    }

    if (!cluster.drs_enabled) {
      preflightChecks.push({
        check_name: 'drs_enabled',
        status: 'warning',
        message: 'DRS is not enabled. Manual VM migration may be required.',
        blocking: false
      })
    }

    // Check minimum hosts online
    const onlineServers = servers.filter(s => s.status === 'online')
    const minHostsRequired = Math.max(1, Math.ceil(servers.length * 0.5)) // At least 50% must remain online
    
    if (onlineServers.length - max_concurrent_hosts < minHostsRequired) {
      preflightChecks.push({
        check_name: 'minimum_hosts',
        status: 'fail',
        message: `Insufficient hosts online. Need ${minHostsRequired} hosts remaining, but only ${onlineServers.length - max_concurrent_hosts} would remain.`,
        blocking: true
      })
    }

    // Check maintenance window
    const now = new Date()
    let inMaintenanceWindow = true
    
    if (maintenance_window_start && maintenance_window_end) {
      const start = new Date(maintenance_window_start)
      const end = new Date(maintenance_window_end)
      inMaintenanceWindow = now >= start && now <= end
      
      if (!inMaintenanceWindow && !force_update) {
        preflightChecks.push({
          check_name: 'maintenance_window',
          status: 'fail',
          message: `Current time ${now.toISOString()} is outside maintenance window ${start.toISOString()} - ${end.toISOString()}`,
          blocking: true
        })
      }
    }

    // Check for blocking failures
    const blockingFailures = preflightChecks.filter(check => check.blocking && check.status === 'fail')
    
    if (blockingFailures.length > 0 && !force_update) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Preflight checks failed',
        preflight_checks: preflightChecks,
        blocking_failures: blockingFailures
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Create orchestration plan
    const updateSequence = servers.map((server, index) => ({
      server_id: server.id,
      batch_number: Math.floor(index / max_concurrent_hosts) + 1,
      order_in_batch: index % max_concurrent_hosts,
      firmware_packages: firmware_packages.map(fp => fp.firmware_package_id)
    }))

    const totalBatches = Math.ceil(servers.length / max_concurrent_hosts)

    const { data: plan, error: planError } = await supabase
      .from('update_orchestration_plans')
      .insert({
        name: `Rolling Update - ${cluster.name} - ${new Date().toISOString()}`,
        cluster_id: cluster_id,
        server_ids: servers.map(s => s.id),
        update_sequence: updateSequence,
        vmware_settings: {
          cluster_id: cluster_id,
          max_concurrent_hosts: max_concurrent_hosts,
          drs_enabled: cluster.drs_enabled,
          ha_enabled: cluster.ha_enabled
        },
        safety_checks: {
          preflight_checks: preflightChecks,
          min_hosts_online: minHostsRequired,
          maintenance_window: {
            start: maintenance_window_start,
            end: maintenance_window_end
          }
        },
        total_steps: totalBatches,
        status: 'pending'
      })
      .select()
      .single()

    if (planError) {
      throw new Error(`Failed to create orchestration plan: ${planError.message}`)
    }

    // Create individual update jobs for the first batch
    const firstBatch = updateSequence.filter(item => item.batch_number === 1)
    const jobs = []

    for (const batchItem of firstBatch) {
      for (const firmwarePackageId of batchItem.firmware_packages) {
        const { data: job, error: jobError } = await supabase
          .from('update_jobs')
          .insert({
            server_id: batchItem.server_id,
            firmware_package_id: firmwarePackageId,
            status: 'pending',
            scheduled_at: maintenance_window_start || new Date().toISOString()
          })
          .select()
          .single()

        if (jobError) {
          console.error('Failed to create job:', jobError)
          continue
        }

        jobs.push(job)
      }
    }

    // Log system event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'rolling_update_started',
        severity: 'info',
        title: `Rolling Update Started - ${cluster.name}`,
        description: `Rolling update plan created for cluster ${cluster.name} with ${servers.length} servers in ${totalBatches} batches`,
        metadata: {
          cluster_id: cluster_id,
          plan_id: plan.id,
          total_servers: servers.length,
          total_batches: totalBatches,
          preflight_checks: preflightChecks
        }
      })

    console.log(`Created orchestration plan ${plan.id} with ${jobs.length} initial jobs`)

    return new Response(JSON.stringify({
      success: true,
      plan_id: plan.id,
      total_servers: servers.length,
      total_batches: totalBatches,
      initial_jobs: jobs.length,
      preflight_checks: preflightChecks,
      next_batch_starts_at: maintenance_window_start || new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error starting rolling update:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})