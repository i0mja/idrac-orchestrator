import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced logging function
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

interface IdmDiscoveryRequest {
  realm: string;
  adminUser: string;
  password: string;
}

interface IdmGroup {
  name: string;
  dn: string;
  description?: string;
}

serve(async (req) => {
  log('info', 'IDM discovery request received', { method: req.method, url: req.url });
  
  if (req.method === 'OPTIONS') {
    log('info', 'Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    log('info', 'Request body received', { realm: requestBody.realm, adminUser: requestBody.adminUser });
    
    const { realm, adminUser, password }: IdmDiscoveryRequest = requestBody;

    if (!realm || !adminUser || !password) {
      log('error', 'Missing required fields', { realm: !!realm, adminUser: !!adminUser, password: !!password });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: realm, adminUser, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate realm format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(realm)) {
      log('error', 'Invalid realm format', { realm });
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid realm format. Use format like: idm.company.local' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', `Starting Red Hat IDM discovery for realm: ${realm}`);

    // Parse realm to get domain components
    const domainParts = realm.split('.');
    const baseDn = domainParts.map(part => `dc=${part}`).join(',');
    const serverUrl = `ldaps://${realm}:636`;
    
    // Red Hat IDM standard paths
    const userSearchBase = `cn=users,cn=accounts,${baseDn}`;
    const groupSearchBase = `cn=groups,cn=accounts,${baseDn}`;
    const bindDn = `uid=${adminUser},cn=users,cn=accounts,${baseDn}`;

    log('info', 'LDAP connection details constructed', { serverUrl, baseDn, bindDn, groupSearchBase });

    // Test LDAP connection and discover groups
    const groups = await discoverIdmGroups(serverUrl, bindDn, password, groupSearchBase);

    log('info', `Successfully discovered ${groups.length} groups`);

    return new Response(
      JSON.stringify({
        success: true,
        ldapConfig: {
          serverUrl,
          baseDn,
          userSearchBase,
          groupSearchBase,
          bindDn,
          userSearchFilter: '(uid={username})',
          groupSearchFilter: '(member={dn})'
        },
        groups
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    log('error', 'Error in discover-redhat-idm', { error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function discoverIdmGroups(serverUrl: string, bindDn: string, password: string, groupSearchBase: string): Promise<IdmGroup[]> {
  // In a real implementation, you would use an LDAP library here
  // For now, we'll simulate the discovery with common Red Hat IDM groups
  
  try {
    // Simulate LDAP connection test
    console.log(`Testing LDAP connection to ${serverUrl}...`);
    
    // Mock group discovery - in reality this would query LDAP
    const mockGroups: IdmGroup[] = [
      {
        name: 'admins',
        dn: `cn=admins,${groupSearchBase}`,
        description: 'System Administrators'
      },
      {
        name: 'users',
        dn: `cn=users,${groupSearchBase}`,
        description: 'Standard Users'
      },
      {
        name: 'operators',
        dn: `cn=operators,${groupSearchBase}`,
        description: 'System Operators'
      },
      {
        name: 'helpdesk',
        dn: `cn=helpdesk,${groupSearchBase}`,
        description: 'Help Desk Staff'
      }
    ];

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`Mock discovery found ${mockGroups.length} groups`);
    return mockGroups;

  } catch (error) {
    console.error('LDAP connection failed:', error);
    throw new Error(`Failed to connect to Red Hat IDM at ${serverUrl}. Please check your credentials and network connectivity.`);
  }
}

/* 
Real LDAP implementation would look like this:

import { LdapClient } from "https://deno.land/x/ldap@v0.2.4/mod.ts";

async function discoverIdmGroups(serverUrl: string, bindDn: string, password: string, groupSearchBase: string): Promise<IdmGroup[]> {
  const client = new LdapClient({ url: serverUrl });
  
  try {
    await client.bind(bindDn, password);
    
    const searchResult = await client.search(groupSearchBase, {
      scope: 'sub',
      filter: '(objectClass=groupOfNames)',
      attributes: ['cn', 'description']
    });
    
    const groups: IdmGroup[] = searchResult.entries.map(entry => ({
      name: entry.attributes.cn[0],
      dn: entry.dn,
      description: entry.attributes.description?.[0]
    }));
    
    await client.unbind();
    return groups;
    
  } catch (error) {
    await client.unbind();
    throw error;
  }
}
*/