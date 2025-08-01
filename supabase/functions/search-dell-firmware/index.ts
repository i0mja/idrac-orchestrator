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
  checksum?: string;
  componentType?: string;
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

    // Try to get real Dell firmware data from catalog
    const realResults = await searchDellFirmware(model, firmwareType);
    
    if (realResults.length > 0) {
      console.log('Found', realResults.length, 'real firmware items from Dell catalog');
      return new Response(
        JSON.stringify({ 
          results: realResults,
          source: 'dell_catalog',
          totalCount: realResults.length,
          model: model,
          firmwareType: firmwareType || 'all'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fallback to enhanced sample data with clear indication
    console.log('Dell catalog unavailable, returning enhanced sample firmware data');
    const sampleResults = await generateRealisticSamples(model, firmwareType);

    return new Response(
      JSON.stringify({ 
        results: sampleResults,
        source: 'sample_data',
        notice: 'Unable to connect to Dell servers. Showing enhanced sample data for demonstration.',
        totalCount: sampleResults.length,
        model: model,
        firmwareType: firmwareType || 'all'
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
    // Method 1: Try to fetch real Dell Catalog.xml.gz (like the Python script)
    console.log('Attempting to fetch Dell Catalog.xml.gz');
    const catalogResponse = await fetch('https://downloads.dell.com/Catalog/Catalog.xml.gz', {
      headers: {
        'User-Agent': 'iDRAC-Updater/1.0 (Dell Firmware Management)',
        'Accept': 'application/gzip, */*'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (catalogResponse.ok) {
      console.log('Successfully fetched Dell catalog');
      const catalogBuffer = await catalogResponse.arrayBuffer();
      
      // Decompress the gzip data
      const decompressed = new Response(catalogBuffer).body?.pipeThrough(new DecompressionStream('gzip'));
      const catalogXml = await new Response(decompressed).text();
      
      console.log('Catalog decompressed, parsing XML...');
      const results = await parseDellCatalog(catalogXml, model, firmwareType);
      
      if (results.length > 0) {
        console.log(`Found ${results.length} firmware items from Dell catalog`);
        return results;
      } else {
        console.log('No firmware found in Dell catalog for specified model');
      }
    } else {
      throw new Error(`Failed to fetch catalog: ${catalogResponse.status}`);
    }

  } catch (error) {
    console.error('Dell catalog fetch failed:', error);
  }

  return [];
}

async function parseDellCatalog(catalogXml: string, model: string, firmwareType?: string): Promise<DellFirmwareItem[]> {
  const results: DellFirmwareItem[] = [];
  
  try {
    // Parse XML using DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(catalogXml, 'text/xml');
    
    // Find software bundles for the specified model
    const softwareBundles = xmlDoc.querySelectorAll('SoftwareBundle');
    const modelLower = model.toLowerCase().replace(/\s+/g, '').replace('poweredge', '');
    
    console.log(`Searching ${softwareBundles.length} software bundles for model: ${model}`);
    
    for (const bundle of softwareBundles) {
      const bundlePath = bundle.getAttribute('path') || '';
      
      // Check if bundle is for the requested model (more flexible matching)
      if (!bundlePath.toLowerCase().includes(modelLower) && 
          !bundlePath.toLowerCase().includes(model.toLowerCase())) {
        continue;
      }
      
      // Check target systems
      const targetModels = bundle.querySelectorAll('TargetSystems Brand Model Display');
      let modelMatch = false;
      
      for (const targetModel of targetModels) {
        const targetText = targetModel.textContent?.toLowerCase() || '';
        if (targetText.includes(modelLower) || targetText.includes(model.toLowerCase())) {
          modelMatch = true;
          break;
        }
      }
      
      if (!modelMatch) continue;
      
      console.log(`Found bundle for model: ${model}`);
      
      // Process packages in this bundle
      const packages = bundle.querySelectorAll('Contents Package');
      for (const pkg of packages) {
        const packagePath = pkg.getAttribute('path');
        if (!packagePath) continue;
        
        // Find corresponding software component
        const components = xmlDoc.querySelectorAll('SoftwareComponent');
        for (const component of components) {
          const componentPath = component.getAttribute('path');
          if (componentPath !== packagePath) continue;
          
          const name = component.querySelector('Name Display')?.textContent || 'Unknown';
          const componentTypeElement = component.querySelector('ComponentType');
          const componentType = componentTypeElement?.getAttribute('value') || '';
          const category = componentTypeElement?.querySelector('Display')?.textContent || 'Other';
          
          // Filter by firmware type if specified
          if (firmwareType && firmwareType !== 'all') {
            const typeMatch = mapComponentTypeToFirmwareType(componentType, category);
            if (typeMatch !== firmwareType) {
              continue;
            }
          }
          
          // Extract firmware details
          const version = component.querySelector('DellVersion')?.textContent || 
                         component.querySelector('VendorVersion')?.textContent || '1.0.0';
          const description = component.querySelector('Description Display')?.textContent || '';
          const releaseDate = component.querySelector('ReleaseDate')?.textContent || new Date().toISOString();
          const checksum = component.getAttribute('hashMD5') || '';
          const fileSize = parseInt(component.getAttribute('size') || '0');
          
          // Get supported models from the bundle
          const supportedModels: string[] = [];
          for (const targetModel of targetModels) {
            const modelName = targetModel.textContent;
            if (modelName) supportedModels.push(modelName);
          }
          
          const firmwareItem: DellFirmwareItem = {
            id: `dell-${componentPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name,
            version,
            releaseDate,
            fileSize,
            downloadUrl: `https://downloads.dell.com/${componentPath}`,
            category,
            description,
            supportedModels: supportedModels.length > 0 ? supportedModels : [model],
            checksum,
            componentType
          };
          
          results.push(firmwareItem);
        }
      }
    }
    
    console.log(`Parsed ${results.length} firmware items from Dell catalog`);
    return results;
    
  } catch (error) {
    console.error('Error parsing Dell catalog:', error);
    throw error;
  }
}

function mapComponentTypeToFirmwareType(componentType: string, category: string): string {
  const type = (componentType + ' ' + category).toLowerCase();
  
  if (type.includes('frmw') || type.includes('idrac') || type.includes('systems management')) return 'idrac';
  if (type.includes('bios') || type.includes('system bios')) return 'bios';
  if (type.includes('storage') || type.includes('raid') || type.includes('sas') || type.includes('sata')) return 'storage';
  if (type.includes('network') || type.includes('ethernet') || type.includes('nic')) return 'network';
  
  return 'other';
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