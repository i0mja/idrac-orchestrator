import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FirmwareUploadRequest {
  fileName: string
  fileSize: number
  firmwareType: string
  componentName?: string
  version?: string
  applicableModels?: string[]
  description?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'initiate-upload':
        return await initiateUpload(supabase, await req.json())
      
      case 'complete-upload':
        const uploadId = url.searchParams.get('uploadId')
        const checksum = url.searchParams.get('checksum')
        return await completeUpload(supabase, uploadId!, checksum!)
      
      case 'validate-firmware':
        const filePath = url.searchParams.get('filePath')
        return await validateFirmware(supabase, filePath!)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Firmware upload error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function initiateUpload(supabase: any, uploadRequest: FirmwareUploadRequest) {
  console.log('Initiating firmware upload:', uploadRequest)

  const { fileName, fileSize, firmwareType, componentName, version, applicableModels, description } = uploadRequest

  // Validate file size (max 2GB for firmware files)
  const maxFileSize = 2 * 1024 * 1024 * 1024 // 2GB
  if (fileSize > maxFileSize) {
    throw new Error(`File size exceeds maximum allowed size of ${maxFileSize / (1024 * 1024 * 1024)}GB`)
  }

  // Validate file extension
  const allowedExtensions = ['.exe', '.bin', '.img', '.fw', '.rom', '.zip']
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  
  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error(`File type ${fileExtension} not allowed. Supported types: ${allowedExtensions.join(', ')}`)
  }

  // Generate unique file path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const uniqueFileName = `${timestamp}_${sanitizedFileName}`
  const filePath = `firmware/${firmwareType}/${uniqueFileName}`

  // Create signed upload URL
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('firmware-files')
    .createSignedUploadUrl(filePath)

  if (uploadError) {
    throw new Error(`Failed to create upload URL: ${uploadError.message}`)
  }

  // Create firmware package record
  const { data: packageRecord, error: packageError } = await supabase
    .from('firmware_packages')
    .insert({
      name: fileName,
      version: version || 'unknown',
      firmware_type: firmwareType,
      component_name: componentName,
      file_path: filePath,
      file_size: fileSize,
      applicable_models: applicableModels || [],
      description: description
    })
    .select()
    .single()

  if (packageError) {
    throw new Error(`Failed to create firmware package record: ${packageError.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      uploadUrl: uploadData.signedUrl,
      uploadId: packageRecord.id,
      filePath: filePath,
      message: 'Upload URL generated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function completeUpload(supabase: any, uploadId: string, checksum: string) {
  console.log(`Completing upload for package: ${uploadId}`)

  // Verify the file was uploaded
  const { data: packageData, error: packageError } = await supabase
    .from('firmware_packages')
    .select('*')
    .eq('id', uploadId)
    .single()

  if (packageError || !packageData) {
    throw new Error(`Firmware package not found: ${packageError?.message}`)
  }

  // Check if file exists in storage
  const { data: fileExists, error: fileError } = await supabase.storage
    .from('firmware-files')
    .list(packageData.file_path.substring(0, packageData.file_path.lastIndexOf('/')), {
      search: packageData.file_path.substring(packageData.file_path.lastIndexOf('/') + 1)
    })

  if (fileError || !fileExists || fileExists.length === 0) {
    throw new Error('Upload verification failed: File not found in storage')
  }

  // Update package record with checksum and completion status
  const { error: updateError } = await supabase
    .from('firmware_packages')
    .update({
      checksum: checksum,
      updated_at: new Date().toISOString()
    })
    .eq('id', uploadId)

  if (updateError) {
    throw new Error(`Failed to update firmware package: ${updateError.message}`)
  }

  // Trigger validation process
  validateFirmware(supabase, packageData.file_path).catch(error => {
    console.error('Background validation failed:', error)
  })

  return new Response(
    JSON.stringify({
      success: true,
      packageId: uploadId,
      message: 'Upload completed successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function validateFirmware(supabase: any, filePath: string) {
  console.log(`Validating firmware file: ${filePath}`)

  try {
    // Get file metadata from storage
    const { data: fileInfo, error: fileError } = await supabase.storage
      .from('firmware-files')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      })

    if (fileError || !fileInfo || fileInfo.length === 0) {
      throw new Error('File not found for validation')
    }

    const file = fileInfo[0]
    
    // Basic validation checks
    const validationResults = {
      fileExists: true,
      fileSize: file.metadata?.size || 0,
      validSize: (file.metadata?.size || 0) > 0 && (file.metadata?.size || 0) < 2 * 1024 * 1024 * 1024,
      contentType: file.metadata?.mimetype,
      lastModified: file.metadata?.lastModified
    }

    // Additional validation based on file type
    let firmwareTypeValidation = true
    const fileName = filePath.toLowerCase()
    
    if (fileName.endsWith('.exe')) {
      // Windows executable validation
      firmwareTypeValidation = file.metadata?.size > 1000 // Minimum size check
    } else if (fileName.endsWith('.bin') || fileName.endsWith('.img')) {
      // Binary firmware validation
      firmwareTypeValidation = file.metadata?.size > 100 // Minimum size check
    }

    const isValid = validationResults.fileExists && 
                   validationResults.validSize && 
                   firmwareTypeValidation

    // Log validation results
    await supabase
      .from('system_events')
      .insert({
        event_type: 'firmware_validation',
        severity: isValid ? 'info' : 'warning',
        title: `Firmware validation ${isValid ? 'passed' : 'failed'}`,
        description: `Validation results for ${filePath}: ${JSON.stringify(validationResults)}`,
        metadata: {
          filePath,
          validationResults,
          isValid
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        isValid,
        validationResults,
        message: `Firmware validation ${isValid ? 'passed' : 'failed'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Firmware validation error:', error)
    
    // Log validation error
    await supabase
      .from('system_events')
      .insert({
        event_type: 'firmware_validation',
        severity: 'error',
        title: 'Firmware validation error',
        description: `Validation failed for ${filePath}: ${error.message}`,
        metadata: { filePath, error: error.message }
      })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}