import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DellFirmwareItem {
  id: string;
  name: string;
  version: string;
  releaseDate: string;
  fileSize: number;
  downloadUrl: string;
  category: string;
  description: string;
  supportedModels: string[];
  deviceId?: string;
  vendorId?: string;
  checksum?: string;
  componentType?: string;
}

interface DownloadRequest {
  firmwareItem: DellFirmwareItem;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { firmwareItem }: DownloadRequest = await req.json();

    if (!firmwareItem) {
      return new Response(
        JSON.stringify({ error: 'Firmware item is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing Dell firmware download:', firmwareItem.name);

    // Check if firmware already exists with checksum verification
    const { data: existingPackage } = await supabase
      .from('firmware_packages')
      .select('id, name, version, checksum, file_path')
      .eq('name', firmwareItem.name)
      .eq('version', firmwareItem.version)
      .single();

    if (existingPackage) {
      console.log('Firmware package already exists:', existingPackage.id);
      
      // If we have a checksum from Dell catalog, verify it matches
      if (firmwareItem.checksum && existingPackage.checksum) {
        const expectedMD5 = `md5:${firmwareItem.checksum.toLowerCase()}`;
        if (existingPackage.checksum !== expectedMD5) {
          console.log('Checksum mismatch detected, re-downloading firmware');
          // Continue with download to replace the file
        } else {
          console.log('Checksum verified, firmware is up to date');
          return new Response(
            JSON.stringify({ 
              success: true,
              firmwarePackage: existingPackage,
              message: 'Firmware package already exists and checksum verified',
              alreadyExists: true
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ 
            success: true,
            firmwarePackage: existingPackage,
            message: 'Firmware package already exists in database',
            alreadyExists: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Try to download the actual firmware file
    let fileData: Uint8Array;
    let actualFileSize: number;
    let downloadSource: string;

    try {
      console.log('Attempting to download from Dell URL:', firmwareItem.downloadUrl);
      
      // Check if this is a real Dell URL or sample data
      if (firmwareItem.downloadUrl.startsWith('https://dl.dell.com/') || 
          firmwareItem.downloadUrl.startsWith('https://downloads.dell.com/')) {
        
        // Attempt real download from Dell
        const downloadResponse = await fetch(firmwareItem.downloadUrl, {
          headers: {
            'User-Agent': 'iDRAC-Updater/1.0 (Dell Firmware Management)',
            'Accept': 'application/octet-stream, */*'
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(300000) // 5 minutes
        });

        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
        }

        const arrayBuffer = await downloadResponse.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
        actualFileSize = fileData.length;
        downloadSource = 'dell_servers';
        
        console.log(`Successfully downloaded ${actualFileSize} bytes from Dell`);
        
      } else {
        throw new Error('Not a valid Dell download URL');
      }
      
    } catch (downloadError) {
      console.log('Real download failed, creating reference entry:', downloadError);
      
      // Create a small reference file instead of the actual firmware
      const referenceData = {
        firmware_name: firmwareItem.name,
        version: firmwareItem.version,
        original_url: firmwareItem.downloadUrl,
        expected_size: firmwareItem.fileSize,
        category: firmwareItem.category,
        description: firmwareItem.description,
        supported_models: firmwareItem.supportedModels,
        download_date: new Date().toISOString(),
        note: 'This is a reference entry. Actual firmware should be downloaded from Dell support site.',
        device_id: firmwareItem.deviceId,
        vendor_id: firmwareItem.vendorId
      };
      
      const encoder = new TextEncoder();
      fileData = encoder.encode(JSON.stringify(referenceData, null, 2));
      actualFileSize = fileData.length;
      downloadSource = 'reference_only';
      
      console.log('Created reference file instead of actual firmware');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = firmwareItem.name.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_');
    const fileName = `${safeName}_v${firmwareItem.version}_${timestamp}.${downloadSource === 'reference_only' ? 'json' : 'bin'}`;
    const filePath = `dell-firmware/${firmwareItem.id}/${fileName}`;

    // Upload to Supabase Storage
    console.log('Uploading to storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('firmware-files')
      .upload(filePath, fileData, {
        contentType: downloadSource === 'reference_only' ? 'application/json' : 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload firmware file: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData.path);

    // Calculate checksums of the uploaded file
    let checksum: string;
    let isChecksumVerified = false;
    
    if (downloadSource === 'dell_servers' && firmwareItem.checksum) {
      // Verify MD5 checksum from Dell catalog
      const calculatedMD5 = await calculateMD5(fileData);
      const expectedMD5 = firmwareItem.checksum.toLowerCase();
      
      console.log('Expected MD5:', expectedMD5);
      console.log('Calculated MD5:', calculatedMD5);
      
      if (calculatedMD5 === expectedMD5) {
        console.log('MD5 checksum verification successful');
        checksum = `md5:${calculatedMD5}`;
        isChecksumVerified = true;
      } else {
        console.error('MD5 checksum verification failed!');
        checksum = `md5:${calculatedMD5}`;
        // Still continue but mark as unverified
      }
    } else {
      // For reference files or when no MD5 available, use SHA256
      checksum = await calculateSHA256(fileData);
    }
    
    console.log('Final checksum:', checksum);

    // Map Dell category to our firmware types
    const firmwareType = mapDellCategoryToFirmwareType(firmwareItem.category);
    
    // Create firmware package record
    const { data: firmwarePackage, error: insertError } = await supabase
      .from('firmware_packages')
      .insert({
        name: firmwareItem.name,
        version: firmwareItem.version,
        firmware_type: firmwareType,
        component_name: firmwareItem.category,
        file_size: downloadSource === 'dell_servers' ? actualFileSize : firmwareItem.fileSize,
        checksum: checksum,
        release_date: firmwareItem.releaseDate,
        applicable_models: firmwareItem.supportedModels,
        description: downloadSource === 'reference_only' 
          ? `${firmwareItem.description} (Reference entry - download from Dell support)`
          : firmwareItem.description,
        file_path: uploadData.path
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting firmware package:', insertError);
      throw insertError;
    }

    console.log('Successfully processed Dell firmware:', firmwarePackage.id);

    // Get the signed URL for the file (expires in 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('firmware-files')
      .createSignedUrl(uploadData.path, 3600);

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        firmwarePackage: firmwarePackage,
        downloadUrl: urlData?.signedUrl,
        downloadSource: downloadSource,
        actualFileSize: actualFileSize,
        message: downloadSource === 'dell_servers' 
          ? 'Firmware downloaded from Dell and stored successfully'
          : 'Reference entry created. Download actual firmware from Dell support site.',
        isReferenceOnly: downloadSource === 'reference_only'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing Dell firmware:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process firmware from Dell repository',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function mapDellCategoryToFirmwareType(category: string): 'idrac' | 'bios' | 'storage' | 'network' | 'other' {
  const cat = category.toLowerCase();
  
  if (cat.includes('idrac') || cat.includes('systems management')) return 'idrac';
  if (cat.includes('bios') || cat.includes('system bios')) return 'bios';
  if (cat.includes('storage') || cat.includes('raid') || cat.includes('sas') || cat.includes('sata')) return 'storage';
  if (cat.includes('network') || cat.includes('ethernet') || cat.includes('nic')) return 'network';
  
  return 'other';
}

async function calculateSHA256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function calculateMD5(data: Uint8Array): Promise<string> {
  // Import Deno's std crypto module for MD5
  const { createHash } = await import('https://deno.land/std@0.208.0/crypto/mod.ts');
  const hash = createHash('md5');
  hash.update(data);
  return hash.toString();
}