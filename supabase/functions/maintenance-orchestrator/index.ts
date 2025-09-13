import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaintenanceWindow {
  id: string;
  name: string;
  datacenter_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  max_concurrent_updates: number;
  status: string;
  datacenters: {
    name: string;
    location: string;
  };
}

interface Server {
  id: string;
  hostname: string;
  ip_address: string;
  datacenter: string;
  status: string;
  vcenter_id?: string;
  cluster_name?: string;
}

class MaintenanceOrchestrator {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async executeMaintenanceWindow(windowId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Starting maintenance orchestration for window: ${windowId}`);

      // Get maintenance window details
      const { data: window, error: windowError } = await this.supabase
        .from('maintenance_windows')
        .select(`
          *,
          datacenters (name, location)
        `)
        .eq('id', windowId)
        .single();

      if (windowError || !window) {
        throw new Error(`Failed to fetch maintenance window: ${windowError?.message}`);
      }

      // Update window status to active
      await this.updateWindowStatus(windowId, 'active');

      // Get servers in the datacenter
      const servers = await this.getDatacenterServers(window.datacenter_id);
      console.log(`Found ${servers.length} servers in datacenter ${window.datacenters.name}`);

      if (servers.length === 0) {
        await this.updateWindowStatus(windowId, 'completed');
        return { success: true, message: 'No servers found in datacenter' };
      }

      // Create system event
      await this.createSystemEvent(
        'maintenance_started',
        `Maintenance Window Started: ${window.name}`,
        `Starting maintenance for ${servers.length} servers in ${window.datacenters.name}`,
        'info',
        { window_id: windowId, server_count: servers.length }
      );

      // Execute maintenance in batches
      const result = await this.executeBatchedMaintenance(window, servers);

      // Update final status
      const finalStatus = result.success ? 'completed' : 'cancelled';
      await this.updateWindowStatus(windowId, finalStatus);

      // Create completion event
      await this.createSystemEvent(
        'maintenance_completed',
        `Maintenance Window ${result.success ? 'Completed' : 'Failed'}: ${window.name}`,
        result.message,
        result.success ? 'info' : 'error',
        { window_id: windowId, ...result.stats }
      );

      return result;

    } catch (error) {
      console.error('Maintenance orchestration failed:', error);
      await this.updateWindowStatus(windowId, 'cancelled');
      await this.createSystemEvent(
        'maintenance_failed',
        'Maintenance Window Failed',
        error.message,
        'error',
        { window_id: windowId, error: error.message }
      );
      
      return { success: false, message: error.message };
    }
  }

  private async executeBatchedMaintenance(window: MaintenanceWindow, servers: Server[]) {
    const maxConcurrent = window.max_concurrent_updates;
    const batches = this.createServerBatches(servers, maxConcurrent);
    
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    console.log(`Executing maintenance in ${batches.length} batches of max ${maxConcurrent} servers each`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} servers`);

      try {
        const batchResults = await Promise.allSettled(
          batch.map(server => this.updateServer(server, window))
        );

        // Process batch results
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failureCount++;
            const error = result.status === 'rejected' 
              ? result.reason.message 
              : result.value.error;
            errors.push(error);
          }
        }

        // Wait between batches (safety delay)
        if (i < batches.length - 1) {
          console.log('Waiting 30 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }

      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        failureCount += batch.length;
        errors.push(`Batch ${i + 1}: ${error.message}`);
      }
    }

    const totalServers = servers.length;
    const message = `Maintenance completed: ${successCount}/${totalServers} servers updated successfully`;
    
    if (failureCount > 0) {
      console.warn(`${failureCount} servers failed to update:`, errors);
    }

    return {
      success: failureCount === 0,
      message,
      stats: {
        total_servers: totalServers,
        successful_updates: successCount,
        failed_updates: failureCount,
        errors: errors.slice(0, 10) // Limit errors to prevent huge logs
      }
    };
  }

  private async updateServer(server: Server, window: MaintenanceWindow) {
    try {
      console.log(`Starting maintenance for server: ${server.hostname}`);

      // Pre-maintenance health check
      const healthCheck = await this.performHealthCheck(server);
      if (!healthCheck.healthy) {
        throw new Error(`Server ${server.hostname} failed pre-maintenance health check: ${healthCheck.message}`);
      }

      // VMware maintenance mode (if applicable)
      if (server.vcenter_id && server.cluster_name) {
        await this.enterMaintenanceMode(server);
      }

      // Execute firmware/OS updates
      const updateResult = await this.executeUpdates(server, window);
      
      if (!updateResult.success) {
        throw new Error(`Update failed for ${server.hostname}: ${updateResult.error}`);
      }

      // Post-maintenance health check
      const postHealthCheck = await this.performHealthCheck(server);
      if (!postHealthCheck.healthy) {
        console.warn(`Server ${server.hostname} passed updates but failed post-maintenance health check`);
      }

      // Exit VMware maintenance mode
      if (server.vcenter_id && server.cluster_name) {
        await this.exitMaintenanceMode(server);
      }

      console.log(`Successfully completed maintenance for server: ${server.hostname}`);
      return { success: true };

    } catch (error) {
      console.error(`Failed to update server ${server.hostname}:`, error);
      
      // Try to exit maintenance mode on failure
      if (server.vcenter_id && server.cluster_name) {
        try {
          await this.exitMaintenanceMode(server);
        } catch (exitError) {
          console.error(`Failed to exit maintenance mode for ${server.hostname}:`, exitError);
        }
      }

      return { success: false, error: error.message };
    }
  }

  private async performHealthCheck(server: Server) {
    try {
      const response = await this.supabase.functions.invoke('health-check', {
        body: { server_id: server.id, ip_address: server.ip_address }
      });

      if (response.error) throw response.error;
      
      return response.data || { healthy: false, message: 'Health check failed' };
    } catch (error) {
      console.error(`Health check failed for ${server.hostname}:`, error);
      return { healthy: false, message: error.message };
    }
  }

  private async enterMaintenanceMode(server: Server) {
    try {
      console.log(`Entering maintenance mode for VMware host: ${server.hostname}`);
      
      const response = await this.supabase.functions.invoke('execute-remote-command', {
        body: {
          action: 'enter_maintenance_mode',
          server_id: server.id,
          vcenter_id: server.vcenter_id,
          cluster_name: server.cluster_name
        }
      });

      if (response.error) throw response.error;

      // Wait for maintenance mode to be fully active
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      throw new Error(`Failed to enter maintenance mode: ${error.message}`);
    }
  }

  private async exitMaintenanceMode(server: Server) {
    try {
      console.log(`Exiting maintenance mode for VMware host: ${server.hostname}`);
      
      const response = await this.supabase.functions.invoke('execute-remote-command', {
        body: {
          action: 'exit_maintenance_mode',
          server_id: server.id,
          vcenter_id: server.vcenter_id,
          cluster_name: server.cluster_name
        }
      });

      if (response.error) throw response.error;
      
    } catch (error) {
      console.error(`Failed to exit maintenance mode: ${error.message}`);
      // Don't throw here - we don't want to fail the entire operation
    }
  }

  private async executeUpdates(server: Server, window: MaintenanceWindow) {
    try {
      console.log(`Executing updates for server: ${server.hostname}`);

      // Get pending firmware packages for this server
      const { data: pendingUpdates, error: updatesError } = await this.supabase
        .from('update_jobs')
        .select('*, firmware_packages(*)')
        .eq('server_id', server.id)
        .eq('status', 'pending');

      if (updatesError) throw updatesError;

      if (!pendingUpdates || pendingUpdates.length === 0) {
        console.log(`No pending updates for server: ${server.hostname}`);
        return { success: true };
      }

      console.log(`Found ${pendingUpdates.length} pending updates for ${server.hostname}`);

      // Execute updates through the process-update-job function
      for (const updateJob of pendingUpdates) {
        const response = await this.supabase.functions.invoke('process-update-job', {
          body: { 
            job_id: updateJob.id,
            maintenance_window_id: window.id
          }
        });

        if (response.error) {
          throw new Error(`Update job ${updateJob.id} failed: ${response.error.message}`);
        }
      }

      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private createServerBatches(servers: Server[], batchSize: number): Server[][] {
    const batches: Server[][] = [];
    
    // Sort servers by cluster to avoid updating multiple hosts in the same cluster simultaneously
    const sortedServers = [...servers].sort((a, b) => {
      if (a.cluster_name && b.cluster_name) {
        return a.cluster_name.localeCompare(b.cluster_name);
      }
      return 0;
    });

    for (let i = 0; i < sortedServers.length; i += batchSize) {
      batches.push(sortedServers.slice(i, i + batchSize));
    }

    return batches;
  }

  private async getDatacenterServers(datacenterId: string): Promise<Server[]> {
    const { data: datacenter } = await this.supabase
      .from('datacenters')
      .select('name')
      .eq('id', datacenterId)
      .single();

    if (!datacenter) return [];

    const { data: servers, error } = await this.supabase
      .from('servers')
      .select('*')
      .eq('datacenter', datacenter.name)
      .in('status', ['online', 'ready', 'active']);

    if (error) throw error;
    return servers || [];
  }

  private async updateWindowStatus(windowId: string, status: string) {
    await this.supabase
      .from('maintenance_windows')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', windowId);
  }

  private async createSystemEvent(type: string, title: string, description: string, severity: string, metadata: any) {
    await this.supabase
      .from('system_events')
      .insert({
        event_type: type,
        title,
        description,
        severity,
        metadata
      });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, window_id } = await req.json();

    if (action !== 'execute_maintenance') {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!window_id) {
      return new Response(
        JSON.stringify({ error: 'window_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orchestrator = new MaintenanceOrchestrator();
    const result = await orchestrator.executeMaintenanceWindow(window_id);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Maintenance orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});