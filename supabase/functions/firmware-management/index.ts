import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RegisterFirmwareRequest {
  name: string;
  version: string;
  firmware_type: 'bios' | 'idrac' | 'nic' | 'raid' | 'storage' | 'other';
  component_name?: string;
  applicable_models?: string[];
  description?: string;
  file_size?: number;
  checksum?: string;
  release_date?: string;
}

interface GetDownloadUrlRequest {
  firmware_package_id: string;
  expires_in?: number; // seconds, default 3600 (1 hour)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop() || url.searchParams.get('action')

    if (req.method === 'POST' && action === 'register') {
      // Register new firmware package
      const firmwareData: RegisterFirmwareRequest = await req.json()
      
      console.log('Registering firmware package:', firmwareData.name)

      // Generate file path for storage
      const sanitizedName = firmwareData.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `firmware/${firmwareData.firmware_type}/${sanitizedName}-${firmwareData.version}`

      // Insert firmware package record
      const { data: firmware, error: insertError } = await supabase
        .from('firmware_packages')
        .insert({
          name: firmwareData.name,
          version: firmwareData.version,
          firmware_type: firmwareData.firmware_type,
          component_name: firmwareData.component_name,
          applicable_models: firmwareData.applicable_models,
          description: firmwareData.description,
          file_size: firmwareData.file_size,
          checksum: firmwareData.checksum,
          release_date: firmwareData.release_date,
          file_path: filePath
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to register firmware: ${insertError.message}`)
      }

      // Generate signed upload URL
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firmware-files')
        .createSignedUploadUrl(filePath)

      if (uploadError) {
        // Clean up the database record if upload URL creation failed
        await supabase
          .from('firmware_packages')
          .delete()
          .eq('id', firmware.id)
        
        throw new Error(`Failed to create upload URL: ${uploadError.message}`)
      }

      console.log(`Created firmware package ${firmware.id} with upload URL`)

      return new Response(JSON.stringify({
        success: true,
        firmware_package: firmware,
        upload_url: uploadData.signedUrl,
        upload_token: uploadData.token,
        upload_path: filePath
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (req.method === 'POST' && action === 'get-download-url') {
      // Get signed download URL for firmware package
      const { firmware_package_id, expires_in = 3600 }: GetDownloadUrlRequest = await req.json()
      
      console.log('Generating download URL for firmware:', firmware_package_id)

      // Get firmware package info
      const { data: firmware, error: fetchError } = await supabase
        .from('firmware_packages')
        .select('*')
        .eq('id', firmware_package_id)
        .single()

      if (fetchError || !firmware) {
        throw new Error(`Firmware package not found: ${fetchError?.message}`)
      }

      if (!firmware.file_path) {
        throw new Error('No file associated with this firmware package')
      }

      // Generate signed download URL
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('firmware-files')
        .createSignedUrl(firmware.file_path, expires_in)

      if (downloadError) {
        throw new Error(`Failed to create download URL: ${downloadError.message}`)
      }

      console.log(`Generated download URL for ${firmware.name} (expires in ${expires_in}s)`)

      return new Response(JSON.stringify({
        success: true,
        firmware_package: firmware,
        download_url: downloadData.signedUrl,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (req.method === 'GET' && action === 'list') {
      // List all firmware packages with optional filtering
      const firmware_type = url.searchParams.get('firmware_type')
      const applicable_model = url.searchParams.get('applicable_model')
      
      let query = supabase
        .from('firmware_packages')
        .select('*')
        .order('created_at', { ascending: false })

      if (firmware_type) {
        query = query.eq('firmware_type', firmware_type)
      }

      if (applicable_model) {
        query = query.contains('applicable_models', [applicable_model])
      }

      const { data: packages, error: listError } = await query

      if (listError) {
        throw new Error(`Failed to list firmware packages: ${listError.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        packages: packages || [],
        count: packages?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (req.method === 'POST' && action === 'check-compatibility') {
      // Check firmware compatibility for servers
      const { server_ids, firmware_package_id } = await req.json()
      
      // Get firmware package
      const { data: firmware, error: firmwareError } = await supabase
        .from('firmware_packages')
        .select('*')
        .eq('id', firmware_package_id)
        .single()

      if (firmwareError || !firmware) {
        throw new Error(`Firmware package not found: ${firmwareError?.message}`)
      }

      // Get servers
      const { data: servers, error: serversError } = await supabase
        .from('servers')
        .select('*')
        .in('id', server_ids)

      if (serversError) {
        throw new Error(`Failed to fetch servers: ${serversError.message}`)
      }

      // Check compatibility
      const compatibilityResults = servers?.map(server => {
        let compatible = true
        let reasons: string[] = []

        // Check model compatibility
        if (firmware.applicable_models && firmware.applicable_models.length > 0) {
          if (!server.model || !firmware.applicable_models.includes(server.model)) {
            compatible = false
            reasons.push(`Model ${server.model} not in applicable models: ${firmware.applicable_models.join(', ')}`)
          }
        }

        // Additional compatibility checks can be added here
        // e.g., BIOS version requirements, OS compatibility, etc.

        return {
          server_id: server.id,
          hostname: server.hostname,
          model: server.model,
          compatible,
          reasons
        }
      }) || []

      return new Response(JSON.stringify({
        success: true,
        firmware_package: firmware,
        compatibility_results: compatibilityResults,
        compatible_count: compatibilityResults.filter(r => r.compatible).length,
        total_servers: compatibilityResults.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action. Supported actions: register, get-download-url, list, check-compatibility'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

  } catch (error) {
    console.error('Error in firmware management:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})