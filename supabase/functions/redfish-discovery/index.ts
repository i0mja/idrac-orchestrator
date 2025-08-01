import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RedfishDiscoveryRequest {
  serverIds?: string[];
  discoverFirmware?: boolean;
}

interface RedfishServer {
  id: string;
  hostname: string;
  ip_address: string;
  model?: string;
  service_tag?: string;
  idrac_version?: string;
  bios_version?: string;
}

interface RedfishSystemInfo {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  biosVersion?: string;
  firmwareVersion?: string;
  updateService?: {
    available: boolean;
    supportedProtocols: string[];
  };
  availableUpdates?: FirmwareUpdate[];
}

interface FirmwareUpdate {
  name: string;
  version: string;
  component: string;
  releaseDate: string;
  size: number;
  description: string;
  softwareId: string;
  updateUri?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { serverIds, discoverFirmware = false }: RedfishDiscoveryRequest = await req.json();

    console.log('Starting Redfish discovery for servers:', serverIds);

    // Get servers to discover
    let query = supabase.from('servers').select('*');
    if (serverIds && serverIds.length > 0) {
      query = query.in('id', serverIds);
    }
    
    const { data: servers, error: serversError } = await query;
    if (serversError) throw serversError;

    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No servers found for discovery',
          discovered: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Discovering ${servers.length} servers via Redfish API`);

    // Discover servers in parallel
    const discoveryPromises = servers.map(server => 
      discoverServer(server as RedfishServer, discoverFirmware)
    );
    
    const discoveryResults = await Promise.allSettled(discoveryPromises);

    // Process results
    const successfulDiscoveries = [];
    const failedDiscoveries = [];

    for (let i = 0; i < discoveryResults.length; i++) {
      const result = discoveryResults[i];
      const server = servers[i];
      
      if (result.status === 'fulfilled' && result.value) {
        successfulDiscoveries.push({
          serverId: server.id,
          hostname: server.hostname,
          discovered: result.value
        });

        // Update server info in database
        await updateServerInfo(supabase, server.id, result.value);
        
      } else {
        const error = result.status === 'rejected' ? result.reason : 'Unknown error';
        console.error(`Discovery failed for ${server.hostname}:`, error);
        failedDiscoveries.push({
          serverId: server.id,
          hostname: server.hostname,
          error: error.message || error
        });
      }
    }

    console.log(`Discovery complete: ${successfulDiscoveries.length} successful, ${failedDiscoveries.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        discovered: successfulDiscoveries,
        failed: failedDiscoveries,
        summary: {
          total: servers.length,
          successful: successfulDiscoveries.length,
          failed: failedDiscoveries.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Redfish discovery error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to perform Redfish discovery',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function discoverServer(server: RedfishServer, discoverFirmware: boolean): Promise<RedfishSystemInfo | null> {
  try {
    console.log(`Discovering server: ${server.hostname} (${server.ip_address})`);

    // Get credentials for this server
    const credentials = await getServerCredentials(server.id);
    if (!credentials) {
      throw new Error('No credentials found for server');
    }

    // Construct Redfish base URL
    const baseUrl = `https://${server.ip_address}`;
    const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;

    // Discover Redfish service root
    const serviceRoot = await redfishRequest(`${baseUrl}/redfish/v1/`, authHeader);
    console.log(`Service root discovered for ${server.hostname}`);

    // Get Systems collection
    const systemsUrl = serviceRoot.Systems?.['@odata.id'];
    if (!systemsUrl) {
      throw new Error('Systems collection not found');
    }

    const systems = await redfishRequest(`${baseUrl}${systemsUrl}`, authHeader);
    const systemMembers = systems.Members;
    
    if (!systemMembers || systemMembers.length === 0) {
      throw new Error('No systems found');
    }

    // Get first system (usually only one in Dell servers)
    const systemUrl = systemMembers[0]['@odata.id'];
    const system = await redfishRequest(`${baseUrl}${systemUrl}`, authHeader);

    const systemInfo: RedfishSystemInfo = {
      manufacturer: system.Manufacturer,
      model: system.Model,
      serialNumber: system.SerialNumber,
      biosVersion: system.BiosVersion,
      firmwareVersion: system.PowerState, // Placeholder - actual firmware version varies by vendor
    };

    // Check for UpdateService
    if (serviceRoot.UpdateService) {
      const updateServiceUrl = serviceRoot.UpdateService['@odata.id'];
      try {
        const updateService = await redfishRequest(`${baseUrl}${updateServiceUrl}`, authHeader);
        systemInfo.updateService = {
          available: true,
          supportedProtocols: updateService.TransferProtocol || ['HTTP', 'HTTPS']
        };

        // Discover firmware if requested
        if (discoverFirmware && updateService.FirmwareInventory) {
          systemInfo.availableUpdates = await discoverFirmwareUpdates(
            baseUrl, 
            authHeader, 
            updateService
          );
        }
      } catch (updateError) {
        console.log(`UpdateService not available for ${server.hostname}:`, updateError);
        systemInfo.updateService = { available: false, supportedProtocols: [] };
      }
    }

    return systemInfo;

  } catch (error) {
    console.error(`Failed to discover ${server.hostname}:`, error);
    throw error;
  }
}

async function redfishRequest(url: string, authHeader: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'iDRAC-Orchestrator/1.0'
    },
    // Ignore SSL certificate errors for iDRAC
    // Note: In production, you should properly configure certificates
  });

  if (!response.ok) {
    throw new Error(`Redfish request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function discoverFirmwareUpdates(
  baseUrl: string, 
  authHeader: string, 
  updateService: any
): Promise<FirmwareUpdate[]> {
  try {
    // This would typically query Dell's UpdateService for available updates
    // Implementation varies by vendor - this is a simplified version
    const updates: FirmwareUpdate[] = [];

    if (updateService.Actions?.['#UpdateService.SimpleUpdate']) {
      // Server supports firmware updates
      console.log('Server supports firmware updates via UpdateService');
      
      // In a real implementation, this would:
      // 1. Query Dell's support site or catalog
      // 2. Compare with current firmware versions
      // 3. Return available updates
      
      // For now, return empty array - will be populated by actual Dell integration
    }

    return updates;
  } catch (error) {
    console.error('Failed to discover firmware updates:', error);
    return [];
  }
}

async function getServerCredentials(serverId: string): Promise<{username: string, password: string} | null> {
  // In a real implementation, this would securely retrieve credentials
  // For now, use default iDRAC credentials (should be configurable)
  return {
    username: 'root',
    password: 'calvin' // Default Dell iDRAC password - should be changed in production
  };
}

async function updateServerInfo(supabase: any, serverId: string, systemInfo: RedfishSystemInfo) {
  try {
    const updateData: any = {
      last_discovered: new Date().toISOString(),
      status: 'online'
    };

    if (systemInfo.model) updateData.model = systemInfo.model;
    if (systemInfo.serialNumber) updateData.service_tag = systemInfo.serialNumber;
    if (systemInfo.biosVersion) updateData.bios_version = systemInfo.biosVersion;
    if (systemInfo.firmwareVersion) updateData.idrac_version = systemInfo.firmwareVersion;

    const { error } = await supabase
      .from('servers')
      .update(updateData)
      .eq('id', serverId);

    if (error) {
      console.error('Failed to update server info:', error);
    } else {
      console.log(`Updated server info for ${serverId}`);
    }
  } catch (error) {
    console.error('Error updating server info:', error);
  }
}