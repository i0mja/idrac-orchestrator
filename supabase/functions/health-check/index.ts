import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckRequest {
  server_ids?: string[];
  ip_addresses?: string[];
  check_types?: ('connectivity' | 'redfish' | 'vcenter' | 'all')[];
}

interface ServerHealthStatus {
  server_id: string;
  hostname: string;
  ip_address: string;
  overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: {
    connectivity: HealthCheck;
    redfish: HealthCheck;
    vcenter?: HealthCheck;
  };
  last_checked: string;
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  message: string;
  response_time_ms?: number;
  details?: any;
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

    const { server_ids, ip_addresses, check_types = ['all'] }: HealthCheckRequest = await req.json()
    
    // Build query for servers
    let query = supabase.from('servers').select('*')
    
    if (server_ids && server_ids.length > 0) {
      query = query.in('id', server_ids)
    } else if (ip_addresses && ip_addresses.length > 0) {
      query = query.in('ip_address', ip_addresses)
    }

    const { data: servers, error: serversError } = await query

    if (serversError) {
      throw new Error(`Failed to fetch servers: ${serversError.message}`)
    }

    if (!servers || servers.length === 0) {
      throw new Error('No servers found for health check')
    }

    console.log(`Running health checks on ${servers.length} servers`)

    const healthStatuses: ServerHealthStatus[] = []
    const shouldCheckAll = check_types.includes('all')

    // Process servers in parallel with limited concurrency
    const concurrency = 5
    for (let i = 0; i < servers.length; i += concurrency) {
      const batch = servers.slice(i, i + concurrency)
      
      const batchResults = await Promise.all(
        batch.map(async (server) => {
          const healthStatus: ServerHealthStatus = {
            server_id: server.id,
            hostname: server.hostname,
            ip_address: server.ip_address,
            overall_status: 'unknown',
            checks: {
              connectivity: { status: 'unknown', message: 'Not checked' },
              redfish: { status: 'unknown', message: 'Not checked' }
            },
            last_checked: new Date().toISOString()
          }

          // Get credentials for the server
          const { data: credentials } = await supabase
            .rpc('get_credentials_for_ip', { target_ip: server.ip_address })

          if (!credentials || credentials.length === 0) {
            healthStatus.checks.connectivity = {
              status: 'fail',
              message: 'No credentials configured for this server'
            }
            healthStatus.overall_status = 'critical'
            return healthStatus
          }

          const cred = credentials[0]

          // Connectivity Check
          if (shouldCheckAll || check_types.includes('connectivity')) {
            const connectivityStart = Date.now()
            try {
              const response = await fetch(`https://${server.ip_address}:${cred.port || 443}/redfish/v1/`, {
                method: 'GET',
                headers: {
                  'Authorization': `Basic ${btoa(`${cred.username}:${cred.password_encrypted}`)}`
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
              })

              const responseTime = Date.now() - connectivityStart
              
              if (response.ok) {
                healthStatus.checks.connectivity = {
                  status: 'pass',
                  message: 'Server is reachable',
                  response_time_ms: responseTime
                }
              } else {
                healthStatus.checks.connectivity = {
                  status: 'warning',
                  message: `Server responded with status ${response.status}`,
                  response_time_ms: responseTime
                }
              }
            } catch (error) {
              const responseTime = Date.now() - connectivityStart
              healthStatus.checks.connectivity = {
                status: 'fail',
                message: `Connection failed: ${error.message}`,
                response_time_ms: responseTime
              }
            }
          }

          // Redfish Health Check
          if (shouldCheckAll || check_types.includes('redfish')) {
            try {
              const redfishResponse = await fetch(`https://${server.ip_address}:${cred.port || 443}/redfish/v1/Systems/System.Embedded.1`, {
                method: 'GET',
                headers: {
                  'Authorization': `Basic ${btoa(`${cred.username}:${cred.password_encrypted}`)}`
                },
                signal: AbortSignal.timeout(15000)
              })

              if (redfishResponse.ok) {
                const systemInfo = await redfishResponse.json()
                
                const powerState = systemInfo.PowerState
                const healthStatus_redfish = systemInfo.Status?.Health || 'Unknown'
                
                let status: 'pass' | 'warning' | 'fail' = 'pass'
                let message = `Power: ${powerState}, Health: ${healthStatus_redfish}`
                
                if (healthStatus_redfish === 'Critical') {
                  status = 'fail'
                } else if (healthStatus_redfish === 'Warning' || powerState !== 'On') {
                  status = 'warning'
                }
                
                healthStatus.checks.redfish = {
                  status: status,
                  message: message,
                  details: {
                    power_state: powerState,
                    health: healthStatus_redfish,
                    model: systemInfo.Model,
                    service_tag: systemInfo.SKU
                  }
                }
              } else {
                healthStatus.checks.redfish = {
                  status: 'fail',
                  message: `Redfish API returned status ${redfishResponse.status}`
                }
              }
            } catch (error) {
              healthStatus.checks.redfish = {
                status: 'fail',
                message: `Redfish check failed: ${error.message}`
              }
            }
          }

          // vCenter Check (if server is vCenter managed)
          if ((shouldCheckAll || check_types.includes('vcenter')) && server.vcenter_id) {
            try {
              // Get vCenter configuration
              const { data: vcenter } = await supabase
                .from('vcenters')
                .select('*')
                .eq('id', server.vcenter_id)
                .single()

              if (vcenter) {
                // Simulate vCenter API check (in real implementation, use vCenter REST API)
                healthStatus.checks.vcenter = {
                  status: 'pass',
                  message: `Managed by vCenter: ${vcenter.name}`,
                  details: {
                    vcenter_name: vcenter.name,
                    cluster: server.cluster_name
                  }
                }
              }
            } catch (error) {
              healthStatus.checks.vcenter = {
                status: 'warning',
                message: `vCenter check failed: ${error.message}`
              }
            }
          }

          // Calculate overall status
          const checkStatuses = Object.values(healthStatus.checks)
            .filter(check => check.status !== 'unknown')
            .map(check => check.status)

          if (checkStatuses.includes('fail')) {
            healthStatus.overall_status = 'critical'
          } else if (checkStatuses.includes('warning')) {
            healthStatus.overall_status = 'warning'
          } else if (checkStatuses.every(status => status === 'pass')) {
            healthStatus.overall_status = 'healthy'
          }

          return healthStatus
        })
      )

      healthStatuses.push(...batchResults)
    }

    // Log system event for failed health checks
    const failedServers = healthStatuses.filter(h => h.overall_status === 'critical')
    if (failedServers.length > 0) {
      await supabase
        .from('system_events')
        .insert({
          event_type: 'health_check_failed',
          severity: 'warning',
          title: `Health Check Failures Detected`,
          description: `${failedServers.length} servers failed health checks`,
          metadata: {
            failed_servers: failedServers.map(s => ({
              hostname: s.hostname,
              ip_address: s.ip_address,
              issues: Object.entries(s.checks).filter(([_, check]) => check.status === 'fail')
            }))
          }
        })
    }

    console.log(`Health check completed. ${healthStatuses.filter(h => h.overall_status === 'healthy').length}/${healthStatuses.length} servers healthy`)

    return new Response(JSON.stringify({
      success: true,
      total_servers: healthStatuses.length,
      healthy: healthStatuses.filter(h => h.overall_status === 'healthy').length,
      warning: healthStatuses.filter(h => h.overall_status === 'warning').length,
      critical: healthStatuses.filter(h => h.overall_status === 'critical').length,
      results: healthStatuses
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error running health check:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})