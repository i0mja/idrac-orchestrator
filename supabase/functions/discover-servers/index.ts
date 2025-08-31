import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DiscoveryRequest {
  ipRange: string;
  credentials: {
    username: string;
    password: string;
  };
  datacenterId?: string;
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

    const { ipRange, credentials, datacenterId }: DiscoveryRequest = await req.json();
    
    console.log(`Starting server discovery for IP range: ${ipRange}, datacenterId: ${datacenterId}`);
    
    // Get IP ranges from datacenter if specified
    let ipRangesToScan: string[] = [];
    
    if (datacenterId && !ipRange) {
      // Get datacenter scopes
      const { data: datacenter, error: dcError } = await supabase
        .from('datacenters')
        .select('ip_scopes')
        .eq('id', datacenterId)
        .single();
        
      if (dcError) {
        throw new Error(`Failed to fetch datacenter: ${dcError.message}`);
      }
      
      // Convert datacenter scopes to IP ranges
      if (datacenter?.ip_scopes && Array.isArray(datacenter.ip_scopes)) {
        ipRangesToScan = datacenter.ip_scopes.map((scope: any) => {
          // Convert CIDR to range format for scanning
          const subnet = scope.subnet;
          if (subnet.includes('/24')) {
            const base = subnet.replace('/24', '');
            const baseIP = base.substring(0, base.lastIndexOf('.'));
            return `${baseIP}.1-254`;
          }
          return subnet;
        });
      }
    } else if (ipRange) {
      ipRangesToScan = [ipRange];
    }
    
    if (ipRangesToScan.length === 0) {
      throw new Error('No IP ranges to scan');
    }
    
    const discoveredServers = [];
    
    // Process each IP range
    for (const currentRange of ipRangesToScan) {
      console.log('Processing IP range:', currentRange);
      
      // Parse IP range
      const [startIP, endRange] = currentRange.includes('-') 
        ? [currentRange.split('-')[0].trim(), parseInt(currentRange.split('-')[1].trim())]
        : [currentRange, parseInt(currentRange.split('.')[3])];
      
      const baseParts = startIP.split('.');
      const baseNetwork = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}`;
      const startHost = parseInt(baseParts[3]);
      const endHost = currentRange.includes('-') ? endRange : startHost;
    
      // Discover servers in the IP range
      for (let i = startHost; i <= endHost; i++) {
        const currentIp = `${baseNetwork}.${i}`;
        
        try {
          console.log(`Checking server at ${currentIp}`);
          
          // Try to connect to iDRAC via Redfish API
          const redfishUrl = `https://${currentIp}/redfish/v1/Systems`;
          
          const response = await fetch(redfishUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
              'Content-Type': 'application/json',
            },
            // Ignore SSL certificate errors for self-signed certificates
            signal: AbortSignal.timeout(10000), // 10 second timeout
          }).catch(() => null);
          
          if (response && response.ok) {
            const systemData = await response.json();
            
            // Get system info from Redfish
            const systemMembers = systemData.Members || [];
            if (systemMembers.length > 0) {
              const systemUrl = `https://${currentIp}${systemMembers[0]['@odata.id']}`;
              const systemResponse = await fetch(systemUrl, {
                headers: {
                  'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
                  'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(10000),
              }).catch(() => null);
              
              if (systemResponse && systemResponse.ok) {
                const systemInfo = await systemResponse.json();
                
                // Get manager info for iDRAC version
                const managersResponse = await fetch(`https://${currentIp}/redfish/v1/Managers`, {
                  headers: {
                    'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
                    'Content-Type': 'application/json',
                  },
                  signal: AbortSignal.timeout(10000),
                }).catch(() => null);
                
                let idracVersion = '';
                if (managersResponse && managersResponse.ok) {
                  const managersData = await managersResponse.json();
                  if (managersData.Members && managersData.Members.length > 0) {
                    const managerUrl = `https://${currentIp}${managersData.Members[0]['@odata.id']}`;
                    const managerResponse = await fetch(managerUrl, {
                      headers: {
                        'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
                        'Content-Type': 'application/json',
                      },
                      signal: AbortSignal.timeout(10000),
                    }).catch(() => null);
                    
                    if (managerResponse && managerResponse.ok) {
                      const managerInfo = await managerResponse.json();
                      idracVersion = managerInfo.FirmwareVersion || '';
                    }
                  }
                }
                
                // Auto-assign datacenter if specified
                let datacenterName = null;
                if (datacenterId) {
                  const { data: datacenter } = await supabase
                    .from('datacenters')
                    .select('name')
                    .eq('id', datacenterId)
                    .single();
                  datacenterName = datacenter?.name;
                }
                
                const serverData = {
                  hostname: systemInfo.HostName || `server-${currentIp.replace(/\./g, '-')}`,
                  ip_address: currentIp,
                  model: systemInfo.Model || 'Unknown',
                  service_tag: systemInfo.SKU || '',
                  idrac_version: idracVersion,
                  bios_version: systemInfo.BiosVersion || '',
                  status: systemInfo.PowerState === 'On' ? 'online' : 'offline',
                  environment: 'production',
                  datacenter: datacenterName,
                  discovery_source: 'network_scan',
                  last_discovered: new Date().toISOString(),
                };
                
                discoveredServers.push(serverData);
                console.log(`Discovered server: ${serverData.hostname} at ${currentIp}`);
              }
            }
          }
        } catch (error) {
          console.log(`Failed to connect to ${currentIp}: ${error.message}`);
          // Continue to next IP
        }
      }
    }
    
    // Insert discovered servers into database
    if (discoveredServers.length > 0) {
      const { data, error } = await supabase
        .from('servers')
        .upsert(discoveredServers, { 
          onConflict: 'ip_address',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('Error inserting servers:', error);
        throw error;
      }
      
      console.log(`Successfully discovered and saved ${discoveredServers.length} servers`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        discovered: discoveredServers.length,
        servers: discoveredServers 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Discovery error:', error);
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