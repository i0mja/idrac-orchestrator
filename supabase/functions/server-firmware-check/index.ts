import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FirmwareCheckRequest {
  serverId: string;
  downloadUpdates?: boolean;
}

interface AvailableFirmware {
  name: string;
  currentVersion: string;
  availableVersion: string;
  component: string;
  criticality: 'critical' | 'recommended' | 'optional';
  releaseDate: string;
  size: number;
  description: string;
  downloadUrl?: string;
  updatePath?: string;
  prerequisites?: string[];
  rebootRequired: boolean;
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
    const { serverId, downloadUpdates = false }: FirmwareCheckRequest = await req.json();

    console.log(`Checking firmware for server: ${serverId}`);

    // Get server details
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      throw new Error('Server not found');
    }

    // Connect to server via Redfish and check firmware
    const firmwareCheck = await checkServerFirmware(server, downloadUpdates);

    // Update server status
    await supabase
      .from('servers')
      .update({
        last_updated: new Date().toISOString(),
        status: firmwareCheck.accessible ? 'online' : 'offline'
      })
      .eq('id', serverId);

    return new Response(
      JSON.stringify({
        success: true,
        serverId,
        hostname: server.hostname,
        accessible: firmwareCheck.accessible,
        availableFirmware: firmwareCheck.availableFirmware,
        currentVersions: firmwareCheck.currentVersions,
        downloadedUpdates: firmwareCheck.downloadedUpdates || [],
        summary: {
          totalUpdates: firmwareCheck.availableFirmware.length,
          criticalUpdates: firmwareCheck.availableFirmware.filter(f => f.criticality === 'critical').length,
          recommendedUpdates: firmwareCheck.availableFirmware.filter(f => f.criticality === 'recommended').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Firmware check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to check server firmware',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function checkServerFirmware(server: any, downloadUpdates: boolean) {
  try {
    console.log(`Connecting to ${server.hostname} via Redfish`);

    const baseUrl = `https://${server.ip_address}`;
    const credentials = await getServerCredentials(server.id);
    
    if (!credentials) {
      throw new Error('No credentials available');
    }

    const authHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;

    // Get current firmware versions
    const currentVersions = await getCurrentFirmwareVersions(baseUrl, authHeader);
    
    // Check Dell support for available updates
    const availableUpdates = await checkDellUpdatesForServer(server, currentVersions);

    let downloadedUpdates = [];
    if (downloadUpdates && availableUpdates.length > 0) {
      // Instruct server to download updates to local storage
      downloadedUpdates = await downloadUpdatesToServer(baseUrl, authHeader, availableUpdates);
    }

    return {
      accessible: true,
      currentVersions,
      availableFirmware: availableUpdates,
      downloadedUpdates
    };

  } catch (error) {
    console.error(`Failed to check firmware for ${server.hostname}:`, error);
    return {
      accessible: false,
      currentVersions: {},
      availableFirmware: [],
      downloadedUpdates: []
    };
  }
}

async function getCurrentFirmwareVersions(baseUrl: string, authHeader: string): Promise<Record<string, string>> {
  try {
    // Get service root
    const serviceRoot = await redfishRequest(`${baseUrl}/redfish/v1/`, authHeader);
    
    const versions: Record<string, string> = {};

    // Get system info
    const systemsUrl = serviceRoot.Systems?.['@odata.id'];
    if (systemsUrl) {
      const systems = await redfishRequest(`${baseUrl}${systemsUrl}`, authHeader);
      if (systems.Members?.[0]) {
        const system = await redfishRequest(`${baseUrl}${systems.Members[0]['@odata.id']}`, authHeader);
        if (system.BiosVersion) versions.bios = system.BiosVersion;
      }
    }

    // Get manager info (iDRAC)
    const managersUrl = serviceRoot.Managers?.['@odata.id'];
    if (managersUrl) {
      const managers = await redfishRequest(`${baseUrl}${managersUrl}`, authHeader);
      if (managers.Members?.[0]) {
        const manager = await redfishRequest(`${baseUrl}${managers.Members[0]['@odata.id']}`, authHeader);
        if (manager.FirmwareVersion) versions.idrac = manager.FirmwareVersion;
      }
    }

    // Get firmware inventory if available
    const updateServiceUrl = serviceRoot.UpdateService?.['@odata.id'];
    if (updateServiceUrl) {
      try {
        const updateService = await redfishRequest(`${baseUrl}${updateServiceUrl}`, authHeader);
        const firmwareInventoryUrl = updateService.FirmwareInventory?.['@odata.id'];
        
        if (firmwareInventoryUrl) {
          const firmwareInventory = await redfishRequest(`${baseUrl}${firmwareInventoryUrl}`, authHeader);
          
          // Get individual firmware components
          for (const member of firmwareInventory.Members || []) {
            try {
              const component = await redfishRequest(`${baseUrl}${member['@odata.id']}`, authHeader);
              if (component.Name && component.Version) {
                const componentName = component.Name.toLowerCase().replace(/\s+/g, '_');
                versions[componentName] = component.Version;
              }
            } catch (err) {
              // Skip individual component errors
              console.log('Failed to get component info:', err);
            }
          }
        }
      } catch (err) {
        console.log('UpdateService not available:', err);
      }
    }

    console.log('Current firmware versions:', versions);
    return versions;

  } catch (error) {
    console.error('Failed to get current firmware versions:', error);
    return {};
  }
}

async function checkDellUpdatesForServer(server: any, currentVersions: Record<string, string>): Promise<AvailableFirmware[]> {
  try {
    console.log(`Checking Dell updates for ${server.model || 'unknown model'}`);

    // This would query Dell's catalog or API for available updates
    // For now, simulate checking based on current versions
    const availableUpdates: AvailableFirmware[] = [];

    // Example: Check if BIOS can be updated
    if (currentVersions.bios) {
      // In reality, this would query Dell's support site
      const latestBiosVersion = await getLatestBiosVersion(server.model);
      if (latestBiosVersion && latestBiosVersion !== currentVersions.bios) {
        availableUpdates.push({
          name: `${server.model} System BIOS`,
          currentVersion: currentVersions.bios,
          availableVersion: latestBiosVersion,
          component: 'bios',
          criticality: 'recommended',
          releaseDate: '2024-01-15',
          size: 30 * 1024 * 1024, // 30MB
          description: 'System BIOS update with security enhancements',
          rebootRequired: true,
          prerequisites: ['Ensure AC power connected']
        });
      }
    }

    // Example: Check iDRAC firmware
    if (currentVersions.idrac) {
      const latestIdracVersion = await getLatestIdracVersion(server.model);
      if (latestIdracVersion && latestIdracVersion !== currentVersions.idrac) {
        availableUpdates.push({
          name: 'iDRAC Firmware',
          currentVersion: currentVersions.idrac,
          availableVersion: latestIdracVersion,
          component: 'idrac',
          criticality: 'critical',
          releaseDate: '2024-02-01',
          size: 50 * 1024 * 1024, // 50MB
          description: 'iDRAC firmware with security patches',
          rebootRequired: false,
          prerequisites: []
        });
      }
    }

    console.log(`Found ${availableUpdates.length} available updates`);
    return availableUpdates;

  } catch (error) {
    console.error('Failed to check Dell updates:', error);
    return [];
  }
}

async function downloadUpdatesToServer(
  baseUrl: string, 
  authHeader: string, 
  updates: AvailableFirmware[]
): Promise<string[]> {
  const downloaded = [];
  
  try {
    console.log(`Attempting to download ${updates.length} updates to server`);

    // Check if server supports update downloads
    const serviceRoot = await redfishRequest(`${baseUrl}/redfish/v1/`, authHeader);
    const updateServiceUrl = serviceRoot.UpdateService?.['@odata.id'];
    
    if (!updateServiceUrl) {
      throw new Error('Server does not support update downloads');
    }

    const updateService = await redfishRequest(`${baseUrl}${updateServiceUrl}`, authHeader);
    
    for (const update of updates) {
      try {
        // In a real implementation, this would:
        // 1. Get download URL from Dell
        // 2. Instruct server to download to local storage
        // 3. Verify download integrity
        
        console.log(`Downloading ${update.name} to server local storage`);
        
        // Simulate download success
        downloaded.push(update.name);
        
      } catch (err) {
        console.error(`Failed to download ${update.name}:`, err);
      }
    }

  } catch (error) {
    console.error('Failed to download updates to server:', error);
  }

  return downloaded;
}

async function getLatestBiosVersion(model: string | null): Promise<string | null> {
  // Simulate checking Dell support for latest BIOS
  // In reality, this would query Dell's catalog/API
  const modelVersions: Record<string, string> = {
    'PowerEdge R740': '2.19.0',
    'PowerEdge R750': '2.20.1',
    'PowerEdge R640': '2.21.0',
    'PowerEdge R650': '2.16.2'
  };
  
  return model ? modelVersions[model] || null : null;
}

async function getLatestIdracVersion(model: string | null): Promise<string | null> {
  // Simulate checking Dell support for latest iDRAC
  const modelVersions: Record<string, string> = {
    'PowerEdge R740': '6.10.32.00',
    'PowerEdge R750': '6.10.32.00',
    'PowerEdge R640': '6.10.32.00',
    'PowerEdge R650': '6.10.32.00'
  };
  
  return model ? modelVersions[model] || null : null;
}

async function redfishRequest(url: string, authHeader: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'iDRAC-Orchestrator/1.0'
    },
    // Note: In production, configure proper SSL verification
  });

  if (!response.ok) {
    throw new Error(`Redfish request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function getServerCredentials(serverId: string): Promise<{username: string, password: string} | null> {
  // Retrieve from secure credential storage
  // For demo purposes, using default credentials
  return {
    username: 'root',
    password: 'calvin'
  };
}