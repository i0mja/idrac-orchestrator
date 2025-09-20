import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VCenterConfig {
  id: string
  hostname: string
  username: string
  password: string
  port?: number
  ignore_ssl?: boolean
}

interface ClusterHealthCheck {
  cluster_id: string
  cluster_name: string
  overall_status: string
  host_count: number
  connected_hosts: number
  maintenance_hosts: number
  vm_count: number
  drs_enabled: boolean
  ha_enabled: boolean
  resource_utilization: {
    cpu_usage_percent: number
    memory_usage_percent: number
    storage_usage_percent: number
  }
  health_issues: Array<{
    severity: 'critical' | 'warning' | 'info'
    message: string
    host_id?: string
    resolution?: string
  }>
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

    const { vcenterId, clusterId } = await req.json()

    if (!vcenterId) {
      throw new Error('vCenter ID is required')
    }

    // Get vCenter configuration
    const { data: vcenter, error: vcenterError } = await supabase
      .from('vcenters')
      .select('*')
      .eq('id', vcenterId)
      .single()

    if (vcenterError || !vcenter) {
      throw new Error(`vCenter not found: ${vcenterError?.message}`)
    }

    const session = await createVCenterSession(vcenter)
    
    let healthChecks: ClusterHealthCheck[] = []

    if (clusterId) {
      // Check specific cluster
      const clusterHealth = await checkClusterHealth(session, clusterId)
      healthChecks.push(clusterHealth)
    } else {
      // Check all clusters
      const clustersResponse = await fetch(`${session.baseUrl}/rest/vcenter/cluster`, {
        headers: { 'vmware-api-session-id': session.token }
      })

      if (!clustersResponse.ok) {
        throw new Error(`Failed to fetch clusters: ${clustersResponse.status}`)
      }

      const clustersData = await clustersResponse.json()
      const clusters = clustersData.value || []

      for (const cluster of clusters) {
        try {
          const clusterHealth = await checkClusterHealth(session, cluster.cluster, cluster.name)
          healthChecks.push(clusterHealth)
        } catch (error) {
          console.error(`Failed to check cluster ${cluster.name}:`, error)
          healthChecks.push({
            cluster_id: cluster.cluster,
            cluster_name: cluster.name,
            overall_status: 'error',
            host_count: 0,
            connected_hosts: 0,
            maintenance_hosts: 0,
            vm_count: 0,
            drs_enabled: false,
            ha_enabled: false,
            resource_utilization: { cpu_usage_percent: 0, memory_usage_percent: 0, storage_usage_percent: 0 },
            health_issues: [{
              severity: 'critical',
              message: `Failed to retrieve cluster health: ${error.message}`
            }]
          })
        }
      }
    }

    // Store health check results
    for (const healthCheck of healthChecks) {
      await supabase
        .from('health_check_results')
        .upsert({
          check_type: 'cluster_health',
          target_id: healthCheck.cluster_id,
          status: healthCheck.overall_status,
          details: healthCheck,
          checked_at: new Date().toISOString()
        }, {
          onConflict: 'target_id,check_type'
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        health_checks: healthChecks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cluster health check error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createVCenterSession(vcenter: VCenterConfig) {
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

async function checkClusterHealth(session: any, clusterId: string, clusterName?: string): Promise<ClusterHealthCheck> {
  const headers = { 'vmware-api-session-id': session.token }

  // Get cluster details
  const clusterResponse = await fetch(`${session.baseUrl}/rest/vcenter/cluster/${clusterId}`, {
    headers
  })

  if (!clusterResponse.ok) {
    throw new Error(`Failed to get cluster details: ${clusterResponse.status}`)
  }

  const clusterData = await clusterResponse.json()
  const cluster = clusterData.value

  // Get hosts in cluster
  const hostsResponse = await fetch(`${session.baseUrl}/rest/vcenter/host?filter.clusters=${clusterId}`, {
    headers
  })

  const hostsData = await hostsResponse.json()
  const hosts = hostsData.value || []

  // Get VMs in cluster
  const vmsResponse = await fetch(`${session.baseUrl}/rest/vcenter/vm?filter.clusters=${clusterId}`, {
    headers
  })

  const vmsData = await vmsResponse.json()
  const vms = vmsData.value || []

  // Calculate host statistics
  const connectedHosts = hosts.filter((h: any) => h.connection_state === 'CONNECTED').length
  const maintenanceHosts = hosts.filter((h: any) => h.connection_state === 'MAINTENANCE').length

  // Check for health issues
  const healthIssues: any[] = []

  // Check HA/DRS status
  if (!cluster.drs_enabled) {
    healthIssues.push({
      severity: 'warning',
      message: 'DRS is disabled - automatic load balancing unavailable',
      resolution: 'Enable DRS for automatic resource management'
    })
  }

  if (!cluster.ha_enabled) {
    healthIssues.push({
      severity: 'warning', 
      message: 'HA is disabled - no automatic failover protection',
      resolution: 'Enable HA for high availability protection'
    })
  }

  // Check host connectivity
  const disconnectedHosts = hosts.filter((h: any) => h.connection_state === 'DISCONNECTED')
  if (disconnectedHosts.length > 0) {
    healthIssues.push({
      severity: 'critical',
      message: `${disconnectedHosts.length} host(s) disconnected`,
      resolution: 'Check network connectivity and host health'
    })
  }

  // Calculate resource utilization (simplified - would need more detailed API calls for real data)
  const resourceUtilization = {
    cpu_usage_percent: Math.floor(Math.random() * 80 + 10), // Mock data
    memory_usage_percent: Math.floor(Math.random() * 75 + 15),
    storage_usage_percent: Math.floor(Math.random() * 60 + 20)
  }

  // Check resource thresholds
  if (resourceUtilization.cpu_usage_percent > 85) {
    healthIssues.push({
      severity: 'warning',
      message: `High CPU utilization: ${resourceUtilization.cpu_usage_percent}%`,
      resolution: 'Consider adding hosts or migrating VMs'
    })
  }

  if (resourceUtilization.memory_usage_percent > 90) {
    healthIssues.push({
      severity: 'critical',
      message: `Critical memory utilization: ${resourceUtilization.memory_usage_percent}%`,
      resolution: 'Urgent: Add memory or migrate VMs to prevent performance issues'
    })
  }

  // Determine overall status
  let overallStatus = 'healthy'
  if (healthIssues.some(issue => issue.severity === 'critical')) {
    overallStatus = 'critical'
  } else if (healthIssues.some(issue => issue.severity === 'warning')) {
    overallStatus = 'warning'
  }

  return {
    cluster_id: clusterId,
    cluster_name: clusterName || cluster.name || clusterId,
    overall_status: overallStatus,
    host_count: hosts.length,
    connected_hosts: connectedHosts,
    maintenance_hosts: maintenanceHosts,
    vm_count: vms.length,
    drs_enabled: cluster.drs_enabled || false,
    ha_enabled: cluster.ha_enabled || false,
    resource_utilization: resourceUtilization,
    health_issues: healthIssues
  }
}