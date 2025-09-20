import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkActionRequest {
  action: 'test_all' | 'health_check' | 'update_ready';
  options?: {
    timeout?: number;
    concurrency?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, options = {} } = await req.json() as BulkActionRequest;
    const { timeout = 30000, concurrency = 10 } = options;

    console.log(`Starting bulk action: ${action} with options:`, options);

    // Get all discovered servers
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, hostname, ip_address, protocol_capabilities, healthiest_protocol')
      .not('ip_address', 'is', null);

    if (serversError) {
      throw new Error(`Failed to fetch servers: ${serversError.message}`);
    }

    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
          message: 'No servers found to process'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${servers.length} servers with action: ${action}`);

    // Process servers in batches to avoid overwhelming the system
    const results: Array<{
      host: string;
      status: 'success' | 'failed';
      protocols?: any[];
      healthData?: any;
      readinessData?: any;
      error?: string;
    }> = [];

    const processServer = async (server: any) => {
      try {
        console.log(`Processing server: ${server.hostname} (${server.ip_address})`);

        switch (action) {
          case 'test_all':
            // Test all protocol capabilities
            const { data: protocolData, error: protocolError } = await supabase.functions.invoke(
              'enhanced-discovery',
              {
                body: {
                  ipRange: server.ip_address,
                  detectProtocols: true,
                  checkFirmware: false,
                  useCredentialProfiles: true
                }
              }
            );

            if (protocolError) throw protocolError;

            return {
              host: server.hostname || server.ip_address,
              status: 'success' as const,
              protocols: protocolData?.servers?.[0]?.protocols || []
            };

          case 'health_check':
            // Perform comprehensive health check
            const { data: healthData, error: healthError } = await supabase.functions.invoke(
              'health-check',
              {
                body: {
                  serverId: server.id,
                  checks: ['connectivity', 'protocols', 'firmware', 'vcenter']
                }
              }
            );

            if (healthError) throw healthError;

            return {
              host: server.hostname || server.ip_address,
              status: 'success' as const,
              healthData: healthData
            };

          case 'update_ready':
            // Check update readiness
            const { data: readinessData, error: readinessError } = await supabase.functions.invoke(
              'host-readiness-check',
              {
                body: {
                  serverId: server.id,
                  checkType: 'update_readiness'
                }
              }
            );

            if (readinessError) throw readinessError;

            return {
              host: server.hostname || server.ip_address,
              status: 'success' as const,
              readinessData: readinessData
            };

          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error: any) {
        console.error(`Error processing server ${server.hostname}:`, error);
        return {
          host: server.hostname || server.ip_address,
          status: 'failed' as const,
          error: error.message || 'Unknown error'
        };
      }
    };

    // Process servers in batches
    const batches = [];
    for (let i = 0; i < servers.length; i += concurrency) {
      batches.push(servers.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(processServer);
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            host: 'unknown',
            status: 'failed',
            error: result.reason?.message || 'Promise rejected'
          });
        }
      }
    }

    // Calculate summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`Bulk action completed: ${successful}/${servers.length} successful`);

    // Log the bulk action event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'bulk_action',
        severity: failed > successful ? 'warning' : 'info',
        title: `Bulk ${action} completed`,
        description: `Processed ${servers.length} servers: ${successful} successful, ${failed} failed`,
        metadata: {
          action,
          total: servers.length,
          successful,
          failed,
          duration: Date.now() - new Date().getTime()
        }
      });

    return new Response(
      JSON.stringify({
        total: servers.length,
        successful,
        failed,
        results,
        action,
        completedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Bulk action error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        total: 0,
        successful: 0,
        failed: 0,
        results: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});