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

    const { ipRange, credentials }: DiscoveryRequest = await req.json();
    
    console.log(`Starting server discovery for IP range: ${ipRange}`);
    
    // Parse IP range (e.g., "192.168.1.1-50" or "192.168.1.100")
    const baseIp = ipRange.includes('-') ? ipRange.split('-')[0] : ipRange;
    const [network, endRange] = ipRange.includes('-') ? 
      [baseIp.substring(0, baseIp.lastIndexOf('.')), 
       parseInt(ipRange.split('-')[1])] : 
      [baseIp.substring(0, baseIp.lastIndexOf('.')), 
       parseInt(baseIp.substring(baseIp.lastIndexOf('.') + 1))];
    
    const startRange = ipRange.includes('-') ? 
      parseInt(baseIp.substring(baseIp.lastIndexOf('.') + 1)) : endRange;
    
    const discoveredServers = [];
    
    // Discover servers in the IP range
    for (let i = startRange; i <= endRange; i++) {
      const currentIp = `${network}.${i}`;
      
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
              
              const serverData = {
                hostname: systemInfo.HostName || `server-${currentIp.replace(/\./g, '-')}`,
                ip_address: currentIp,
                model: systemInfo.Model || 'Unknown',
                service_tag: systemInfo.SKU || '',
                idrac_version: idracVersion,
                bios_version: systemInfo.BiosVersion || '',
                status: systemInfo.PowerState === 'On' ? 'online' : 'offline',
                environment: 'production',
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