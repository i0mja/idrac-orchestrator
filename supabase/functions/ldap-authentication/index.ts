import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LDAPAuthRequest {
  username: string;
  password: string;
  domain?: string;
}

interface LDAPUserInfo {
  dn: string;
  uid: string;
  email: string;
  displayName: string;
  groups: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password, domain }: LDAPAuthRequest = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Attempting LDAP authentication for user: ${username}`);

    // Authenticate with LDAP
    const userInfo = await authenticateWithLDAP(username, password);
    
    if (!userInfo) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`LDAP authentication successful for: ${userInfo.uid}`);

    // Map LDAP groups to application role
    const role = mapLDAPGroupsToRole(userInfo.groups);

    // Create Supabase Auth user if doesn't exist
    let authUser;
    try {
      // Try to get existing user by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      authUser = existingUsers.users.find(u => u.email === userInfo.email);

      if (!authUser) {
        // Create new auth user
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: userInfo.email,
          user_metadata: {
            username: userInfo.uid,
            full_name: userInfo.displayName,
            ldap_dn: userInfo.dn,
            ldap_groups: userInfo.groups
          },
          email_confirm: true
        });

        if (createError) {
          throw new Error(`Failed to create auth user: ${createError.message}`);
        }
        authUser = createData.user;
      }
    } catch (authError) {
      console.error('Supabase Auth error:', authError);
      throw new Error('Failed to create/update authentication');
    }

    if (!authUser) {
      throw new Error('Failed to create or retrieve auth user');
    }

    // Create or update user profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    let profile;
    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          username: userInfo.uid,
          email: userInfo.email,
          full_name: userInfo.displayName,
          role: role,
          last_login: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error('Failed to update user profile');
      }
      profile = updatedProfile;
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.id,
          username: userInfo.uid,
          email: userInfo.email,
          full_name: userInfo.displayName,
          role: role,
          is_active: true,
          last_login: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        throw new Error('Failed to create user profile');
      }
      profile = newProfile;
    }

    // Generate access token for the user
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userInfo.email
    });

    if (tokenError) {
      throw new Error(`Failed to generate token: ${tokenError.message}`);
    }

    console.log(`User profile updated/created for: ${profile.username}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.id,
          username: profile.username,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          groups: userInfo.groups
        },
        access_token: tokenData.properties?.access_token,
        refresh_token: tokenData.properties?.refresh_token
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('LDAP authentication error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function authenticateWithLDAP(username: string, password: string): Promise<LDAPUserInfo | null> {
  // This is a MOCK implementation for development/testing
  // SECURITY WARNING: This should be replaced with actual LDAP authentication in production
  console.warn('Using mock LDAP authentication - replace with real LDAP in production');
  
  // In production, you would:
  // 1. Connect to your LDAP server using credentials from Supabase secrets:
  //    - LDAP_URL (e.g., ldap://idm.example.com:389)
  //    - LDAP_BIND_DN (service account DN)
  //    - LDAP_BIND_PASSWORD (service account password)
  // 2. Bind with the service account
  // 3. Search for the user in the directory
  // 4. Attempt to bind as the user to verify their password
  // 5. Retrieve user attributes and group memberships
  
  // Example production implementation:
  // const ldapClient = new LDAPClient({
  //   url: Deno.env.get('LDAP_URL'),
  //   bindDN: Deno.env.get('LDAP_BIND_DN'),
  //   bindPassword: Deno.env.get('LDAP_BIND_PASSWORD'),
  // });
  // const userEntry = await ldapClient.search(`uid=${username},cn=users,cn=accounts,dc=example,dc=com`);
  // const isValid = await ldapClient.bind(userEntry.dn, password);
  // return isValid ? mapLDAPUserToProfile(userEntry) : null;
  
  console.log(`LDAP authentication not configured for: ${username}`);
  return null; // Authentication disabled - configure LDAP credentials in Supabase secrets
}


function mapLDAPGroupsToRole(groups: string[]): string {
  if (groups.includes('admins')) {
    return 'admin';
  } else if (groups.includes('operators')) {
    return 'operator';
  } else if (groups.includes('viewers')) {
    return 'viewer';
  }
  return 'viewer'; // Default role
}