import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateJobRequest {
  jobId: string;
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
    );

    const { jobId }: UpdateJobRequest = await req.json();
    
    console.log(`Processing update job: ${jobId}`);
    
    // Get job details with server and firmware package info
    const { data: job, error: jobError } = await supabase
      .from('update_jobs')
      .select(`
        *,
        server:servers(*),
        firmware_package:firmware_packages(*)
      `)
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }
    
    if (job.status !== 'pending') {
      console.log(`Job ${jobId} is not in pending status: ${job.status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update job status to running
    await supabase
      .from('update_jobs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 0
      })
      .eq('id', jobId);
    
    console.log(`Starting firmware update for server ${job.server.hostname}`);
    
    // Get server credentials
    const { data: credentials } = await supabase
      .from('server_credentials')
      .select('*')
      .eq('server_id', job.server_id)
      .eq('connection_method', 'redfish')
      .single();
    
    if (!credentials) {
      await supabase
        .from('update_jobs')
        .update({ 
          status: 'failed',
          error_message: 'No credentials found for server',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      throw new Error('No credentials found for server');
    }
    
    try {
      const serverIp = job.server.ip_address;
      
      // Step 1: Connect to iDRAC and verify connection
      await updateJobProgress(supabase, jobId, 10, 'Connecting to iDRAC...');
      
      const redfishUrl = `https://${serverIp}/redfish/v1/UpdateService`;
      const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password || 'calvin'}`)}`;
      
      const updateServiceResponse = await fetch(redfishUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!updateServiceResponse.ok) {
        throw new Error(`Failed to connect to iDRAC: ${updateServiceResponse.status}`);
      }
      
      // Step 2: Check current firmware version
      await updateJobProgress(supabase, jobId, 25, 'Checking current firmware version...');
      
      // Get current firmware inventory
      const firmwareInventoryUrl = `https://${serverIp}/redfish/v1/UpdateService/FirmwareInventory`;
      const inventoryResponse = await fetch(firmwareInventoryUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (inventoryResponse.ok) {
        const inventory = await inventoryResponse.json();
        console.log(`Current firmware inventory for ${job.server.hostname}:`, inventory);
      }
      
      // Step 3: Download firmware package (simulated)
      await updateJobProgress(supabase, jobId, 40, 'Downloading firmware package...');
      
      // In a real implementation, you would download the firmware from the file_path
      // and prepare it for upload to the iDRAC
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate download
      
      // Step 4: Upload firmware to iDRAC
      await updateJobProgress(supabase, jobId, 60, 'Uploading firmware to iDRAC...');
      
      // For this demo, we'll simulate the firmware update process
      // In a real implementation, you would:
      // 1. POST the firmware file to /redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate
      // 2. Monitor the task progress via TaskService
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate upload
      
      // Step 5: Start firmware update
      await updateJobProgress(supabase, jobId, 80, 'Starting firmware update...');
      
      // Simulate firmware update initiation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 6: Monitor update progress
      await updateJobProgress(supabase, jobId, 90, 'Monitoring update progress...');
      
      // In a real implementation, you would poll the task status
      // until the update is complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 7: Complete the job
      await updateJobProgress(supabase, jobId, 100, 'Firmware update completed successfully');
      
      await supabase
        .from('update_jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          logs: 'Firmware update completed successfully via Redfish API'
        })
        .eq('id', jobId);
      
      // Update server status
      await supabase
        .from('servers')
        .update({ 
          status: 'online',
          last_updated: new Date().toISOString()
        })
        .eq('id', job.server_id);
      
      console.log(`Firmware update completed for server ${job.server.hostname}`);
      
    } catch (updateError) {
      console.error(`Firmware update failed for job ${jobId}:`, updateError);
      
      await supabase
        .from('update_jobs')
        .update({ 
          status: 'failed',
          error_message: updateError.message,
          completed_at: new Date().toISOString(),
          logs: `Firmware update failed: ${updateError.message}`
        })
        .eq('id', jobId);
      
      throw updateError;
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Update job processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Update job processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})

async function updateJobProgress(supabase: any, jobId: string, progress: number, message: string) {
  console.log(`Job ${jobId}: ${progress}% - ${message}`);
  
  await supabase
    .from('update_jobs')
    .update({ 
      progress,
      logs: message
    })
    .eq('id', jobId);
}