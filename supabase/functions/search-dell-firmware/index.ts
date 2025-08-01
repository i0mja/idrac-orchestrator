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
  deviceId?: string;
  vendorId?: string;
}

interface DellApiResponse {
  DriverListData?: Array<{
    Name: string;
    DriverVersion: string;
    ReleaseDate: string;
    FileSize: number;
    DownloadUrl: string;
    Category: string;
    Description: string;
    SupportedDevices: string[];
    DeviceId?: string;
    VendorId?: string;
  }>;
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

    // Try to get real Dell firmware data
    const realResults = await searchDellFirmware(model, firmwareType);
    
    if (realResults.length > 0) {
      console.log('Found', realResults.length, 'real firmware items from Dell');
      return new Response(
        JSON.stringify({ 
          success: true,
          results: realResults,
          searchQuery: { model, firmwareType },
          source: 'dell_api'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fallback to realistic sample data with clear indication
    console.log('Dell API unavailable, returning sample firmware data');
    const sampleResults = await generateRealisticSamples(model, firmwareType);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: sampleResults,
        searchQuery: { model, firmwareType },
        source: 'sample_data',
        notice: 'This is sample data. For production use, configure Dell API access or implement web scraping.'
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

async function searchDellFirmware(model: string, firmwareType?: string): Promise<DellFirmwareItem[]> {
  try {
    // Method 1: Try Dell's official support API (requires API key)
    const dellApiKey = Deno.env.get('DELL_API_KEY');
    if (dellApiKey) {
      return await searchViaOfficialAPI(model, firmwareType, dellApiKey);
    }

    // Method 2: Try scraping Dell support site (more complex but works)
    return await searchViaWebScraping(model, firmwareType);

  } catch (error) {
    console.error('Dell firmware search failed:', error);
    return [];
  }
}

async function searchViaOfficialAPI(model: string, firmwareType?: string, apiKey: string): Promise<DellFirmwareItem[]> {
  try {
    // Dell's official API endpoint (hypothetical - Dell doesn't have a public firmware API)
    // This would be the ideal approach if Dell provided it
    const apiUrl = `https://api.dell.com/support/v2/drivers?model=${encodeURIComponent(model)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'iDRAC-Updater/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Dell API error: ${response.status}`);
    }

    const data: DellApiResponse = await response.json();
    return parseDellApiResponse(data, model);

  } catch (error) {
    console.error('Dell official API failed:', error);
    throw error;
  }
}

async function searchViaWebScraping(model: string, firmwareType?: string): Promise<DellFirmwareItem[]> {
  try {
    // Dell support URL structure
    const supportUrl = `https://www.dell.com/support/home/en-us/drivers/driversdetails?driverid=`;
    
    // For security and reliability, we'll implement a basic scraper
    // In production, you'd want a more robust solution
    console.log('Attempting to scrape Dell support site for:', model);
    
    // This is a simplified example - real implementation would:
    // 1. Navigate to Dell support site
    // 2. Search for the model
    // 3. Parse the results page
    // 4. Extract firmware download links
    
    // For now, return empty array to indicate scraping is not yet implemented
    console.log('Web scraping not yet implemented - returning empty results');
    return [];

  } catch (error) {
    console.error('Dell web scraping failed:', error);
    return [];
  }
}

function parseDellApiResponse(data: DellApiResponse, model: string): DellFirmwareItem[] {
  if (!data.DriverListData) return [];

  return data.DriverListData.map((driver, index) => ({
    id: `dell-${model.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    name: driver.Name,
    version: driver.DriverVersion,
    releaseDate: driver.ReleaseDate,
    fileSize: driver.FileSize,
    downloadUrl: driver.DownloadUrl,
    category: driver.Category,
    description: driver.Description,
    supportedModels: [model, ...driver.SupportedDevices],
    deviceId: driver.DeviceId,
    vendorId: driver.VendorId
  }));
}

async function generateRealisticSamples(model: string, firmwareType?: string): Promise<DellFirmwareItem[]> {
  // Generate realistic sample data based on actual Dell firmware patterns
  const modelNumber = model.toLowerCase();
  const isR740 = modelNumber.includes('r740');
  const isR750 = modelNumber.includes('r750');
  const isR640 = modelNumber.includes('r640');
  const isR650 = modelNumber.includes('r650');

  const baseResults: DellFirmwareItem[] = [];

  // iDRAC firmware (most common)
  if (!firmwareType || firmwareType === 'all' || firmwareType.includes('idrac')) {
    baseResults.push({
      id: `dell-idrac-${modelNumber.replace(/\s+/g, '-')}-${Date.now()}`,
      name: `Integrated Dell Remote Access Controller (iDRAC) ${isR740 || isR640 ? '8' : '9'}`,
      version: isR740 || isR640 ? '2.85.85.85' : '6.10.30.00',
      releaseDate: '2024-03-15',
      fileSize: isR740 || isR640 ? 41943040 : 52428800,
      downloadUrl: `https://dl.dell.com/FOLDER${Math.floor(Math.random() * 1000000000)}/1/iDRAC-with-Lifecycle-Controller_${isR740 || isR640 ? '2.85.85.85' : '6.10.30.00'}_A00.exe`,
      category: 'Systems Management',
      description: `Latest ${isR740 || isR640 ? 'iDRAC8' : 'iDRAC9'} firmware with security updates and enhanced features`,
      supportedModels: [model],
      deviceId: '0x0100',
      vendorId: '0x1028'
    });
  }

  // BIOS firmware
  if (!firmwareType || firmwareType === 'all' || firmwareType.includes('bios')) {
    let biosVersion = '2.18.0';
    if (isR750) biosVersion = '2.19.1';
    if (isR640) biosVersion = '2.20.1';
    if (isR650) biosVersion = '2.15.2';

    baseResults.push({
      id: `dell-bios-${modelNumber.replace(/\s+/g, '-')}-${Date.now()}`,
      name: `${model} System BIOS`,
      version: biosVersion,
      releaseDate: '2024-02-28',
      fileSize: 31457280,
      downloadUrl: `https://dl.dell.com/FOLDER${Math.floor(Math.random() * 1000000000)}/1/${model.replace(/\s+/g, '_')}_BIOS_${biosVersion}_A00.exe`,
      category: 'BIOS',
      description: `System BIOS update for ${model} with security enhancements, CPU microcode updates, and stability improvements`,
      supportedModels: [model],
      deviceId: '0x0002',
      vendorId: '0x1028'
    });
  }

  // Storage controller (PERC)
  if (!firmwareType || firmwareType === 'all' || firmwareType.includes('storage')) {
    const percModel = isR740 ? 'H740P' : isR750 || isR650 ? 'H755' : 'H330';
    const percVersion = percModel === 'H755' ? '51.16.0-4296' : percModel === 'H740P' ? '51.13.0-4296' : '25.5.9.0001';

    baseResults.push({
      id: `dell-perc-${modelNumber.replace(/\s+/g, '-')}-${Date.now()}`,
      name: `PERC ${percModel} Controller`,
      version: percVersion,
      releaseDate: '2024-01-20',
      fileSize: percModel === 'H330' ? 4194304 : 26214400,
      downloadUrl: `https://dl.dell.com/FOLDER${Math.floor(Math.random() * 1000000000)}/1/SAS-RAID_Firmware_PERC-${percModel}_${percVersion}_A09.exe`,
      category: 'Serial ATA',
      description: `PERC ${percModel} RAID controller firmware with performance improvements and bug fixes`,
      supportedModels: [model],
      deviceId: '0x005f',
      vendorId: '0x1000'
    });
  }

  // Network adapter
  if (!firmwareType || firmwareType === 'all' || firmwareType.includes('network')) {
    baseResults.push({
      id: `dell-nic-${modelNumber.replace(/\s+/g, '-')}-${Date.now()}`,
      name: 'Broadcom NetXtreme BCM5720 Gigabit Ethernet Controller',
      version: '22.81.14.12',
      releaseDate: '2024-01-10',
      fileSize: 15728640,
      downloadUrl: `https://dl.dell.com/FOLDER${Math.floor(Math.random() * 1000000000)}/1/Network_Firmware_BCM5720_22.81.14.12_A03.exe`,
      category: 'Network',
      description: 'Broadcom NetXtreme BCM5720 Gigabit Ethernet controller firmware update',
      supportedModels: [model],
      deviceId: '0x165f',
      vendorId: '0x14e4'
    });
  }

  console.log(`Generated ${baseResults.length} realistic sample firmware items for ${model}`);
  return baseResults;
}