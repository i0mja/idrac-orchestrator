import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VCenterSyncRequest {
  vcenter_id: string;
  cluster_ids?: string[];
  sync_type?: 'clusters' | 'hosts' | 'both';
  password: string;
}

interface VCenterHost {
  name: string;
  ip_address: string;
  power_state: string;
  connection_state: string;
  vm_count: number;
  cpu_cores: number;
  memory_gb: number;
  model: string;
  service_tag?: string;
  cluster_name?: string;
}

interface VCenterConfig {
  id: string;
  name: string;
  hostname: string;
  username: string;
  port: number;
  ignore_ssl: boolean;
}

async function connectToVCenter(vcenter: VCenterConfig, password: string): Promise<{ clusters: any[], hosts: VCenterHost[] }> {
  console.log(`Connecting to vCenter: ${vcenter.hostname}`)
  
  try {
    // Real vCenter REST API integration
    const baseUrl = `https://${vcenter.hostname}:${vcenter.port || 443}`
    const authString = btoa(`${vcenter.username}:${password}`)
    
    // Create session
    console.log('Creating vCenter session...')
    const sessionResponse = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!sessionResponse.ok) {
      throw new Error(`vCenter authentication failed: ${sessionResponse.status} ${sessionResponse.statusText}`)
    }

    const sessionId = (await sessionResponse.text()).replace(/"/g, '')
    const sessionHeaders = {
      'vmware-api-session-id': sessionId,
      'Content-Type': 'application/json'
    }

    console.log('Session created, fetching clusters...')
    
    // Get clusters
    const clustersResponse = await fetch(`${baseUrl}/api/vcenter/cluster`, {
      headers: sessionHeaders,
      signal: AbortSignal.timeout(30000)
    })
    
    let clusters = []
    if (clustersResponse.ok) {
      clusters = await clustersResponse.json()
      console.log(`Found ${clusters.length} clusters`)
    } else {
      console.warn(`Failed to fetch clusters: ${clustersResponse.status}`)
    }

    // Get hosts
    console.log('Fetching hosts...')
    const hostsResponse = await fetch(`${baseUrl}/api/vcenter/host`, {
      headers: sessionHeaders,
      signal: AbortSignal.timeout(30000)
    })

    let hosts: VCenterHost[] = []
    if (hostsResponse.ok) {
      const hostData = await hostsResponse.json()
      console.log(`Found ${hostData.length} hosts, getting detailed info...`)
      
      // Get detailed info for each host in batches to avoid overwhelming vCenter
      const batchSize = 5
      for (let i = 0; i < hostData.length; i += batchSize) {
        const batch = hostData.slice(i, i + batchSize)
        
        const batchHosts = await Promise.all(
          batch.map(async (host: any) => {
            try {
              // Get host details
              const hostDetailResponse = await fetch(`${baseUrl}/api/vcenter/host/${host.host}`, {
                headers: sessionHeaders,
                signal: AbortSignal.timeout(20000)
              })
              
              if (!hostDetailResponse.ok) {
                console.warn(`Failed to get details for host ${host.name}: ${hostDetailResponse.status}`)
                return null
              }

              const details = await hostDetailResponse.json()
              
              // Get VMs on this host
              const vmResponse = await fetch(`${baseUrl}/api/vcenter/vm?hosts=${host.host}`, {
                headers: sessionHeaders,
                signal: AbortSignal.timeout(20000)
              })
              
              let vmCount = 0
              if (vmResponse.ok) {
                const vms = await vmResponse.json()
                vmCount = vms.length
              }

              // Find which cluster this host belongs to
              const hostCluster = clusters.find((c: any) => {
                return c.resource_pool && c.resource_pool === details.parent
              })

              return {
                name: details.name,
                ip_address: host.name, // vCenter often returns IP or FQDN here
                power_state: details.power_state || 'unknown',
                connection_state: details.connection_state || 'unknown',
                vm_count: vmCount,
                cpu_cores: details.hardware?.cpu?.count || 0,
                memory_gb: Math.round((details.hardware?.memory?.size_MiB || 0) / 1024),
                model: details.hardware?.vendor || 'Unknown',
                service_tag: details.hardware?.serial_number,
                cluster_name: hostCluster?.name || 'Unknown'
              }
            } catch (error) {
              console.error(`Error processing host ${host.name}:`, error)
              return null
            }
          })
        )

        // Filter out failed hosts and add to main array
        hosts.push(...batchHosts.filter(h => h !== null))
        
        // Small delay between batches to be nice to vCenter
        if (i + batchSize < hostData.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } else {
      console.warn(`Failed to fetch hosts: ${hostsResponse.status}`)
    }

    // Clean up session
    try {
      await fetch(`${baseUrl}/api/session`, {
        method: 'DELETE',
        headers: sessionHeaders,
        signal: AbortSignal.timeout(10000)
      })
      console.log('vCenter session cleaned up')
    } catch (cleanupError) {
      console.warn('Failed to cleanup vCenter session:', cleanupError)
    }

    console.log(`Successfully retrieved ${clusters.length} clusters and ${hosts.length} hosts from vCenter`)
    return { clusters, hosts }

  } catch (error) {
    console.error('vCenter connection error:', error)
    throw new Error(`vCenter connection failed: ${error.message}`)
  }
}

async function getServiceTagFromHost(hostIp: string): Promise<string | null> {
  try {
    console.log(`Getting service tag for host: ${hostIp}`)
    
    // Get credentials for this IP
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: credentials } = await supabase
      .rpc('get_credentials_for_ip', { target_ip: hostIp })

    if (!credentials || credentials.length === 0) {
      console.warn(`No credentials found for ${hostIp}`)
      return null
    }

    const cred = credentials[0]
    
    // Try to get service tag via Redfish API
    const redfishUrl = `https://${hostIp}:${cred.port || 443}/redfish/v1/Systems/System.Embedded.1`
    const authHeader = `Basic ${btoa(`${cred.username}:${cred.password_encrypted}`)}`
    
    const response = await fetch(redfishUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (response.ok) {
      const systemInfo = await response.json()
      const serviceTag = systemInfo.SKU || systemInfo.SerialNumber
      console.log(`Retrieved service tag for ${hostIp}: ${serviceTag}`)
      return serviceTag
    } else {
      console.warn(`Failed to get service tag from ${hostIp}: ${response.status}`)
      return null
    }
  } catch (error) {
    console.error(`Failed to get service tag for ${hostIp}:`, error)
    return null
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vcenter_id, cluster_ids, sync_type = 'both', password }: VCenterSyncRequest = await req.json();
    
    if (!vcenter_id || !password) {
      return new Response(
        JSON.stringify({ error: 'vCenter ID and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting vCenter sync: ${sync_type} for vCenter ${vcenter_id}`)

    // Get vCenter configuration
    const { data: vcenter, error: vcenterError } = await supabase
      .from('vcenters')
      .select('*')
      .eq('id', vcenter_id)
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

    const { clusters, hosts } = await connectToVCenter(vcenter, password);
    
    const results = {
      clusters: { total: 0, created: 0, updated: 0, errors: 0 },
      hosts: { total: 0, created: 0, updated: 0, errors: 0 }
    };

    // Sync clusters if requested
    if (sync_type === 'clusters' || sync_type === 'both') {
      console.log(`Syncing ${clusters.length} clusters...`)
      results.clusters.total = clusters.length;
      
      for (const cluster of clusters) {
        try {
          const { data: existingCluster, error: checkError } = await supabase
            .from('vcenter_clusters')
            .select('id')
            .eq('vcenter_id', vcenter_id)
            .eq('name', cluster.name)
            .single();

          const clusterData = {
            name: cluster.name,
            vcenter_id: vcenter_id,
            drs_enabled: cluster.drs_enabled || false,
            ha_enabled: cluster.ha_enabled || false,
            updated_at: new Date().toISOString()
          };

          if (existingCluster) {
            await supabase
              .from('vcenter_clusters')
              .update(clusterData)
              .eq('id', existingCluster.id);
            results.clusters.updated++;
          } else {
            await supabase
              .from('vcenter_clusters')
              .insert(clusterData);
            results.clusters.created++;
          }
        } catch (error) {
          console.error(`Error syncing cluster ${cluster.name}:`, error);
          results.clusters.errors++;
        }
      }
    }

    // Sync hosts if requested  
    if (sync_type === 'hosts' || sync_type === 'both') {
      console.log(`Syncing ${hosts.length} hosts...`)
      results.hosts.total = hosts.length;

      for (const host of hosts) {
        try {
          // Get service tag for the host
          const serviceTag = await getServiceTagFromHost(host.ip_address);
          
          const { data: existingHost, error: checkError } = await supabase
            .from('servers')
            .select('id, vcenter_id')
            .eq('ip_address', host.ip_address)
            .single();

          const hostData = {
            hostname: host.name,
            ip_address: host.ip_address,
            model: host.model,
            service_tag: serviceTag,
            vcenter_id: vcenter_id,
            cluster_name: host.cluster_name,
            cpu_cores: host.cpu_cores,
            memory_gb: host.memory_gb,
            status: host.connection_state === 'connected' && host.power_state === 'poweredOn' ? 'online' : 'offline',
            host_type: 'vcenter_managed',
            environment: 'production',
            last_discovered: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          if (existingHost) {
            await supabase
              .from('servers')
              .update(hostData)
              .eq('id', existingHost.id);
            results.hosts.updated++;
            console.log(`Updated host: ${host.name}`);
          } else {
            await supabase
              .from('servers')
              .insert(hostData);
            results.hosts.created++;
            console.log(`Created host: ${host.name}`);
          }
        } catch (error) {
          console.error(`Error syncing host ${host.name}:`, error);
          results.hosts.errors++;
        }
      }
    }

    // Log system event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'vcenter_sync_completed',
        severity: 'info',
        title: `vCenter Sync Completed`,
        description: `Synchronized ${sync_type} from vCenter ${vcenter.name}`,
        metadata: {
          vcenter_id: vcenter_id,
          sync_type: sync_type,
          results: results
        }
      });

    console.log('vCenter sync completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Sync completed: ${results.hosts.created + results.clusters.created} created, ${results.hosts.updated + results.clusters.updated} updated, ${results.hosts.errors + results.clusters.errors} errors`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('vCenter sync error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})