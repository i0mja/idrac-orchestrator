import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RacadmCommandRequest {
  serverId: string
  command: string
  method: 'ssh' | 'wsman'
  timeout?: number
}

interface ServerCredentials {
  hostname: string
  ip_address: string
  username: string
  password: string
  port?: number
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

    const { serverId, command, method = 'ssh', timeout = 300 } = await req.json() as RacadmCommandRequest

    console.log(`Executing RACADM command on server ${serverId}: ${command}`)

    // Get server details
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single()

    if (serverError || !server) {
      throw new Error(`Server not found: ${serverError?.message}`)
    }

    // Get credentials (simplified for demo - should use proper credential management)
    const credentials: ServerCredentials = {
      hostname: server.hostname,
      ip_address: server.ip_address,
      username: 'root', // Should come from credential management
      password: 'calvin', // Should come from encrypted credential management
      port: method === 'ssh' ? 22 : 443
    }

    // Create command execution job
    const { data: job, error: jobError } = await supabase
      .from('update_jobs')
      .insert({
        server_id: serverId,
        firmware_package_id: null, // Not firmware related
        status: 'running',
        progress: 0,
        started_at: new Date().toISOString(),
        logs: `Executing RACADM command: ${command}`
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`)
    }

    // Execute command based on method
    let result
    if (method === 'ssh') {
      result = await executeRacadmSSH(credentials, command, timeout)
    } else {
      result = await executeRacadmWSMAN(credentials, command, timeout)
    }

    // Update job with results
    await supabase
      .from('update_jobs')
      .update({
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        completed_at: new Date().toISOString(),
        logs: result.output,
        error_message: result.success ? null : result.error
      })
      .eq('id', job.id)

    return new Response(
      JSON.stringify({
        success: result.success,
        jobId: job.id,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('RACADM command error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function executeRacadmSSH(
  credentials: ServerCredentials, 
  command: string, 
  timeout: number
): Promise<{ success: boolean; output: string; error?: string; executionTime: number }> {
  const startTime = Date.now()
  
  try {
    // For demo purposes, simulate SSH execution
    // In production, this would use a proper SSH client
    console.log(`SSH RACADM command to ${credentials.ip_address}: ${command}`)
    
    // Simulate command execution delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulate different command responses
    let output = ''
    let success = true

    if (command.includes('getversion')) {
      output = `[Key=iDRAC.Embedded.1#iDRAC.Embedded.1]
Object is "iDRAC.Embedded.1"
RAC Firmware Version = 6.10.30.00
RAC Firmware Build = 25
Firmware Version = 6.10.30.00`
    } else if (command.includes('getsysinfo')) {
      output = `System Information:
System Model = PowerEdge R750
Service Tag = ${credentials.hostname.replace('ESXi-', '')}001
System BIOS Version = 2.18.0
Memory = 128 GB
CPU = Intel Xeon Gold 6338 CPU @ 2.00GHz`
    } else if (command.includes('fwupdate')) {
      output = `Firmware update initiated
Job ID = JID_123456789
Status = Running
Completion Time = 2024-01-01T12:00:00.000Z`
    } else {
      output = `Command executed successfully: ${command}`
    }

    return {
      success,
      output,
      executionTime: Date.now() - startTime
    }

  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.message,
      executionTime: Date.now() - startTime
    }
  }
}

async function executeRacadmWSMAN(
  credentials: ServerCredentials, 
  command: string, 
  timeout: number
): Promise<{ success: boolean; output: string; error?: string; executionTime: number }> {
  const startTime = Date.now()
  
  try {
    // For demo purposes, simulate WS-MAN execution via HTTPS
    console.log(`WS-MAN RACADM command to ${credentials.ip_address}: ${command}`)
    
    const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
    
    // Simulate WS-MAN request (would be actual SOAP envelope in production)
    const wsmanPayload = `
<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd">
  <s:Header>
    <wsa:Action s:mustUnderstand="true">http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/DCIM_LCService/GetRemoteServicesAPIStatus</wsa:Action>
  </s:Header>
  <s:Body>
    <p:GetRemoteServicesAPIStatus_INPUT xmlns:p="http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/DCIM_LCService">
      <p:Command>${command}</p:Command>
    </p:GetRemoteServicesAPIStatus_INPUT>
  </s:Body>
</s:Envelope>`

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Simulate WS-MAN response
    const output = `WS-MAN Response:
Command: ${command}
Status: Success
ReturnValue: 0
Message: Command completed successfully`

    return {
      success: true,
      output,
      executionTime: Date.now() - startTime
    }

  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.message,
      executionTime: Date.now() - startTime
    }
  }
}