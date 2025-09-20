import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchDellCatalog } from './catalog.js';
import { findLatestFirmware } from './catalog.js';
import { sortUpdateOrder, validateCompatibility } from './compatibility.js';
import type { DellGeneration } from '../protocols/types.js';
import { OrchestrationError } from '../errors.js';

export interface FirmwareComponentPlan {
  component: string;
  imageUri: string;
  version?: string;
  checksum?: string;
}

export interface FirmwarePlanOptions {
  generation: DellGeneration;
  model?: string;
  components: string[];
  catalogUrl?: string;
  customRepositoryPath?: string;
}

export interface FirmwarePlanResult {
  components: FirmwareComponentPlan[];
  incompatibilities: Array<{ component: string; reasons: string[] }>;
}

export async function buildFirmwarePlan(options: FirmwarePlanOptions): Promise<FirmwarePlanResult> {
  const sortedComponents = sortUpdateOrder(options.components);
  const entries = await fetchDellCatalog({ catalogUrl: options.catalogUrl });
  const result: FirmwareComponentPlan[] = [];
  const incompatibilities: Array<{ component: string; reasons: string[] }> = [];

  for (const component of sortedComponents) {
    const compatibility = validateCompatibility({
      component,
      generation: options.generation,
      appliedComponents: result.map(item => item.component)
    });
    if (!compatibility.supported) {
      incompatibilities.push({ component, reasons: compatibility.reasons ?? ['Unsupported component'] });
      continue;
    }

    const catalogEntry = findLatestFirmware(entries, component, options.model);
    if (!catalogEntry) {
      incompatibilities.push({ component, reasons: ['No matching catalog entry'] });
      continue;
    }

    let imageUri = catalogEntry.url;
    if (options.customRepositoryPath) {
      const localPath = path.join(options.customRepositoryPath, path.basename(catalogEntry.url));
      try {
        await fs.access(localPath);
        imageUri = `file://${localPath}`;
      } catch {
        // keep remote URI
      }
    }

    result.push({
      component,
      imageUri,
      version: catalogEntry.version
    });
  }

  if (result.length === 0) {
    throw new OrchestrationError('No compatible firmware components discovered', 'permanent', { metadata: { incompatibilities } });
  }

  return { components: result, incompatibilities };
}
