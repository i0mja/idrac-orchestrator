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

    console.log('Downloading Dell firmware:', firmwareItem.name);

    // Download the actual firmware file
    console.log('Fetching firmware from URL:', firmwareItem.downloadUrl);
    
    // In a real implementation, you would download from Dell's servers
    // For now, we'll create a mock file to demonstrate the storage functionality
    const mockFileContent = generateMockFirmwareFile(firmwareItem);
    const fileName = generateFileName(firmwareItem);
    const filePath = `dell/${firmwareItem.id}/${fileName}`;

    // Upload to Supabase Storage
    console.log('Uploading to storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('firmware-files')
      .upload(filePath, mockFileContent, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload firmware file: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData.path);

    // Calculate checksum of the uploaded file
    const checksum = await calculateChecksum(mockFileContent);
    console.log('Calculated checksum:', checksum);

    // Create firmware package record with storage path
    const firmwareType = mapCategoryToFirmwareType(firmwareItem.category);
    
    const { data: firmwarePackage, error: insertError } = await supabase
      .from('firmware_packages')
      .insert({
        name: firmwareItem.name,
        version: firmwareItem.version,
        firmware_type: firmwareType,
        component_name: firmwareItem.category,
        file_size: firmwareItem.fileSize,
        checksum: checksum,
        release_date: firmwareItem.releaseDate,
        applicable_models: firmwareItem.supportedModels,
        description: firmwareItem.description,
        file_path: uploadData.path
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting firmware package:', insertError);
      throw insertError;
    }

    console.log('Successfully downloaded and stored Dell firmware:', firmwarePackage.id);

    // Get the public URL for the downloaded file
    const { data: urlData } = supabase.storage
      .from('firmware-files')
      .getPublicUrl(uploadData.path);

    return new Response(
      JSON.stringify({ 
        success: true,
        firmwarePackage: firmwarePackage,
        downloadUrl: urlData.publicUrl,
        message: 'Firmware downloaded and stored successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error downloading Dell firmware:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to download firmware from Dell repository',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function mapCategoryToFirmwareType(category: string): string {
  const type = category.toLowerCase();
  if (type.includes('idrac')) return 'idrac';
  if (type.includes('bios')) return 'bios';
  if (type.includes('storage') || type.includes('raid')) return 'storage';
  if (type.includes('network') || type.includes('nic')) return 'network';
  return 'other';
}

function generateFileName(item: DellFirmwareItem): string {
  const safeName = item.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
  const extension = item.downloadUrl.split('.').pop() || 'bin';
  return `${safeName}_v${item.version}.${extension}`;
}

function generateMockFirmwareFile(item: DellFirmwareItem): Uint8Array {
  // In a real implementation, you would download the actual file
  // For demo purposes, create a mock binary file with metadata
  const metadata = JSON.stringify({
    name: item.name,
    version: item.version,
    category: item.category,
    downloadedAt: new Date().toISOString(),
    originalUrl: item.downloadUrl
  });
  
  const encoder = new TextEncoder();
  const metadataBytes = encoder.encode(metadata);
  
  // Create a mock binary file (pad to approximate the expected file size)
  const mockData = new Uint8Array(Math.min(item.fileSize, 1024 * 1024)); // Cap at 1MB for demo
  mockData.set(metadataBytes, 0);
  
  // Fill the rest with mock binary data
  for (let i = metadataBytes.length; i < mockData.length; i++) {
    mockData[i] = Math.floor(Math.random() * 256);
  }
  
  return mockData;
}

async function calculateChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}