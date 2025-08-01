import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VCenterHost {
  name: string;
  summary: {
    hardware: {
      vendor: string;
      model: string;
      uuid: string;
    };
    config: {
      name: string;
      managementServerIp?: string;
    };
    runtime: {
      powerState: string;
      connectionState: string;
    };
  };
  config?: {
    network?: {
      dnsConfig?: {
        hostName: string;
      };
    };
  };
}

interface VCenterConfig {
  id: string;
  hostname: string;
  username: string;
  port: number;
  ignore_ssl: boolean;
}

async function connectToVCenter(vcenter: VCenterConfig, password: string) {
  console.log(`Connecting to vCenter: ${vcenter.hostname}`);
  
  // Note: In a real implementation, you would use VMware's vSphere API
  // For now, we'll simulate the connection and return mock data
  // This is where you'd typically use libraries like node-vsphere or similar
  
  // Simulated vCenter API call - replace with actual vSphere SDK
  const mockHosts: VCenterHost[] = [
    {
      name: 'esxi-01.domain.com',
      summary: {
        hardware: {
          vendor: 'Dell Inc.',
          model: 'PowerEdge R750',
          uuid: '4c4c4544-0052-4810-8058-b7c04f583432'
        },
        config: {
          name: 'esxi-01.domain.com',
          managementServerIp: '192.168.1.10'
        },
        runtime: {
          powerState: 'poweredOn',
          connectionState: 'connected'
        }
      }
    },
    {
      name: 'esxi-02.domain.com', 
      summary: {
        hardware: {
          vendor: 'Dell Inc.',
          model: 'PowerEdge R640',
          uuid: '4c4c4544-0052-4810-8058-b7c04f583433'
        },
        config: {
          name: 'esxi-02.domain.com',
          managementServerIp: '192.168.1.11'
        },
        runtime: {
          powerState: 'poweredOn',
          connectionState: 'connected'
        }
      }
    }
  ];
  
  return mockHosts.filter(host => 
    host.summary.hardware.vendor.toLowerCase().includes('dell')
  );
}

async function getServiceTagFromHost(hostIp: string) {
  try {
    // This would typically make a Redfish API call to get the service tag
    // For now, we'll generate a mock service tag based on the IP
    const ipParts = hostIp.split('.');
    const lastOctet = ipParts[3];
    return `MOCK${lastOctet.padStart(3, '0')}ST`;
  } catch (error) {
    console.error(`Failed to get service tag for ${hostIp}:`, error);
    return null;
  }
}

async function syncVCenterHosts(supabase: any, vcenter: VCenterConfig, password: string) {
  console.log(`Starting sync for vCenter: ${vcenter.name}`);
  
  try {
    // Connect to vCenter and get Dell hosts
    const hosts = await connectToVCenter(vcenter, password);
    console.log(`Found ${hosts.length} Dell hosts in vCenter`);
    
    const syncResults = {
      total: hosts.length,
      created: 0,
      updated: 0,
      errors: 0
    };
    
    for (const host of hosts) {
      try {
        const managementIp = host.summary.config.managementServerIp;
        if (!managementIp) {
          console.warn(`No management IP found for host: ${host.name}`);
          syncResults.errors++;
          continue;
        }
        
        // Get service tag via iDRAC Redfish API
        const serviceTag = await getServiceTagFromHost(managementIp);
        
        // Check if host already exists
        const { data: existingHost, error: checkError } = await supabase
          .from('servers')
          .select('id, vcenter_id')
          .eq('ip_address', managementIp)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing host:', checkError);
          syncResults.errors++;
          continue;
        }
        
        const hostData = {
          hostname: host.name,
          ip_address: managementIp,
          model: host.summary.hardware.model,
          service_tag: serviceTag,
          vcenter_id: vcenter.id,
          status: host.summary.runtime.connectionState === 'connected' ? 'online' : 'offline',
          environment: 'production',
          last_discovered: new Date().toISOString()
        };
        
        if (existingHost) {
          // Update existing host
          const { error: updateError } = await supabase
            .from('servers')
            .update({
              ...hostData,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingHost.id);
          
          if (updateError) {
            console.error('Error updating host:', updateError);
            syncResults.errors++;
          } else {
            syncResults.updated++;
            console.log(`Updated host: ${host.name}`);
          }
        } else {
          // Create new host
          const { error: insertError } = await supabase
            .from('servers')
            .insert(hostData);
          
          if (insertError) {
            console.error('Error inserting host:', insertError);
            syncResults.errors++;
          } else {
            syncResults.created++;
            console.log(`Created host: ${host.name}`);
          }
        }
      } catch (hostError) {
        console.error(`Error processing host ${host.name}:`, hostError);
        syncResults.errors++;
      }
    }
    
    console.log('Sync completed:', syncResults);
    return syncResults;
    
  } catch (error) {
    console.error('vCenter sync failed:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vcenterId, password } = await req.json();
    
    if (!vcenterId || !password) {
      return new Response(
        JSON.stringify({ error: 'vCenter ID and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get vCenter configuration
    const { data: vcenter, error: vcenterError } = await supabase
      .from('vcenters')
      .select('*')
      .eq('id', vcenterId)
      .single();

    if (vcenterError || !vcenter) {
      return new Response(
        JSON.stringify({ error: 'vCenter configuration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Sync hosts from vCenter
    const results = await syncVCenterHosts(supabase, vcenter, password);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Synced ${results.total} hosts: ${results.created} created, ${results.updated} updated, ${results.errors} errors`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});