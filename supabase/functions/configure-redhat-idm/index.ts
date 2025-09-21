import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced logging function
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

interface IdmConfigRequest {
  realm: string;
  adminUser: string;
  password: string;
  selectedGroups: string[];
  defaultRole: string;
}

serve(async (req) => {
  log('info', 'IDM configuration request received', { method: req.method, url: req.url });
  
  if (req.method === 'OPTIONS') {
    log('info', 'Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    log('info', 'Request body received', { 
      realm: requestBody.realm, 
      adminUser: requestBody.adminUser,
      selectedGroupsCount: requestBody.selectedGroups?.length,
      defaultRole: requestBody.defaultRole
    });
    
    const { realm, adminUser, password, selectedGroups, defaultRole }: IdmConfigRequest = requestBody;

    if (!realm || !adminUser || !password || !selectedGroups?.length || !defaultRole) {
      log('error', 'Missing required fields', { 
        realm: !!realm, 
        adminUser: !!adminUser, 
        password: !!password,
        selectedGroups: !!selectedGroups?.length,
        defaultRole: !!defaultRole
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: realm, adminUser, password, selectedGroups, and defaultRole are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', `Configuring Red Hat IDM for realm: ${realm}`, {
      selectedGroupsCount: selectedGroups.length,
      defaultRole
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      log('error', 'Missing Supabase environment variables');
      throw new Error('Supabase configuration is missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse realm to get domain components
    const domainParts = realm.split('.');
    const baseDn = domainParts.map(part => `dc=${part}`).join(',');
    const serverUrl = `ldaps://${realm}:636`;
    
    // Red Hat IDM standard configuration
    const userSearchBase = `cn=users,cn=accounts,${baseDn}`;
    const groupSearchBase = `cn=groups,cn=accounts,${baseDn}`;
    const bindDn = `uid=${adminUser},cn=users,cn=accounts,${baseDn}`;

    // Create or update LDAP configuration
    const ldapConfig = {
      name: `Red Hat IDM - ${realm}`,
      server_url: serverUrl,
      bind_dn: bindDn,
      bind_password: password, // In production, this should be encrypted
      user_search_base: userSearchBase,
      user_search_filter: '(uid={username})',
      group_search_base: groupSearchBase,
      group_search_filter: '(member={dn})',
      is_active: true
    };

    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('ldap_config')
      .select('id')
      .eq('name', ldapConfig.name)
      .single();

    let configResult;
    if (existingConfig) {
      // Update existing configuration
      configResult = await supabase
        .from('ldap_config')
        .update(ldapConfig)
        .eq('id', existingConfig.id);
    } else {
      // Create new configuration
      configResult = await supabase
        .from('ldap_config')
        .insert(ldapConfig);
    }

    if (configResult.error) {
      throw new Error(`Failed to save LDAP configuration: ${configResult.error.message}`);
    }

    // Update system configuration with IDM settings
    const systemConfigUpdates = [
      {
        key: 'idm_enabled',
        value: { enabled: true, realm, default_role: defaultRole },
        description: 'Red Hat IDM integration settings'
      },
      {
        key: 'idm_groups',
        value: { groups: selectedGroups, realm },
        description: 'Selected IDM groups for access'
      }
    ];

    for (const config of systemConfigUpdates) {
      const { error } = await supabase
        .from('system_config')
        .upsert(config, { onConflict: 'key' });
      
      if (error) {
        console.error(`Failed to update system config for ${config.key}:`, error);
      }
    }

    console.log('Red Hat IDM configuration completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Red Hat IDM configuration completed successfully',
        config: {
          realm,
          groups: selectedGroups.length,
          defaultRole
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('IDM configuration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});