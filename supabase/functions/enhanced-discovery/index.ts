import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnhancedDiscoveryRequest {
  ipRange: string;
  credentials?: {
    username: string;
    password: string;
  };
  datacenterId?: string;
  useCredentialProfiles?: boolean;
  detectProtocols?: boolean;
  checkFirmware?: boolean;
}

interface ProtocolCapability {
  protocol: 'REDFISH' | 'WSMAN' | 'RACADM' | 'IPMI' | 'SSH';
  supported: boolean;
  firmwareVersion?: string;
  managerType?: string;
  generation?: string;
  updateModes: string[];
  priority: number;
  latencyMs?: number;
  status: 'healthy' | 'degraded' | 'unreachable';
}

interface EnhancedServerResult {
  hostname: string;
  ip_address: string;
  model: string;
  service_tag: string;
  idrac_version: string;
  bios_version: string;
  status: string;
  protocols: ProtocolCapability[];
  healthiestProtocol?: ProtocolCapability;
  firmwareCompliance?: {
    biosOutdated: boolean;
    idracOutdated: boolean;
    availableUpdates: number;
    updateReadiness: 'ready' | 'maintenance_required' | 'not_supported';
  };
  discoveryMethod: string;
  lastProtocolCheck: string;
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

    const { 
      ipRange, 
      credentials, 
      datacenterId, 
      useCredentialProfiles = true,
      detectProtocols = true,
      checkFirmware = true 
    }: EnhancedDiscoveryRequest = await req.json();
    
    console.log(`Starting enhanced discovery for IP range: ${ipRange}, protocols: ${detectProtocols}, firmware: ${checkFirmware}`);
    
    // Get IP ranges from datacenter if specified
    let ipRangesToScan: string[] = [];
    
    if (datacenterId && !ipRange) {
      const { data: datacenter, error: dcError } = await supabase
        .from('datacenters')
        .select('ip_scopes')
        .eq('id', datacenterId)
        .single();
        
      if (dcError) {
        throw new Error(`Failed to fetch datacenter: ${dcError.message}`);
      }
      
      if (datacenter?.ip_scopes && Array.isArray(datacenter.ip_scopes)) {
        ipRangesToScan = datacenter.ip_scopes.map((scope: any) => {
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
    
    const discoveredServers: EnhancedServerResult[] = [];
    
    // Process each IP range
    for (const currentRange of ipRangesToScan) {
      console.log(`Processing IP range: ${currentRange}`);
      
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
          console.log(`Enhanced discovery for ${currentIp}`);
          
          // Get credentials for this IP
          let credentialsToTry = [];
          
          if (useCredentialProfiles) {
            const { data: profileCredentials, error: credError } = await supabase
              .rpc('get_credentials_for_ip', { target_ip: currentIp });
            
            if (!credError && profileCredentials && profileCredentials.length > 0) {
              credentialsToTry = profileCredentials.map((cred: any) => ({
                username: cred.username,
                password: cred.password_encrypted,
                port: cred.port,
                protocol: cred.protocol,
                name: cred.name
              }));
            }
          }
          
          if (credentialsToTry.length === 0 && credentials) {
            credentialsToTry = [{
              username: credentials.username,
              password: credentials.password,
              port: 443,
              protocol: 'https',
              name: 'Manual'
            }];
          }
          
          if (credentialsToTry.length === 0) {
            console.log(`No credentials available for ${currentIp}`);
            continue;
          }
          
          // Try protocol detection for each credential set
          let successful = false;
          let serverData: EnhancedServerResult | null = null;
          
          for (const cred of credentialsToTry) {
            console.log(`Testing protocols for ${currentIp} with credentials "${cred.name}"`);
            
            // First, basic Redfish connection test
            const redfishUrl = `${cred.protocol}://${currentIp}:${cred.port}/redfish/v1/Systems`;
            const startTime = Date.now();
            
            const response = await fetch(redfishUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${btoa(`${cred.username}:${cred.password}`)}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            }).catch(() => null);
          
            if (response && response.ok) {
              const latency = Date.now() - startTime;
              const systemData = await response.json();
              
              // Get detailed system info
              const systemMembers = systemData.Members || [];
              if (systemMembers.length > 0) {
                const systemUrl = `${cred.protocol}://${currentIp}:${cred.port}${systemMembers[0]['@odata.id']}`;
                const systemResponse = await fetch(systemUrl, {
                  headers: {
                    'Authorization': `Basic ${btoa(`${cred.username}:${cred.password}`)}`,
                    'Content-Type': 'application/json',
                  },
                  signal: AbortSignal.timeout(10000),
                }).catch(() => null);
                
                if (systemResponse && systemResponse.ok) {
                  const systemInfo = await systemResponse.json();
                  
                  // Protocol detection simulation (in real implementation, this would use the protocol manager)
                  const protocols: ProtocolCapability[] = [];
                  
                  if (detectProtocols) {
                    // Redfish is working (we just tested it)
                    protocols.push({
                      protocol: 'REDFISH',
                      supported: true,
                      managerType: 'iDRAC',
                      updateModes: ['Push', 'Pull'],
                      priority: 1,
                      latencyMs: latency,
                      status: 'healthy'
                    });
                    
                    // Test WS-MAN (simplified - in real implementation, use protocol manager)
                    try {
                      const wsmanUrl = `${cred.protocol}://${currentIp}:${cred.port}/wsman`;
                      const wsmanResponse = await fetch(wsmanUrl, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Basic ${btoa(`${cred.username}:${cred.password}`)}`,
                          'Content-Type': 'application/soap+xml',
                        },
                        body: '<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd"><s:Header><wsa:Action s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/enumeration/Enumerate</wsa:Action><wsa:To s:mustUnderstand="true">/wsman</wsa:To><wsman:ResourceURI s:mustUnderstand="true">http://schemas.dell.com/wbem/wscim/1/cim-schema/2/DCIM_SystemView</wsman:ResourceURI><wsa:MessageID s:mustUnderstand="true">uuid:12345678-1234-1234-1234-123456789012</wsa:MessageID><wsa:ReplyTo><wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address></wsa:ReplyTo><wsman:OperationTimeout>60</wsman:OperationTimeout></s:Header><s:Body><wsen:Enumerate xmlns:wsen="http://schemas.xmlsoap.org/ws/2004/09/enumeration" /></s:Body></s:Envelope>',
                        signal: AbortSignal.timeout(5000),
                      }).catch(() => null);
                      
                      if (wsmanResponse && wsmanResponse.ok) {
                        protocols.push({
                          protocol: 'WSMAN',
                          supported: true,
                          managerType: 'iDRAC',
                          updateModes: ['Push'],
                          priority: 2,
                          latencyMs: Date.now() - startTime,
                          status: 'healthy'
                        });
                      }
                    } catch (error) {
                      console.log(`WS-MAN test failed for ${currentIp}: ${error}`);
                    }
                    
                    // Add other protocols as not tested (would be done by protocol manager)
                    protocols.push(
                      {
                        protocol: 'RACADM',
                        supported: false,
                        updateModes: [],
                        priority: 3,
                        status: 'unreachable'
                      },
                      {
                        protocol: 'IPMI',
                        supported: false,
                        updateModes: [],
                        priority: 4,
                        status: 'unreachable'
                      },
                      {
                        protocol: 'SSH',
                        supported: false,
                        updateModes: [],
                        priority: 5,
                        status: 'unreachable'
                      }
                    );
                  }
                  
                  // Get manager info for iDRAC version
                  let idracVersion = '';
                  try {
                    const managersResponse = await fetch(`${cred.protocol}://${currentIp}:${cred.port}/redfish/v1/Managers`, {
                      headers: {
                        'Authorization': `Basic ${btoa(`${cred.username}:${cred.password}`)}`,
                        'Content-Type': 'application/json',
                      },
                      signal: AbortSignal.timeout(10000),
                    });
                    
                    if (managersResponse.ok) {
                      const managersData = await managersResponse.json();
                      if (managersData.Members && managersData.Members.length > 0) {
                        const managerUrl = `${cred.protocol}://${currentIp}:${cred.port}${managersData.Members[0]['@odata.id']}`;
                        const managerResponse = await fetch(managerUrl, {
                          headers: {
                            'Authorization': `Basic ${btoa(`${cred.username}:${cred.password}`)}`,
                            'Content-Type': 'application/json',
                          },
                          signal: AbortSignal.timeout(10000),
                        });
                        
                        if (managerResponse.ok) {
                          const managerInfo = await managerResponse.json();
                          idracVersion = managerInfo.FirmwareVersion || '';
                        }
                      }
                    }
                  } catch (error) {
                    console.log(`Manager info fetch failed for ${currentIp}: ${error}`);
                  }
                  
                  // Firmware compliance check (simplified)
                  let firmwareCompliance = undefined;
                  if (checkFirmware) {
                    const biosVersion = systemInfo.BiosVersion || '';
                    firmwareCompliance = {
                      biosOutdated: biosVersion && biosVersion < '2.15.0', // Example logic
                      idracOutdated: idracVersion && idracVersion < '6.10.30.00',
                      availableUpdates: Math.floor(Math.random() * 5), // Placeholder
                      updateReadiness: 'ready' as const
                    };
                  }
                  
                  // Auto-assign datacenter
                  let datacenterName = null;
                  if (datacenterId) {
                    const { data: datacenter } = await supabase
                      .from('datacenters')
                      .select('name')
                      .eq('id', datacenterId)
                      .single();
                    datacenterName = datacenter?.name;
                  }
                  
                  serverData = {
                    hostname: systemInfo.HostName || `server-${currentIp.replace(/\./g, '-')}`,
                    ip_address: currentIp,
                    model: systemInfo.Model || 'Unknown',
                    service_tag: systemInfo.SKU || '',
                    idrac_version: idracVersion,
                    bios_version: systemInfo.BiosVersion || '',
                    status: systemInfo.PowerState === 'On' ? 'online' : 'offline',
                    protocols: protocols,
                    healthiestProtocol: protocols.find(p => p.supported && p.status === 'healthy'),
                    firmwareCompliance,
                    discoveryMethod: 'enhanced_protocol_detection',
                    lastProtocolCheck: new Date().toISOString(),
                  };
                  
                  console.log(`Enhanced discovery successful for ${currentIp}`);
                  successful = true;
                  break;
                }
              }
            }
          }
          
          if (successful && serverData) {
            discoveredServers.push(serverData);
            console.log(`Enhanced server discovered: ${serverData.hostname} at ${currentIp}`);
          }
        } catch (error) {
          console.log(`Enhanced discovery failed for ${currentIp}: ${error.message}`);
        }
      }
    }
    
    // Insert discovered servers into database with enhanced data
    if (discoveredServers.length > 0) {
      const serversForDb = discoveredServers.map(server => ({
        hostname: server.hostname,
        ip_address: server.ip_address,
        model: server.model,
        service_tag: server.service_tag,
        idrac_version: server.idrac_version,
        bios_version: server.bios_version,
        status: server.status,
        environment: 'production',
        discovery_source: 'enhanced_network_scan',
        last_discovered: new Date().toISOString(),
        // Store protocol info in metadata
        metadata: {
          protocols: server.protocols,
          healthiestProtocol: server.healthiestProtocol,
          firmwareCompliance: server.firmwareCompliance,
          lastProtocolCheck: server.lastProtocolCheck
        }
      }));
      
      const { data, error } = await supabase
        .from('servers')
        .upsert(serversForDb, { 
          onConflict: 'ip_address',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('Error inserting enhanced server data:', error);
        throw error;
      }
      
      console.log(`Successfully discovered and saved ${discoveredServers.length} servers with enhanced data`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        discovered: discoveredServers.length,
        servers: discoveredServers,
        summary: {
          total: discoveredServers.length,
          withProtocols: discoveredServers.filter(s => s.protocols.some(p => p.supported)).length,
          withFirmwareData: discoveredServers.filter(s => s.firmwareCompliance).length,
          readyForUpdates: discoveredServers.filter(s => s.firmwareCompliance?.updateReadiness === 'ready').length
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Enhanced discovery error:', error);
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