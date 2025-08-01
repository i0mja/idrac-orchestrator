import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hostname, username, password, port = 443, ignore_ssl = true } = await req.json();

    console.log('Testing vCenter connection:', { hostname, username, port, ignore_ssl });

    if (!hostname || !username || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: hostname, username, and password are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean hostname (remove protocols, trailing slashes)
    const cleanHostname = hostname.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const vcenterUrl = `https://${cleanHostname}:${port}`;

    // Check if this appears to be a local/private network address
    const isPrivateNetwork = 
      cleanHostname.includes('.local') || 
      cleanHostname.includes('.grp') || 
      cleanHostname.includes('.corp') || 
      cleanHostname.includes('.internal') ||
      cleanHostname.startsWith('192.168.') ||
      cleanHostname.startsWith('10.') ||
      cleanHostname.startsWith('172.') ||
      !cleanHostname.includes('.');

    if (isPrivateNetwork) {
      console.log('Detected private/local network vCenter');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot test connection to private/local vCenter from cloud. Your vCenter appears to be on a private network that our servers cannot reach. If this is correct, you can still save the configuration - it will be tested when actually used.',
          isPrivateNetwork: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Attempting to connect to vCenter at: ${vcenterUrl}`);

    // Test connection by trying to access the vCenter API
    const testUrl = `${vcenterUrl}/api/session`;
    
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
    };

    // Add SSL ignore if specified
    if (ignore_ssl) {
      // Note: In production, this should be configurable and logged as a security warning
      console.log('WARNING: SSL certificate verification is disabled');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(testUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`vCenter API response status: ${response.status}`);

      if (response.status === 201 || response.status === 200) {
        // Try to get vCenter version info
        let version = 'Unknown';
        try {
          const versionUrl = `${vcenterUrl}/api/appliance/system/version`;
          const versionResponse = await fetch(versionUrl, {
            headers: {
              'vmware-api-session-id': response.headers.get('vmware-api-session-id') || '',
            },
          });
          
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            version = versionData.version || 'Unknown';
          }
        } catch (versionError) {
          console.log('Could not retrieve version info:', versionError);
        }

        console.log('vCenter connection successful');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Successfully connected to vCenter',
            version,
            hostname: cleanHostname,
            port
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else if (response.status === 401) {
        console.log('vCenter authentication failed');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed. Please check your username and password.' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else if (response.status === 404) {
        console.log('vCenter API endpoint not found');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'vCenter API not found. Please verify the hostname and port are correct.' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log(`vCenter responded with status: ${response.status}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `vCenter returned status ${response.status}. Please check your configuration.` 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.log('vCenter connection timed out');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Connection timed out. Please check the hostname and network connectivity.' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('vCenter connection error:', fetchError);
      
      // Parse common connection errors
      const errorMessage = fetchError.message.toLowerCase();
      let userFriendlyError = 'Failed to connect to vCenter.';
      
      if (errorMessage.includes('network') || errorMessage.includes('dns')) {
        userFriendlyError = 'Network error. Please check the hostname and network connectivity.';
      } else if (errorMessage.includes('ssl') || errorMessage.includes('certificate')) {
        userFriendlyError = 'SSL certificate error. Try enabling "Ignore SSL certificate errors".';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyError = 'Connection timed out. Please check the hostname and port.';
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userFriendlyError 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in test-vcenter-connection function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error while testing connection' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});