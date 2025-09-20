import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OMETestResult {
  success: boolean;
  message: string;
  error_type?: 'network' | 'ssl' | 'auth' | 'api' | 'timeout';
  error_details?: string;
  version?: any;
  session_info?: any;
  endpoints_tested: string[];
  tested_at: string;
}

async function testOMEConnection(connection: any, credentials: any): Promise<OMETestResult> {
  const protocol = connection.use_ssl ? 'https' : 'http';
  const baseUrl = `${protocol}://${connection.hostname}:${connection.port}`;
  const endpointsTested: string[] = [];
  
  console.log(`Testing OME connection to ${baseUrl}`);
  console.log(`SSL enabled: ${connection.use_ssl}, Skip SSL verification: ${connection.skip_ssl_verification}`);

  // Create fetch options with proper error handling
  const createFetchOptions = (method: string = 'GET', body?: any) => {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return options;
  };

  // Test 1: Try session-based authentication (proper OME auth flow)
  try {
    const sessionUrl = `${baseUrl}/api/SessionService/Sessions`;
    endpointsTested.push(sessionUrl);
    
    console.log('Testing session authentication...');
    
    const sessionResponse = await fetch(sessionUrl, createFetchOptions('POST', {
      UserName: credentials.username,
      Password: credentials.password_encrypted,
      SessionType: 'API'
    }));

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('Session created successfully:', sessionData);
      
      // Test with session token
      const token = sessionData.Token || sessionData['X-Auth-Token'];
      if (token) {
        const versionUrl = `${baseUrl}/api/ApplicationService/Version`;
        endpointsTested.push(versionUrl);
        
        const versionResponse = await fetch(versionUrl, {
          ...createFetchOptions(),
          headers: {
            ...createFetchOptions().headers,
            'X-Auth-Token': token,
          },
        });

        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          console.log('Version data retrieved:', versionData);
          
          // Clean up session
          try {
            await fetch(`${sessionUrl}('${sessionData.Id}')`, {
              ...createFetchOptions('DELETE'),
              headers: {
                ...createFetchOptions().headers,
                'X-Auth-Token': token,
              },
            });
          } catch (e) {
            console.log('Session cleanup failed (non-critical):', e.message);
          }

          return {
            success: true,
            message: 'OME connection successful - Session authentication verified',
            version: versionData,
            session_info: {
              session_type: 'API',
              token_received: true,
              cleanup_attempted: true
            },
            endpoints_tested: endpointsTested,
            tested_at: new Date().toISOString(),
          };
        }
      }
    }
  } catch (error) {
    console.log('Session authentication failed:', error.message);
    
    // Analyze the error type
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        success: false,
        message: 'Connection timeout - OME server did not respond within 15 seconds',
        error_type: 'timeout',
        error_details: `Failed to connect to ${baseUrl} - check if OME is running and accessible`,
        endpoints_tested: endpointsTested,
        tested_at: new Date().toISOString(),
      };
    }
    
    if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
      return {
        success: false,
        message: 'SSL/TLS Certificate error',
        error_type: 'ssl',
        error_details: error.message.includes('Expired') 
          ? 'SSL certificate has expired - consider enabling "Skip SSL Verification" option'
          : 'SSL certificate validation failed - check certificate or enable "Skip SSL Verification"',
        endpoints_tested: endpointsTested,
        tested_at: new Date().toISOString(),
      };
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return {
        success: false,
        message: 'Network connection failed',
        error_type: 'network',
        error_details: `Cannot reach ${connection.hostname}:${connection.port} - check hostname, port, and network connectivity`,
        endpoints_tested: endpointsTested,
        tested_at: new Date().toISOString(),
      };
    }
  }

  // Test 2: Fallback to basic auth with version endpoint
  try {
    const versionUrl = `${baseUrl}/api/ApplicationService/Version`;
    endpointsTested.push(versionUrl);
    
    console.log('Testing basic authentication fallback...');
    
    const auth = btoa(`${credentials.username}:${credentials.password_encrypted}`);
    const response = await fetch(versionUrl, {
      ...createFetchOptions(),
      headers: {
        ...createFetchOptions().headers,
        'Authorization': `Basic ${auth}`,
      },
    });

    if (response.ok) {
      const versionData = await response.json();
      console.log('Basic auth successful:', versionData);
      
      return {
        success: true,
        message: 'OME connection successful - Basic authentication verified',
        version: versionData,
        endpoints_tested: endpointsTested,
        tested_at: new Date().toISOString(),
      };
    } else {
      // Analyze HTTP status codes
      if (response.status === 401) {
        return {
          success: false,
          message: 'Authentication failed',
          error_type: 'auth',
          error_details: `Invalid credentials for user '${credentials.username}' - check username and password`,
          endpoints_tested: endpointsTested,
          tested_at: new Date().toISOString(),
        };
      } else if (response.status === 403) {
        return {
          success: false,
          message: 'Access forbidden',
          error_type: 'auth',
          error_details: `User '${credentials.username}' does not have sufficient privileges for API access`,
          endpoints_tested: endpointsTested,
          tested_at: new Date().toISOString(),
        };
      } else if (response.status === 404) {
        return {
          success: false,
          message: 'API endpoint not found',
          error_type: 'api',
          error_details: 'This may not be a valid OME server or the API version is different',
          endpoints_tested: endpointsTested,
          tested_at: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          error_type: 'api',
          error_details: `Server returned unexpected status code ${response.status}`,
          endpoints_tested: endpointsTested,
          tested_at: new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.log('Basic auth fallback failed:', error.message);
    
    return {
      success: false,
      message: 'All connection methods failed',
      error_type: 'network',
      error_details: `Final attempt failed: ${error.message}`,
      endpoints_tested: endpointsTested,
      tested_at: new Date().toISOString(),
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== OME Connection Test Started ===');
    
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
      throw new Error('Connection configuration not found');
    }

    if (!connection.credential_profile) {
      throw new Error('No credential profile associated with this connection');
    }

    // Perform comprehensive connection test
    const testResult = await testOMEConnection(connection, connection.credential_profile);
    
    console.log('=== OME Connection Test Result ===');
    console.log(`Success: ${testResult.success}`);
    console.log(`Message: ${testResult.message}`);
    if (testResult.error_type) {
      console.log(`Error Type: ${testResult.error_type}`);
      console.log(`Error Details: ${testResult.error_details}`);
    }
    console.log(`Endpoints Tested: ${testResult.endpoints_tested.join(', ')}`);

    return new Response(
      JSON.stringify(testResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('=== OME Connection Test Error ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Connection test failed',
        error_type: 'api',
        error_details: error.message || 'Unknown error occurred',
        endpoints_tested: [],
        tested_at: new Date().toISOString(),
      } as OMETestResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});