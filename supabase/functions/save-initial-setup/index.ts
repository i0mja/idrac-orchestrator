// Edge function: save-initial-setup
// Persists initial setup configuration using the service role to bypass client-side RLS/auth issues
// Works reliably in builder, preview, production, and air-gapped/on-prem setups where client auth may not be available yet.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { config } = await req.json();

    if (!config || typeof config !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: expected { config: CompletedSetupConfig }' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing server configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const payload = {
      key: 'initial_setup',
      value: config as any,
      description: 'Initial system setup configuration'
    };

    const { error } = await admin.from('system_config').upsert(payload);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
