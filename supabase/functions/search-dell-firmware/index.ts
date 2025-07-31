import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  model: string;
  firmwareType?: string;
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, firmwareType }: SearchRequest = await req.json();

    if (!model) {
      return new Response(
        JSON.stringify({ error: 'Model is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Searching Dell firmware for model:', model, 'type:', firmwareType);

    // Dell Support API search
    // Note: This is a simplified implementation. In reality, you'd need to:
    // 1. Use Dell's official API if available
    // 2. Implement proper web scraping with error handling
    // 3. Handle pagination and rate limiting
    
    const searchUrl = `https://www.dell.com/support/home/en-us/product-support/servicetag/0-${encodeURIComponent(model)}/drivers`;
    
    // For now, we'll simulate Dell firmware search results
    // In a real implementation, you would scrape or use Dell's API
    const mockResults: DellFirmwareItem[] = await generateMockDellResults(model, firmwareType);

    console.log('Found', mockResults.length, 'firmware items');

    return new Response(
      JSON.stringify({ 
        success: true,
        results: mockResults,
        searchQuery: { model, firmwareType }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error searching Dell firmware:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to search Dell firmware repository',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateMockDellResults(model: string, firmwareType?: string): Promise<DellFirmwareItem[]> {
  // This is a mock implementation
  // In a real implementation, you would:
  // 1. Make HTTP requests to Dell's support site or API
  // 2. Parse HTML or JSON responses
  // 3. Extract firmware information
  
  const baseResults: DellFirmwareItem[] = [
    {
      id: `dell-idrac-${model.toLowerCase().replace(/\s+/g, '-')}-1`,
      name: 'iDRAC with Lifecycle Controller',
      version: '7.00.00.00',
      releaseDate: '2024-01-15',
      fileSize: 52428800, // 50MB
      downloadUrl: 'https://downloads.dell.com/FOLDER09876543210/1/iDRAC-with-Lifecycle-Controller_Firmware_7.00.00.00_A00.exe',
      category: 'iDRAC',
      description: 'Dell iDRAC with Lifecycle Controller firmware for remote management',
      supportedModels: [model, `${model}xd`]
    },
    {
      id: `dell-bios-${model.toLowerCase().replace(/\s+/g, '-')}-1`,
      name: 'System BIOS',
      version: '2.19.1',
      releaseDate: '2024-02-10',
      fileSize: 31457280, // 30MB
      downloadUrl: 'https://downloads.dell.com/FOLDER09876543211/1/BIOS_2.19.1_A00.exe',
      category: 'BIOS',
      description: 'System BIOS update with security enhancements and bug fixes',
      supportedModels: [model]
    },
    {
      id: `dell-storage-${model.toLowerCase().replace(/\s+/g, '-')}-1`,
      name: 'PERC H740P Controller',
      version: '51.16.0-4296',
      releaseDate: '2024-01-28',
      fileSize: 26214400, // 25MB
      downloadUrl: 'https://downloads.dell.com/FOLDER09876543212/1/SAS-RAID_Firmware_51.16.0-4296_A09.exe',
      category: 'Storage',
      description: 'PERC H740P RAID controller firmware update',
      supportedModels: [model, `${model}xd`, `${model}xs`]
    },
    {
      id: `dell-network-${model.toLowerCase().replace(/\s+/g, '-')}-1`,
      name: 'Broadcom NetXtreme BCM5720',
      version: '22.81.14.11',
      releaseDate: '2024-01-20',
      fileSize: 15728640, // 15MB
      downloadUrl: 'https://downloads.dell.com/FOLDER09876543213/1/Network_Firmware_22.81.14.11_A03.exe',
      category: 'Network',
      description: 'Broadcom NetXtreme BCM5720 Gigabit Ethernet controller firmware',
      supportedModels: [model]
    }
  ];

  // Filter by firmware type if specified
  let filteredResults = baseResults;
  if (firmwareType && firmwareType !== 'all') {
    filteredResults = baseResults.filter(item => 
      item.category.toLowerCase().includes(firmwareType.toLowerCase())
    );
  }

  // Add some variation based on model
  return filteredResults.map(item => ({
    ...item,
    id: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    supportedModels: [model, ...item.supportedModels.filter(m => m !== model)]
  }));
}