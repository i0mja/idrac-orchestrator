import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MaintenanceRequest {
  action: 'enter' | 'exit' | 'status' | 'pre-check'
  vcenter_id: string
  host_moid: string
  options?: {
    evacuate_vms?: boolean
    timeout_minutes?: number
    force?: boolean
    wait_for_completion?: boolean
  }
}

interface PreCheckResult {
  can_enter_maintenance: boolean
  blocking_issues: string[]
  warnings: string[]
  vm_evacuation_plan?: {
    total_vms: number
    evacuatable_vms: number
    problem_vms: Array<{
      vm_name: string
      issue: string
      resolution?: string
    }>
  }
  estimated_duration_minutes: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const request: MaintenanceRequest = await req.json()
    const { action, vcenter_id, host_moid, options = {} } = request

    // Get vCenter configuration
    const { data: vcenter, error: vcenterError } = await supabase
      .from('vcenters')
      .select('*')
      .eq('id', vcenter_id)
      .single()

    if (vcenterError || !vcenter) {
      throw new Error(`vCenter not found: ${vcenterError?.message}`)
    }

    const session = await createVCenterSession(vcenter)

    switch (action) {
      case 'pre-check':
        return await handlePreCheck(supabase, session, host_moid)
      
      case 'enter':
        return await handleEnterMaintenance(supabase, session, host_moid, options)
      
      case 'exit':
        return await handleExitMaintenance(supabase, session, host_moid, options)
      
      case 'status':
        return await handleMaintenanceStatus(supabase, session, host_moid)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Host maintenance mode error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createVCenterSession(vcenter: any) {
  const port = vcenter.port || 443
  const baseUrl = `https://${vcenter.hostname}:${port}`
  
  const authHeader = `Basic ${btoa(`${vcenter.username}:${vcenter.password}`)}`
  
  const response = await fetch(`${baseUrl}/rest/com/vmware/cis/session`, {
    method: 'POST',
    headers: { 'Authorization': authHeader }
  })

  if (!response.ok) {
    throw new Error(`vCenter authentication failed: ${response.status}`)
  }

  const sessionData = await response.json()
  return {
    token: sessionData.value,
    baseUrl
  }
}

async function handlePreCheck(supabase: any, session: any, hostMoid: string) {
  const headers = { 'vmware-api-session-id': session.token }
  
  // Get host details
  const hostResponse = await fetch(`${session.baseUrl}/rest/vcenter/host/${hostMoid}`, {
    headers
  })

  if (!hostResponse.ok) {
    throw new Error(`Failed to get host details: ${hostResponse.status}`)
  }

  const hostData = await hostResponse.json()
  const host = hostData.value

  // Get VMs on this host
  const vmsResponse = await fetch(`${session.baseUrl}/rest/vcenter/vm?filter.hosts=${hostMoid}`, {
    headers
  })

  const vmsData = await vmsResponse.json()
  const vms = vmsData.value || []

  const blockingIssues: string[] = []
  const warnings: string[] = []
  const problemVms: any[] = []

  // Check if host is already in maintenance mode
  if (host.connection_state === 'MAINTENANCE') {
    blockingIssues.push('Host is already in maintenance mode')
  }

  // Check if host is connected
  if (host.connection_state !== 'CONNECTED') {
    blockingIssues.push(`Host is not connected (current state: ${host.connection_state})`)
  }

  // Check cluster configuration for safe maintenance
  const clusterResponse = await fetch(`${session.baseUrl}/rest/vcenter/cluster/${host.cluster}`, {
    headers
  })

  if (clusterResponse.ok) {
    const clusterData = await clusterResponse.json()
    const cluster = clusterData.value

    if (!cluster.drs_enabled) {
      warnings.push('DRS is disabled - VMs cannot be automatically migrated')
    }

    if (!cluster.ha_enabled) {
      warnings.push('HA is disabled - reduced fault tolerance during maintenance')
    }

    // Check remaining capacity
    const clusterHostsResponse = await fetch(`${session.baseUrl}/rest/vcenter/host?filter.clusters=${host.cluster}`, {
      headers
    })

    if (clusterHostsResponse.ok) {
      const clusterHostsData = await clusterHostsResponse.json()
      const clusterHosts = clusterHostsData.value || []
      const connectedHosts = clusterHosts.filter((h: any) => h.connection_state === 'CONNECTED')

      if (connectedHosts.length <= 2) {
        warnings.push('Low number of available hosts - consider maintenance window timing')
      }
    }
  }

  // Analyze VMs for evacuation
  let evacuatableVms = 0
  for (const vm of vms) {
    try {
      // Get VM details for evacuation analysis
      const vmDetailResponse = await fetch(`${session.baseUrl}/rest/vcenter/vm/${vm.vm}`, {
        headers
      })

      if (vmDetailResponse.ok) {
        const vmDetail = await vmDetailResponse.json()
        const vmInfo = vmDetail.value

        if (vmInfo.power_state === 'POWERED_ON') {
          evacuatableVms++
        } else {
          evacuatableVms++ // Powered off VMs are easier to migrate
        }
      }
    } catch (error) {
      problemVms.push({
        vm_name: vm.name,
        issue: `Unable to analyze VM: ${error.message}`,
        resolution: 'Manually verify VM status before maintenance'
      })
    }
  }

  // Estimate maintenance duration
  const estimatedDurationMinutes = Math.max(10, vms.length * 2 + problemVms.length * 5)

  // Log the pre-check
  await supabase
    .from('system_events')
    .insert({
      event_type: 'maintenance_pre_check',
      severity: blockingIssues.length > 0 ? 'warning' : 'info',
      title: `Maintenance pre-check for host ${host.name}`,
      description: `Found ${blockingIssues.length} blocking issues, ${warnings.length} warnings, ${vms.length} VMs to evacuate`,
      metadata: {
        host_moid: hostMoid,
        host_name: host.name,
        vm_count: vms.length,
        blocking_issues: blockingIssues,
        warnings: warnings
      }
    })

  const preCheckResult: PreCheckResult = {
    can_enter_maintenance: blockingIssues.length === 0,
    blocking_issues: blockingIssues,
    warnings: warnings,
    vm_evacuation_plan: {
      total_vms: vms.length,
      evacuatable_vms: evacuatableVms,
      problem_vms: problemVms
    },
    estimated_duration_minutes: estimatedDurationMinutes
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      pre_check_result: preCheckResult
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleEnterMaintenance(supabase: any, session: any, hostMoid: string, options: any) {
  const headers = { 
    'vmware-api-session-id': session.token,
    'Content-Type': 'application/json'
  }
  
  // First perform pre-check unless forced
  if (!options.force) {
    const preCheckResponse = await handlePreCheck(supabase, session, hostMoid)
    const preCheckData = await preCheckResponse.json()
    
    if (!preCheckData.pre_check_result?.can_enter_maintenance) {
      throw new Error(`Pre-check failed: ${preCheckData.pre_check_result?.blocking_issues.join(', ')}`)
    }
  }

  // Enter maintenance mode
  const payload = {
    evacuate_all: options.evacuate_vms !== false,
    timeout: Math.max(300, (options.timeout_minutes || 60) * 60)
  }

  const response = await fetch(`${session.baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=enter`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to enter maintenance mode: ${response.status} ${errorText}`)
  }

  const taskData = await response.json()
  const taskId = taskData.value

  // Log the maintenance entry
  await supabase
    .from('system_events')
    .insert({
      event_type: 'maintenance_mode_enter',
      severity: 'info',
      title: `Entering maintenance mode`,
      description: `Host maintenance mode entry initiated with task ${taskId}`,
      metadata: {
        host_moid: hostMoid,
        task_id: taskId,
        evacuate_vms: payload.evacuate_all,
        timeout_seconds: payload.timeout
      }
    })

  return new Response(
    JSON.stringify({ 
      success: true,
      task_id: taskId,
      message: 'Maintenance mode entry initiated',
      status: 'in_progress'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleExitMaintenance(supabase: any, session: any, hostMoid: string, options: any) {
  const headers = { 'vmware-api-session-id': session.token }
  
  const response = await fetch(`${session.baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=exit`, {
    method: 'POST',
    headers
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exit maintenance mode: ${response.status} ${errorText}`)
  }

  const taskData = await response.json()
  const taskId = taskData.value

  // Log the maintenance exit
  await supabase
    .from('system_events')
    .insert({
      event_type: 'maintenance_mode_exit',
      severity: 'info',
      title: `Exiting maintenance mode`,
      description: `Host maintenance mode exit initiated with task ${taskId}`,
      metadata: {
        host_moid: hostMoid,
        task_id: taskId
      }
    })

  return new Response(
    JSON.stringify({ 
      success: true,
      task_id: taskId,
      message: 'Maintenance mode exit initiated',
      status: 'in_progress'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleMaintenanceStatus(supabase: any, session: any, hostMoid: string) {
  const headers = { 'vmware-api-session-id': session.token }
  
  const response = await fetch(`${session.baseUrl}/rest/vcenter/host/${hostMoid}`, {
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to get host status: ${response.status}`)
  }

  const hostData = await response.json()
  const host = hostData.value

  return new Response(
    JSON.stringify({ 
      success: true,
      host_status: {
        connection_state: host.connection_state,
        in_maintenance_mode: host.connection_state === 'MAINTENANCE',
        power_state: host.power_state,
        name: host.name
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}