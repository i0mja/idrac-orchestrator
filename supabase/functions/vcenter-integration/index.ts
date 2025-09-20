import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VCenterConfig {
  id: string
  name: string
  hostname: string
  username: string
  password: string
  port?: number
  ignore_ssl?: boolean
}

interface VCenterSession {
  token: string
  baseUrl: string
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

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const vcenterId = url.searchParams.get('vcenterId')

    switch (action) {
      case 'test-connection':
        return await testVCenterConnection(supabase, vcenterId!)
      
      case 'sync-clusters':
        return await syncVCenterClusters(supabase, vcenterId!)
      
      case 'sync-hosts':
        const clusterId = url.searchParams.get('clusterId')
        return await syncVCenterHosts(supabase, vcenterId!, clusterId)
      
      case 'enter-maintenance':
        const hostMoid = url.searchParams.get('hostMoid')
        const evacuateVMs = url.searchParams.get('evacuateVMs') === 'true'
        const timeoutMinutes = parseInt(url.searchParams.get('timeoutMinutes') || '60')
        return await enterMaintenanceMode(supabase, vcenterId!, hostMoid!, evacuateVMs, timeoutMinutes)
      
      case 'exit-maintenance':
        const exitHostMoid = url.searchParams.get('hostMoid')
        return await exitMaintenanceMode(supabase, vcenterId!, exitHostMoid!)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('vCenter integration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function testVCenterConnection(supabase: any, vcenterId: string) {
  console.log(`Testing vCenter connection for: ${vcenterId}`)

  const { data: vcenter, error } = await supabase
    .from('vcenters')
    .select('*')
    .eq('id', vcenterId)
    .single()

  if (error || !vcenter) {
    throw new Error(`vCenter configuration not found: ${error?.message}`)
  }

  try {
    const session = await createVCenterSession(vcenter)
    
    // Test basic API access by getting system info
    const response = await fetch(`${session.baseUrl}/rest/appliance/system/version`, {
      headers: { 'vmware-api-session-id': session.token }
    })

    if (!response.ok) {
      throw new Error(`vCenter API test failed: ${response.status}`)
    }

    const versionInfo = await response.json()
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'vCenter connection successful',
        version: versionInfo.value
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Connection failed: ${error.message}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function syncVCenterClusters(supabase: any, vcenterId: string) {
  console.log(`Syncing clusters for vCenter: ${vcenterId}`)

  const { data: vcenter } = await supabase
    .from('vcenters')
    .select('*')
    .eq('id', vcenterId)
    .single()

  if (!vcenter) {
    throw new Error('vCenter configuration not found')
  }

  const session = await createVCenterSession(vcenter)
  
  // Get clusters from vCenter
  const response = await fetch(`${session.baseUrl}/rest/vcenter/cluster`, {
    headers: { 'vmware-api-session-id': session.token }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch clusters: ${response.status}`)
  }

  const clustersData = await response.json()
  const clusters = clustersData.value || []

  console.log(`Found ${clusters.length} clusters in vCenter`)

  // Sync each cluster to database
  for (const cluster of clusters) {
    const { error } = await supabase
      .from('vcenter_clusters')
      .upsert({
        id: cluster.cluster,
        vcenter_id: vcenterId,
        name: cluster.name,
        drs_enabled: cluster.drs_enabled || false,
        ha_enabled: cluster.ha_enabled || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error(`Failed to sync cluster ${cluster.name}:`, error)
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Synced ${clusters.length} clusters`,
      clusters: clusters.map(c => ({ id: c.cluster, name: c.name }))
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function syncVCenterHosts(supabase: any, vcenterId: string, clusterId?: string | null) {
  console.log(`Syncing hosts for vCenter: ${vcenterId}, cluster: ${clusterId}`)

  const { data: vcenter } = await supabase
    .from('vcenters')
    .select('*')
    .eq('id', vcenterId)
    .single()

  if (!vcenter) {
    throw new Error('vCenter configuration not found')
  }

  const session = await createVCenterSession(vcenter)
  
  // Get hosts from vCenter
  let hostsUrl = `${session.baseUrl}/rest/vcenter/host`
  if (clusterId) {
    hostsUrl += `?filter.clusters=${clusterId}`
  }

  const response = await fetch(hostsUrl, {
    headers: { 'vmware-api-session-id': session.token }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch hosts: ${response.status}`)
  }

  const hostsData = await response.json()
  const hosts = hostsData.value || []

  console.log(`Found ${hosts.length} hosts in vCenter`)

  let syncedCount = 0

  // Sync each host to database
  for (const host of hosts) {
    try {
      // Get detailed host info
      const hostDetailResponse = await fetch(`${session.baseUrl}/rest/vcenter/host/${host.host}`, {
        headers: { 'vmware-api-session-id': session.token }
      })

      if (!hostDetailResponse.ok) {
        console.error(`Failed to get details for host ${host.name}`)
        continue
      }

      const hostDetail = await hostDetailResponse.json()
      const hostInfo = hostDetail.value

      // Update or create server record
      const { error } = await supabase
        .from('servers')
        .upsert({
          hostname: host.name,
          vcenter_id: vcenterId,
          host_type: 'vcenter_managed',
          status: host.connection_state === 'CONNECTED' ? 'online' : 'offline',
          cluster_name: clusterId ? (await getClusterName(supabase, clusterId)) : null,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'hostname',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`Failed to sync host ${host.name}:`, error)
      } else {
        syncedCount++
      }
    } catch (error) {
      console.error(`Error processing host ${host.name}:`, error)
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Synced ${syncedCount} of ${hosts.length} hosts`,
      hostCount: hosts.length,
      syncedCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function enterMaintenanceMode(supabase: any, vcenterId: string, hostMoid: string, evacuateVMs: boolean, timeoutMinutes: number) {
  console.log(`Entering maintenance mode for host: ${hostMoid}`)

  const { data: vcenter } = await supabase
    .from('vcenters')
    .select('*')
    .eq('id', vcenterId)
    .single()

  if (!vcenter) {
    throw new Error('vCenter configuration not found')
  }

  const session = await createVCenterSession(vcenter)
  
  const payload = {
    evacuate_all: evacuateVMs,
    timeout: Math.max(60, timeoutMinutes * 60)
  }

  const response = await fetch(`${session.baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=enter`, {
    method: 'POST',
    headers: {
      'vmware-api-session-id': session.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to enter maintenance mode: ${response.status} ${errorText}`)
  }

  const taskData = await response.json()
  const taskId = taskData.value

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Maintenance mode entry initiated',
      taskId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function exitMaintenanceMode(supabase: any, vcenterId: string, hostMoid: string) {
  console.log(`Exiting maintenance mode for host: ${hostMoid}`)

  const { data: vcenter } = await supabase
    .from('vcenters')
    .select('*')
    .eq('id', vcenterId)
    .single()

  if (!vcenter) {
    throw new Error('vCenter configuration not found')
  }

  const session = await createVCenterSession(vcenter)
  
  const response = await fetch(`${session.baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=exit`, {
    method: 'POST',
    headers: { 'vmware-api-session-id': session.token }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exit maintenance mode: ${response.status} ${errorText}`)
  }

  const taskData = await response.json()
  const taskId = taskData.value

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Maintenance mode exit initiated',
      taskId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createVCenterSession(vcenter: VCenterConfig): Promise<VCenterSession> {
  const port = vcenter.port || 443
  const baseUrl = `https://${vcenter.hostname}:${port}`
  
  const authHeader = `Basic ${btoa(`${vcenter.username}:${vcenter.password}`)}`
  
  const response = await fetch(`${baseUrl}/rest/com/vmware/cis/session`, {
    method: 'POST',
    headers: { 'Authorization': authHeader }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`vCenter authentication failed: ${response.status} ${errorText}`)
  }

  const sessionData = await response.json()
  return {
    token: sessionData.value,
    baseUrl
  }
}

async function getClusterName(supabase: any, clusterId: string): Promise<string | null> {
  const { data } = await supabase
    .from('vcenter_clusters')
    .select('name')
    .eq('id', clusterId)
    .single()
  
  return data?.name || null
}