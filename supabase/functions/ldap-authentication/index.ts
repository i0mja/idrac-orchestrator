// Enhanced: LDAP/IDM integration for enterprise authentication
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LDAPAuthRequest {
  username: string;
  password: string;
  domain?: string;
}

interface LDAPUserInfo {
  username: string;
  email: string;
  displayName: string;
  groups: string[];
  department?: string;
  site?: string;
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

    const { username, password, domain }: LDAPAuthRequest = await req.json();

    console.log(`Enhanced: LDAP authentication attempt for ${username}@${domain || 'default'}`);

    // Enhanced: LDAP server configuration (would be from environment/settings)
    const ldapConfig = {
      server: Deno.env.get('LDAP_SERVER') || 'ldap://idm.company.com',
      baseDN: Deno.env.get('LDAP_BASE_DN') || 'dc=company,dc=com',
      userDN: Deno.env.get('LDAP_USER_DN') || 'ou=users,dc=company,dc=com',
      groupDN: Deno.env.get('LDAP_GROUP_DN') || 'ou=groups,dc=company,dc=com',
    };

    // Enhanced: Simulate LDAP authentication (replace with actual LDAP library)
    const ldapUser = await authenticateWithLDAP(username, password, ldapConfig);
    
    if (!ldapUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Enhanced: Map LDAP groups to application roles
    const appRole = mapLDAPGroupsToRole(ldapUser.groups);
    
    // Enhanced: Check/create user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', ldapUser.username)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // Enhanced: Create or update user profile
    const profileData = {
      username: ldapUser.username,
      email: ldapUser.email,
      display_name: ldapUser.displayName,
      role: appRole,
      department: ldapUser.department,
      site: ldapUser.site,
      last_login: new Date().toISOString(),
      ldap_groups: ldapUser.groups,
      is_active: true
    };

    if (profile) {
      // Enhanced: Update existing profile
      await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', profile.id);
    } else {
      // Enhanced: Create new profile
      await supabase
        .from('profiles')
        .insert(profileData);
    }

    // Enhanced: Generate session token (simplified - use proper JWT in production)
    const sessionToken = await generateSessionToken(ldapUser, appRole);

    console.log(`Enhanced: LDAP authentication successful for ${username} with role ${appRole}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          username: ldapUser.username,
          email: ldapUser.email,
          displayName: ldapUser.displayName,
          role: appRole,
          department: ldapUser.department,
          site: ldapUser.site
        },
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Enhanced: LDAP authentication error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'LDAP authentication failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Enhanced: LDAP authentication simulation (replace with actual LDAP library)
async function authenticateWithLDAP(username: string, password: string, config: any): Promise<LDAPUserInfo | null> {
  // Enhanced: In production, use actual LDAP library like ldapjs
  // This is a simulation for demonstration
  
  console.log(`Enhanced: Connecting to LDAP server ${config.server}`);
  
  // Enhanced: Simulate LDAP search and bind
  const simulatedUsers = {
    'admin': {
      username: 'admin',
      email: 'admin@company.com',
      displayName: 'System Administrator',
      groups: ['Domain Admins', 'Dell-Server-Admins', 'IT-Operations'],
      department: 'IT Operations',
      site: 'DC-East-01'
    },
    'operator': {
      username: 'operator',
      email: 'operator@company.com', 
      displayName: 'Operations Manager',
      groups: ['Dell-Server-Operators', 'IT-Operations'],
      department: 'IT Operations',
      site: 'DC-West-01'
    },
    'viewer': {
      username: 'viewer',
      email: 'viewer@company.com',
      displayName: 'Read-Only User',
      groups: ['Dell-Server-Viewers'],
      department: 'IT Support',
      site: 'DC-Europe-01'
    }
  };

  // Enhanced: Simulate password validation
  if (password === 'password123' && simulatedUsers[username]) {
    return simulatedUsers[username];
  }

  return null;
}

// Enhanced: Map LDAP groups to application roles
function mapLDAPGroupsToRole(groups: string[]): string {
  // Enhanced: Role mapping based on AD/LDAP groups
  if (groups.includes('Domain Admins') || groups.includes('Dell-Server-Admins')) {
    return 'admin';
  }
  
  if (groups.includes('Dell-Server-Operators') || groups.includes('IT-Operations')) {
    return 'operator';
  }
  
  if (groups.includes('Dell-Server-Viewers')) {
    return 'viewer';
  }
  
  // Enhanced: Default to viewer for unknown groups
  return 'viewer';
}

// Enhanced: Generate session token
async function generateSessionToken(user: LDAPUserInfo, role: string): Promise<string> {
  // Enhanced: In production, use proper JWT signing
  const tokenData = {
    username: user.username,
    role: role,
    site: user.site,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 hours
  };
  
  // Enhanced: Simple base64 encoding for demo (use proper JWT in production)
  return btoa(JSON.stringify(tokenData));
}