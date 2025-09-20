import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCredentialsRequest {
  credentialProfileId: string;
  targetIp: string;
}

interface TestResult {
  success: boolean;
  protocol?: string;
  responseTime?: number;
  message?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { credentialProfileId, targetIp }: TestCredentialsRequest = await req.json();

    console.log(`Testing credentials for profile ${credentialProfileId} against ${targetIp}`);

    // Get credential profile with decrypted password
    const { data: credentials, error: credError } = await supabaseClient
      .rpc('get_decrypted_credentials_for_ip', { target_ip: targetIp })
      .eq('credential_profile_id', credentialProfileId)
      .single();

    if (credError || !credentials) {
      throw new Error('Credential profile not found');
    }

    const testResults: TestResult[] = [];
    const protocols = ['https', 'http'];
    const ports = [443, 623, 5985, 5986, 22];

    // Test different protocol combinations
    for (const protocol of protocols) {
      for (const port of ports) {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          // Build the test URL
          const testUrl = `${protocol}://${targetIp}:${port}`;
          
          let testEndpoint = '';
          if (port === 443 || port === 80) {
            // Try iDRAC/Redfish endpoints
            testEndpoint = `${testUrl}/redfish/v1/`;
          } else if (port === 623) {
            // IPMI port - we can't test HTTP here, but we can try to connect
            continue; // Skip HTTP test for IPMI
          } else if (port === 5985 || port === 5986) {
            // WSMAN endpoints
            testEndpoint = `${testUrl}/wsman`;
          } else if (port === 22) {
            // SSH - we can't test HTTP here
            continue; // Skip HTTP test for SSH
          }

          try {
            const response = await fetch(testEndpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password_decrypted}`)}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            // Consider it successful if we get any response (even 401/403 means the service is there)
            if (response.status < 500) {
              testResults.push({
                success: true,
                protocol: `${protocol.toUpperCase()}:${port}`,
                responseTime,
                message: `Connected via ${protocol.toUpperCase()} on port ${port}`,
              });

              // Store test result in database
              await supabaseClient
                .from('credential_test_results')
                .insert({
                  credential_profile_id: credentialProfileId,
                  ip_address: targetIp,
                  protocol: `${protocol.toUpperCase()}:${port}`,
                  success: true,
                  response_time_ms: responseTime,
                });

              // Return first successful result
              return new Response(
                JSON.stringify(testResults[0]),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                }
              );
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            console.log(`Failed to connect via ${protocol}:${port} - ${fetchError.message}`);
          }
        } catch (error) {
          console.error(`Error testing ${protocol}:${port}:`, error);
        }
      }
    }

    // If no successful connections, return failure
    const failureResult: TestResult = {
      success: false,
      message: 'Could not establish connection with any protocol',
      error: 'All connection attempts failed',
    };

    // Store failure result
    await supabaseClient
      .from('credential_test_results')
      .insert({
        credential_profile_id: credentialProfileId,
        ip_address: targetIp,
        protocol: 'ALL',
        success: false,
        error_message: failureResult.error,
      });

    return new Response(
      JSON.stringify(failureResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Credential test error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to test credentials'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});