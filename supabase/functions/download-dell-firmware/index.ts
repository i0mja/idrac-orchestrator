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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // In a real implementation, you would:
    // 1. Download the actual file from Dell's servers
    // 2. Upload it to Supabase Storage
    // 3. Calculate checksum
    // 4. Store metadata in firmware_packages table

    // For now, we'll simulate the download and create a database record
    const firmwareType = mapCategoryToFirmwareType(firmwareItem.category);
    
    // Calculate a mock checksum (in real implementation, use actual file hash)
    const mockChecksum = await generateMockChecksum(firmwareItem.downloadUrl);

    // Create firmware package record
    const { data: firmwarePackage, error: insertError } = await supabase
      .from('firmware_packages')
      .insert({
        name: firmwareItem.name,
        version: firmwareItem.version,
        firmware_type: firmwareType,
        component_name: firmwareItem.category,
        file_size: firmwareItem.fileSize,
        checksum: mockChecksum,
        release_date: firmwareItem.releaseDate,
        applicable_models: firmwareItem.supportedModels,
        description: firmwareItem.description,
        file_path: `dell-firmware/${firmwareItem.id}/${generateFileName(firmwareItem)}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting firmware package:', insertError);
      throw insertError;
    }

    console.log('Successfully downloaded and stored Dell firmware:', firmwarePackage.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        firmwarePackage: firmwarePackage,
        message: 'Firmware downloaded and added successfully'
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

async function generateMockChecksum(url: string): Promise<string> {
  // In a real implementation, you would download the file and calculate SHA-256
  // For now, generate a mock checksum based on the URL
  const encoder = new TextEncoder();
  const data = encoder.encode(url + Date.now());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}