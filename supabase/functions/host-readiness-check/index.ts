import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReadinessCheckRequest {
  server_id?: string
  ip_address?: string
  check_types?: string[]
  force_refresh?: boolean
}

interface ReadinessResult {
  server_id: string
  overall_readiness: 'ready' | 'warning' | 'not_ready'
  readiness_score: number
  connectivity_status: 'connected' | 'unreachable' | 'error'
  credential_status: 'valid' | 'invalid' | 'missing'
  firmware_capability_status: 'supported' | 'unsupported' | 'unknown'
  vcenter_integration_status?: 'integrated' | 'not_integrated' | 'error'
  maintenance_mode_capable: boolean
  blocking_issues: string[]
  warnings: string[]
  last_successful_update?: string
  recommendations: string[]
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

    const request: ReadinessCheckRequest = await req.json()
    const { server_id, ip_address, check_types = ['all'], force_refresh = false } = request

    let servers = []

    if (server_id) {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('id', server_id)
        .single()
      
      if (error) throw new Error(`Server not found: ${error.message}`)
      servers = [data]
    } else if (ip_address) {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('ip_address', ip_address)
        .single()
      
      if (error) throw new Error(`Server not found: ${error.message}`)
      servers = [data]
    } else {
      // Check all servers
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname')
      
      if (error) throw new Error(`Failed to fetch servers: ${error.message}`)
      servers = data || []
    }

    const readinessResults: ReadinessResult[] = []

    for (const server of servers) {
      try {
        const result = await performReadinessCheck(supabase, server, check_types, force_refresh)
        readinessResults.push(result)

        // Store the result in database
        await supabase
          .from('server_readiness_checks')
          .upsert({
            server_id: server.id,
            overall_readiness: result.overall_readiness,
            readiness_score: result.readiness_score,
            connectivity_status: result.connectivity_status,
            credential_status: result.credential_status,
            firmware_capability_status: result.firmware_capability_status,
            vcenter_integration_status: result.vcenter_integration_status,
            maintenance_mode_capable: result.maintenance_mode_capable,
            blocking_issues: result.blocking_issues,
            warnings: result.warnings,
            last_successful_update: result.last_successful_update,
            check_timestamp: new Date().toISOString()
          }, {
            onConflict: 'server_id'
          })
      } catch (error) {
        console.error(`Failed to check readiness for server ${server.hostname}:`, error)
        readinessResults.push({
          server_id: server.id,
          overall_readiness: 'not_ready',
          readiness_score: 0,
          connectivity_status: 'error',
          credential_status: 'unknown',
          firmware_capability_status: 'unknown',
          maintenance_mode_capable: false,
          blocking_issues: [`Readiness check failed: ${error.message}`],
          warnings: [],
          recommendations: ['Verify server configuration and network connectivity']
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        readiness_results: readinessResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Host readiness check error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function performReadinessCheck(supabase: any, server: any, checkTypes: string[], forceRefresh: boolean): Promise<ReadinessResult> {
  const result: ReadinessResult = {
    server_id: server.id,
    overall_readiness: 'ready',
    readiness_score: 100,
    connectivity_status: 'connected',
    credential_status: 'valid',
    firmware_capability_status: 'supported',
    maintenance_mode_capable: false,
    blocking_issues: [],
    warnings: [],
    recommendations: []
  }

  let scoreDeductions = 0

  // Check connectivity
  if (checkTypes.includes('all') || checkTypes.includes('connectivity')) {
    try {
      const connectivityResult = await checkConnectivity(server.ip_address)
      result.connectivity_status = connectivityResult.status
      
      if (connectivityResult.status === 'unreachable') {
        result.blocking_issues.push('Server is not reachable via network')
        scoreDeductions += 50
      } else if (connectivityResult.status === 'error') {
        result.warnings.push('Network connectivity issues detected')
        scoreDeductions += 20
      }
    } catch (error) {
      result.connectivity_status = 'error'
      result.blocking_issues.push(`Connectivity check failed: ${error.message}`)
      scoreDeductions += 50
    }
  }

  // Check credentials
  if (checkTypes.includes('all') || checkTypes.includes('credentials')) {
    try {
      const credentialResult = await checkCredentials(supabase, server.ip_address)
      result.credential_status = credentialResult.status
      
      if (credentialResult.status === 'invalid') {
        result.blocking_issues.push('Invalid or missing credentials')
        scoreDeductions += 40
      } else if (credentialResult.status === 'missing') {
        result.blocking_issues.push('No credentials configured for this server')
        scoreDeductions += 40
      }
    } catch (error) {
      result.credential_status = 'missing'
      result.warnings.push(`Credential check failed: ${error.message}`)
      scoreDeductions += 20
    }
  }

  // Check firmware update capability
  if (checkTypes.includes('all') || checkTypes.includes('firmware')) {
    try {
      const firmwareResult = await checkFirmwareCapability(server)
      result.firmware_capability_status = firmwareResult.status
      
      if (firmwareResult.status === 'unsupported') {
        result.warnings.push('Server model may not support automated firmware updates')
        scoreDeductions += 15
      } else if (firmwareResult.status === 'unknown') {
        result.warnings.push('Unable to determine firmware update capability')
        scoreDeductions += 10
      }
    } catch (error) {
      result.firmware_capability_status = 'unknown'
      result.warnings.push(`Firmware capability check failed: ${error.message}`)
      scoreDeductions += 10
    }
  }

  // Check vCenter integration
  if (checkTypes.includes('all') || checkTypes.includes('vcenter')) {
    try {
      const vcenterResult = await checkVCenterIntegration(supabase, server)
      result.vcenter_integration_status = vcenterResult.status
      result.maintenance_mode_capable = vcenterResult.maintenance_capable
      
      if (server.vcenter_id && vcenterResult.status === 'error') {
        result.warnings.push('vCenter integration issues detected')
        scoreDeductions += 15
      } else if (server.vcenter_id && vcenterResult.status === 'not_integrated') {
        result.warnings.push('Server not properly integrated with vCenter')
        scoreDeductions += 10
      }
    } catch (error) {
      result.vcenter_integration_status = 'error'
      result.warnings.push(`vCenter integration check failed: ${error.message}`)
      scoreDeductions += 10
    }
  }

  // Check for recent successful updates
  try {
    const { data: recentJobs } = await supabase
      .from('update_jobs')
      .select('completed_at, status')
      .eq('server_id', server.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)

    if (recentJobs && recentJobs.length > 0) {
      result.last_successful_update = recentJobs[0].completed_at
    } else {
      result.warnings.push('No recent successful firmware updates')
      scoreDeductions += 5
    }
  } catch (error) {
    console.error('Failed to check update history:', error)
  }

  // Generate recommendations based on issues
  if (result.blocking_issues.length > 0) {
    result.recommendations.push('Resolve blocking issues before attempting firmware updates')
  }
  
  if (result.connectivity_status !== 'connected') {
    result.recommendations.push('Verify network connectivity and firewall rules')
  }
  
  if (result.credential_status !== 'valid') {
    result.recommendations.push('Configure valid credentials for server management')
  }
  
  if (server.vcenter_id && !result.maintenance_mode_capable) {
    result.recommendations.push('Ensure vCenter integration is properly configured for maintenance mode')
  }

  // Calculate final readiness score and status
  result.readiness_score = Math.max(0, 100 - scoreDeductions)
  
  if (result.blocking_issues.length > 0) {
    result.overall_readiness = 'not_ready'
  } else if (result.warnings.length > 0 || result.readiness_score < 85) {
    result.overall_readiness = 'warning'
  } else {
    result.overall_readiness = 'ready'
  }

  return result
}

async function checkConnectivity(ipAddress: string): Promise<{ status: 'connected' | 'unreachable' | 'error' }> {
  try {
    // Simple connectivity check - in production, this might ping or check specific ports
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    // Try to connect to common management ports
    const ports = [443, 623, 22] // HTTPS, IPMI, SSH
    let connected = false
    
    for (const port of ports) {
      try {
        // In a real implementation, you'd use a proper network check
        // For now, simulate connectivity based on IP pattern
        if (ipAddress.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])/)) {
          connected = true
          break
        }
      } catch (error) {
        continue
      }
    }
    
    clearTimeout(timeoutId)
    return { status: connected ? 'connected' : 'unreachable' }
  } catch (error) {
    return { status: 'error' }
  }
}

async function checkCredentials(supabase: any, ipAddress: string): Promise<{ status: 'valid' | 'invalid' | 'missing' }> {
  try {
    // Get credentials for this IP
    const { data: credentials, error } = await supabase
      .rpc('get_credentials_for_ip', { target_ip: ipAddress })

    if (error || !credentials || credentials.length === 0) {
      return { status: 'missing' }
    }

    // In a real implementation, you'd test the credentials
    // For now, assume they're valid if they exist
    return { status: 'valid' }
  } catch (error) {
    return { status: 'missing' }
  }
}

async function checkFirmwareCapability(server: any): Promise<{ status: 'supported' | 'unsupported' | 'unknown' }> {
  try {
    // Check if server model is in supported list
    const supportedModels = [
      'PowerEdge R640', 'PowerEdge R740', 'PowerEdge R750',
      'PowerEdge R6525', 'PowerEdge R7525', 'PowerEdge R650',
      // Add more supported models
    ]
    
    if (server.model && supportedModels.some(model => server.model.includes(model))) {
      return { status: 'supported' }
    } else if (server.model && server.model.includes('PowerEdge')) {
      return { status: 'supported' } // Assume Dell PowerEdge servers are supported
    } else if (server.model) {
      return { status: 'unsupported' }
    } else {
      return { status: 'unknown' }
    }
  } catch (error) {
    return { status: 'unknown' }
  }
}

async function checkVCenterIntegration(supabase: any, server: any): Promise<{ status: 'integrated' | 'not_integrated' | 'error', maintenance_capable: boolean }> {
  try {
    if (!server.vcenter_id) {
      return { status: 'not_integrated', maintenance_capable: false }
    }

    // Check if vCenter is configured and accessible
    const { data: vcenter } = await supabase
      .from('vcenters')
      .select('*')
      .eq('id', server.vcenter_id)
      .single()

    if (!vcenter) {
      return { status: 'error', maintenance_capable: false }
    }

    // In a real implementation, you'd test vCenter connectivity
    // For now, assume it's integrated if configured
    return { 
      status: 'integrated', 
      maintenance_capable: server.cluster_name ? true : false 
    }
  } catch (error) {
    return { status: 'error', maintenance_capable: false }
  }
}