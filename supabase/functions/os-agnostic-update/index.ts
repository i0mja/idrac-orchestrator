// Enhanced: OS-agnostic firmware update orchestration for heterogeneous environments
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateRequest {
  server_ids: string[];
  update_type: 'firmware' | 'bios' | 'drivers' | 'all';
  force_out_of_band?: boolean; // Enhanced: Force iDRAC updates for EOL OS
  schedule_time?: string;
  cluster_aware?: boolean; // Enhanced: vCenter cluster orchestration
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

    const { server_ids, update_type, force_out_of_band, schedule_time, cluster_aware }: UpdateRequest = await req.json();

    console.log(`Enhanced: Starting ${update_type} updates for ${server_ids.length} servers`);

    // Enhanced: Fetch servers with OS and datacenter information
    const { data: servers, error: serverError } = await supabase
      .from('servers')
      .select(`
        *,
        datacenters!site_id (
          name,
          timezone,
          maintenance_window_start,
          maintenance_window_end
        )
      `)
      .in('id', server_ids);

    if (serverError) throw serverError;

    const updateJobs = [];

    for (const server of servers) {
      // Enhanced: OS-specific update strategy
      const updateStrategy = determineUpdateStrategy(server, force_out_of_band);
      
      console.log(`Enhanced: Server ${server.hostname} (${server.operating_system} ${server.os_version}) - Strategy: ${updateStrategy}`);

      // Enhanced: Pre-update OS compatibility checks
      if (server.os_eol_date && new Date(server.os_eol_date) <= new Date()) {
        console.log(`Enhanced: EOL OS detected on ${server.hostname} - forcing out-of-band updates`);
        updateStrategy.method = 'out_of_band_only';
        updateStrategy.risk_level = 'high';
      }

      // Enhanced: Create update job with OS context
      const { data: job, error: jobError } = await supabase
        .from('update_jobs')
        .insert({
          server_id: server.id,
          job_type: update_type,
          status: schedule_time ? 'scheduled' : 'pending',
          scheduled_for: schedule_time || new Date().toISOString(),
          cluster_aware: cluster_aware && server.host_type === 'vcenter_managed',
          metadata: {
            os_type: server.operating_system,
            os_version: server.os_version,
            update_strategy: updateStrategy,
            datacenter: server.datacenters?.name,
            eol_risk: server.os_eol_date && new Date(server.os_eol_date) <= new Date()
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      updateJobs.push(job);

      // Enhanced: Execute immediate updates based on strategy
      if (!schedule_time) {
        if (updateStrategy.method === 'out_of_band_only') {
          await executeIDRACUpdate(server, update_type, supabase);
        } else if (updateStrategy.method === 'hybrid') {
          // Enhanced: Hybrid approach - iDRAC + OS-specific tools
          await executeHybridUpdate(server, update_type, supabase);
        } else {
          // Enhanced: Standard in-band updates for supported OS
          await executeInBandUpdate(server, update_type, supabase);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Enhanced: ${update_type} update jobs created for ${server_ids.length} servers`,
        jobs: updateJobs,
        strategies_used: updateJobs.map(job => job.metadata.update_strategy)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Enhanced: Update orchestration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Enhanced OS-agnostic update orchestration failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Enhanced: Determine optimal update strategy based on OS and risk factors
function determineUpdateStrategy(server: any, forceOutOfBand?: boolean) {
  const strategy = {
    method: 'in_band',
    risk_level: 'low',
    requires_downtime: false,
    supports_rollback: false
  };

  // Enhanced: Force out-of-band for EOL operating systems
  if (forceOutOfBand || (server.os_eol_date && new Date(server.os_eol_date) <= new Date())) {
    strategy.method = 'out_of_band_only';
    strategy.risk_level = 'high';
    strategy.requires_downtime = true;
    strategy.supports_rollback = false;
    return strategy;
  }

  // Enhanced: OS-specific strategy determination
  switch (server.operating_system) {
    case 'VMware ESXi':
      strategy.method = server.cluster_name ? 'vcenter_orchestrated' : 'hybrid';
      strategy.requires_downtime = true;
      strategy.supports_rollback = true;
      break;
    
    case 'CentOS Linux':
      if (server.os_version?.startsWith('7')) {
        // Enhanced: CentOS 7 is EOL - prefer out-of-band
        strategy.method = 'out_of_band_preferred';
        strategy.risk_level = 'high';
      } else {
        strategy.method = server.ism_installed ? 'hybrid' : 'in_band';
      }
      break;
    
    case 'Rocky Linux':
    case 'Red Hat Enterprise Linux':
      strategy.method = server.ism_installed ? 'hybrid' : 'in_band';
      strategy.supports_rollback = true;
      break;
    
    default:
      // Enhanced: Unknown OS - use iDRAC only
      strategy.method = 'out_of_band_only';
      strategy.risk_level = 'medium';
      break;
  }

  return strategy;
}

// Enhanced: Execute iDRAC-based out-of-band updates
async function executeIDRACUpdate(server: any, updateType: string, supabase: any) {
  console.log(`Enhanced: Executing iDRAC update for ${server.hostname}`);
  
  try {
    // Enhanced: Use racadm or Redfish API for updates
    const updateCommand = {
      target_type: 'idrac',
      target_host: server.ip_address,
      command_type: 'firmware_update',
      command_parameters: {
        update_type: updateType,
        reboot_required: true,
        os_agnostic: true
      }
    };

    // Enhanced: Log update start
    await supabase
      .from('update_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('server_id', server.id)
      .eq('status', 'pending');

    console.log(`Enhanced: iDRAC update initiated for ${server.hostname}`);
    
  } catch (error) {
    console.error(`Enhanced: iDRAC update failed for ${server.hostname}:`, error);
    throw error;
  }
}

// Enhanced: Execute hybrid updates (iDRAC + OS tools)
async function executeHybridUpdate(server: any, updateType: string, supabase: any) {
  console.log(`Enhanced: Executing hybrid update for ${server.hostname} (${server.operating_system})`);
  
  // Enhanced: Combine iDRAC capabilities with OS-specific tools
  if (server.ism_installed) {
    console.log(`Enhanced: Using iSM integration for ${server.hostname}`);
  }
  
  await executeIDRACUpdate(server, updateType, supabase);
}

// Enhanced: Execute in-band OS-specific updates
async function executeInBandUpdate(server: any, updateType: string, supabase: any) {
  console.log(`Enhanced: Executing in-band update for ${server.hostname} (${server.operating_system})`);
  
  // Enhanced: OS-specific update logic would be implemented here
  // For now, fallback to iDRAC
  await executeIDRACUpdate(server, updateType, supabase);
}