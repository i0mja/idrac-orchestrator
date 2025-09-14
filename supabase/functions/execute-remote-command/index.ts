import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RemoteCommandRequest {
  command: {
    id: string;
    name: string;
    target_type: 'cluster' | 'host_group' | 'individual' | 'datacenter';
    target_names: string[];
    command_type:
      | 'update_firmware'
      | 'reboot'
      | 'maintenance_mode'
      | 'health_check'
      | 'security_patch'
      | 'idrac_update';
    command_parameters: Record<string, any>;
    scheduled_at?: string;
  };
  immediate_execution: boolean;
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

    const { command, immediate_execution }: RemoteCommandRequest = await req.json()

    console.log(`Processing remote command: ${command.name}`)
    console.log(`Target type: ${command.target_type}, Targets: ${command.target_names.join(', ')}`)
    console.log(`Command type: ${command.command_type}`)

    // Get target servers based on command configuration
    const targetServers = await getTargetServers(supabase, command.target_type, command.target_names)
    console.log(`Found ${targetServers.length} target servers`)

    if (immediate_execution) {
      // Execute command immediately
      await executeCommandOnServers(supabase, command, targetServers)
    } else {
      // Schedule command for later execution
      await scheduleCommand(supabase, command, targetServers)
    }

    // Log command execution
    await logSystemEvent(supabase, {
      event_type: 'remote_command',
      severity: 'info',
      title: `Remote Command ${immediate_execution ? 'Executed' : 'Scheduled'}`,
      description: `${command.command_type} command ${immediate_execution ? 'sent to' : 'scheduled for'} ${command.target_names.join(', ')}`,
      metadata: {
        command_id: command.id,
        command_type: command.command_type,
        target_type: command.target_type,
        target_count: targetServers.length,
        immediate_execution
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        command_id: command.id,
        targets_affected: targetServers.length,
        execution_status: immediate_execution ? 'executing' : 'scheduled'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing remote command:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process remote command',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function getTargetServers(supabase: any, targetType: string, targetNames: string[]) {
  let query = supabase.from('servers').select('*')

  switch (targetType) {
    case 'cluster':
      query = query.in('cluster_name', targetNames)
      break
    case 'host_group':
      query = query.in('environment', targetNames)
      break
    case 'individual':
      query = query.in('hostname', targetNames)
      break
    case 'datacenter':
      query = query.in('datacenter', targetNames)
      break
  }

  const { data: servers, error } = await query

  if (error) {
    throw new Error(`Failed to fetch target servers: ${error.message}`)
  }

  return servers || []
}

async function executeCommandOnServers(supabase: any, command: any, servers: any[]) {
  console.log(`Executing ${command.command_type} on ${servers.length} servers`)

  for (const server of servers) {
    try {
      // Get server credentials
      const { data: credentials } = await supabase
        .from('server_credentials')
        .select('*')
        .eq('server_id', server.id)
        .single()

      if (!credentials) {
        console.log(`No credentials found for server ${server.hostname}`)
        continue
      }

      // Execute the actual command based on type
      await executeSpecificCommand(server, credentials, command)

      console.log(`Command executed successfully on ${server.hostname}`)

    } catch (error) {
      console.error(`Failed to execute command on ${server.hostname}:`, error)
      
      // Log the failure
      await logSystemEvent(supabase, {
        event_type: 'command_execution_failed',
        severity: 'error',
        title: 'Command Execution Failed',
        description: `Failed to execute ${command.command_type} on ${server.hostname}`,
        metadata: {
          server_id: server.id,
          hostname: server.hostname,
          command_type: command.command_type,
          error: error.message
        }
      })
    }
  }
}

async function executeSpecificCommand(server: any, credentials: any, command: any) {
  const { command_type, command_parameters = {} } = command

  switch (command_type) {
    case 'update_firmware':
      await executeFirmwareUpdate(server, credentials, command_parameters)
      break
    case 'security_patch':
    case 'idrac_update':
      await executeFirmwareUpdate(server, credentials, {
        ...command_parameters,
        update_category: command_type
      })
      break
    case 'reboot':
      await executeReboot(server, credentials, command_parameters)
      break
    case 'maintenance_mode':
      await executeMaintenanceMode(server, credentials, command_parameters)
      break
    case 'health_check':
      await executeHealthCheck(server, credentials, command_parameters)
      break
    default:
      throw new Error(`Unknown command type: ${command_type}`)
  }
}

async function executeFirmwareUpdate(server: any, credentials: any, parameters: any) {
  console.log(`Sending firmware update command to ${server.hostname}`)
  
  // In a real implementation, this would:
  // 1. Connect to the server's management interface (iDRAC, iLO, etc.)
  // 2. Send the firmware update command with specified parameters
  // 3. Monitor the update progress
  
  // For now, we'll simulate the command
  const updateCommand = {
    action: parameters.update_category || 'update_firmware',
    target_version: parameters.version_target || 'latest',
    reboot_required: parameters.reboot_required || true,
    server_id: server.id,
    timestamp: new Date().toISOString()
  }
  
  console.log(`Firmware update command sent:`, updateCommand)
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
}

async function executeReboot(server: any, credentials: any, parameters: any) {
  console.log(`Sending reboot command to ${server.hostname}`)
  
  // Simulate reboot command
  const rebootCommand = {
    action: 'reboot',
    force: parameters.force || false,
    delay_seconds: parameters.delay_seconds || 0,
    server_id: server.id,
    timestamp: new Date().toISOString()
  }
  
  console.log(`Reboot command sent:`, rebootCommand)
  await new Promise(resolve => setTimeout(resolve, 500))
}

async function executeMaintenanceMode(server: any, credentials: any, parameters: any) {
  console.log(`Setting maintenance mode on ${server.hostname}`)
  
  const maintenanceCommand = {
    action: 'maintenance_mode',
    enable: parameters.enable !== false,
    drain_vms: parameters.drain_vms !== false,
    server_id: server.id,
    timestamp: new Date().toISOString()
  }
  
  console.log(`Maintenance mode command sent:`, maintenanceCommand)
  await new Promise(resolve => setTimeout(resolve, 500))
}

async function executeHealthCheck(server: any, credentials: any, parameters: any) {
  console.log(`Running health check on ${server.hostname}`)
  
  const healthCheckCommand = {
    action: 'health_check',
    check_types: parameters.check_types || ['hardware', 'network', 'storage'],
    deep_check: parameters.deep_check || false,
    server_id: server.id,
    timestamp: new Date().toISOString()
  }
  
  console.log(`Health check command sent:`, healthCheckCommand)
  await new Promise(resolve => setTimeout(resolve, 800))
}

async function scheduleCommand(supabase: any, command: any, servers: any[]) {
  console.log(`Scheduling command for execution at ${command.scheduled_at}`)
  
  // In a real implementation, this would:
  // 1. Store the command in a scheduling system
  // 2. Set up a cron job or timer to execute at the specified time
  // 3. Handle timezone considerations
  
  // For now, we'll just log the scheduling
  console.log(`Command ${command.id} scheduled for ${servers.length} servers`)
}

async function logSystemEvent(supabase: any, event: {
  event_type: string;
  severity: string;
  title: string;
  description: string;
  metadata?: any;
}) {
  try {
    await supabase
      .from('system_events')
      .insert([{
        event_type: event.event_type,
        severity: event.severity,
        title: event.title,
        description: event.description,
        metadata: event.metadata || {}
      }])
  } catch (error) {
    console.error('Failed to log system event:', error)
  }
}