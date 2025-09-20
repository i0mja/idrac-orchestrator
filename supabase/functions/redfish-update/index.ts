import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RedfishUpdateRequest {
  serverId: string
  firmwarePackageId: string
  imageUri: string
  transferProtocol?: 'HTTP' | 'HTTPS' | 'FTP'
  applyTime?: 'Immediate' | 'OnReset'
  maintenanceWindowStart?: string
  maintenanceWindowDurationSeconds?: number
}

interface RedfishCredentials {
  host: string
  username: string
  password: string
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

    const { serverId, firmwarePackageId, imageUri, transferProtocol = 'HTTPS', applyTime = 'OnReset', maintenanceWindowStart, maintenanceWindowDurationSeconds } = await req.json() as RedfishUpdateRequest

    console.log(`Starting Redfish update for server ${serverId} with package ${firmwarePackageId}`)

    // Get server details and credentials
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single()

    if (serverError || !server) {
      throw new Error(`Server not found: ${serverError?.message}`)
    }

    // Get firmware package details
    const { data: firmwarePackage, error: packageError } = await supabase
      .from('firmware_packages')
      .select('*')
      .eq('id', firmwarePackageId)
      .single()

    if (packageError || !firmwarePackage) {
      throw new Error(`Firmware package not found: ${packageError?.message}`)
    }

    // Get credentials for the server from credential management
    const { data: credentialData, error: credError } = await supabase
      .rpc('get_credentials_for_ip', { target_ip: server.ip_address });

    if (credError || !credentialData || credentialData.length === 0) {
      throw new Error('No credentials found for server. Please configure server credentials.');
    }

    const credentials: RedfishCredentials = {
      host: server.ip_address,
      username: credentialData[0].username,
      password: credentialData[0].password_encrypted // This should be decrypted in production
    }

    // Create update job record
    const { data: updateJob, error: jobError } = await supabase
      .from('update_jobs')
      .insert({
        server_id: serverId,
        firmware_package_id: firmwarePackageId,
        status: 'running',
        progress: 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Failed to create update job: ${jobError.message}`)
    }

    // Execute Redfish SimpleUpdate
    const updateResult = await executeRedfishUpdate(credentials, {
      imageUri,
      transferProtocol,
      applyTime,
      maintenanceWindowStart,
      maintenanceWindowDurationSeconds
    })

    // Update job with task URI for polling
    await supabase
      .from('update_jobs')
      .update({
        logs: `Redfish update initiated. Task URI: ${updateResult.taskUri}`,
        progress: 10
      })
      .eq('id', updateJob.id)

    // Start background task monitoring
    pollRedfishTask(supabase, updateJob.id, credentials, updateResult.taskUri)

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: updateJob.id,
        taskUri: updateResult.taskUri,
        message: 'Redfish update initiated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Redfish update error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function executeRedfishUpdate(
  credentials: RedfishCredentials, 
  updateParams: {
    imageUri: string
    transferProtocol: string
    applyTime: string
    maintenanceWindowStart?: string
    maintenanceWindowDurationSeconds?: number
  }
): Promise<{ taskUri: string }> {
  const { host, username, password } = credentials
  const { imageUri, transferProtocol, applyTime, maintenanceWindowStart, maintenanceWindowDurationSeconds } = updateParams

  const authHeader = `Basic ${btoa(`${username}:${password}`)}`
  
  const payload: any = {
    ImageURI: imageUri,
    TransferProtocol: transferProtocol
  }

  if (applyTime) {
    payload['@Redfish.OperationApplyTime'] = applyTime
    if (applyTime !== 'Immediate' && maintenanceWindowStart) {
      payload['@Redfish.MaintenanceWindow'] = {
        MaintenanceWindowStartTime: maintenanceWindowStart,
        MaintenanceWindowDurationInSeconds: maintenanceWindowDurationSeconds ?? 3600
      }
    }
  }

  const response = await fetch(`https://${host}/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Redfish SimpleUpdate failed: ${response.status} ${errorText}`)
  }

  const taskUri = response.headers.get('Location')
  if (!taskUri) {
    throw new Error('No task URI returned from Redfish update')
  }

  return { taskUri }
}

async function pollRedfishTask(
  supabase: any,
  jobId: string,
  credentials: RedfishCredentials,
  taskUri: string
) {
  const { host, username, password } = credentials
  const authHeader = `Basic ${btoa(`${username}:${password}`)}`
  
  const maxAttempts = 120 // 2 hours max
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      await new Promise(resolve => setTimeout(resolve, 60000)) // Wait 1 minute
      attempts++

      const response = await fetch(`https://${host}${taskUri}`, {
        headers: { 'Authorization': authHeader }
      })

      if (!response.ok) {
        console.error(`Task polling failed: ${response.status}`)
        continue
      }

      const taskData = await response.json()
      const state = taskData.TaskState
      const percentComplete = taskData.PercentComplete || 0

      console.log(`Task ${taskUri} state: ${state}, progress: ${percentComplete}%`)

      // Update job progress
      await supabase
        .from('update_jobs')
        .update({
          progress: Math.max(10, percentComplete),
          logs: `Task state: ${state}. Progress: ${percentComplete}%`
        })
        .eq('id', jobId)

      if (state === 'Completed') {
        await supabase
          .from('update_jobs')
          .update({
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString(),
            logs: 'Redfish update completed successfully'
          })
          .eq('id', jobId)
        
        console.log(`Redfish update job ${jobId} completed successfully`)
        break
      }

      if (state === 'Exception' || state === 'Killed') {
        await supabase
          .from('update_jobs')
          .update({
            status: 'failed',
            error_message: `Task failed with state: ${state}`,
            logs: `Task failed: ${JSON.stringify(taskData)}`
          })
          .eq('id', jobId)
        
        console.error(`Redfish update job ${jobId} failed with state: ${state}`)
        break
      }

    } catch (error) {
      console.error(`Error polling task ${taskUri}:`, error)
      
      if (attempts >= maxAttempts) {
        await supabase
          .from('update_jobs')
          .update({
            status: 'failed',
            error_message: `Task polling timeout after ${maxAttempts} attempts`
          })
          .eq('id', jobId)
      }
    }
  }
}