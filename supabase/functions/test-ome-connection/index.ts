import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing OME connection...');
    
    const { connection_id } = await req.json();
    
    if (!connection_id) {
      throw new Error('Connection ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection details with credential profile
    const { data: connection, error: connError } = await supabase
      .from('ome_connections')
      .select(`
        *,
        credential_profile:credential_profiles(
          username,
          password_encrypted,
          port,
          protocol
        )
      `)
      .eq('id', connection_id)
      .single();

    if (connError) {
      console.error('Error fetching connection:', connError);
      throw new Error('Connection not found');
    }

    console.log(`Testing connection to ${connection.hostname}:${connection.port}`);

    // Build the base URL
    const protocol = connection.use_ssl ? 'https' : 'http';
    const baseUrl = `${protocol}://${connection.hostname}:${connection.port}`;
    
    // Test basic connectivity to OME API
    const healthUrl = `${baseUrl}/api/ApplicationService/Version`;
    
    // Create basic auth header
    const credentials = connection.credential_profile;
    const auth = btoa(`${credentials.username}:${credentials.password_encrypted}`);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      // Set timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const versionData = await response.json();
    console.log('OME Version:', versionData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Connection successful',
        version: versionData,
        tested_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('OME connection test failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Connection test failed',
        tested_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to avoid triggering error handlers
      }
    );
  }
});