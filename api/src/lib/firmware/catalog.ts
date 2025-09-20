import { gunzipSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { DEFAULT_DELL_CATALOG_URL } from '../redfish/client.js';
import { OrchestrationError } from '../errors.js';

interface FirmwareCatalogEntry {
  id: string;
  version: string;
  url: string;
  componentType?: string;
  supportedModels?: string[];
  releaseDate?: string;
}

interface CatalogCacheEntry {
  entries: FirmwareCatalogEntry[];
  fetchedAt: number;
  source: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const cache = new Map<string, CatalogCacheEntry>();
const CACHE_TTL_MS = 30 * 60_000;

export interface CatalogOptions {
  catalogUrl?: string;
  forceRefresh?: boolean;
}

export async function fetchDellCatalog(options: CatalogOptions = {}): Promise<FirmwareCatalogEntry[]> {
  const source = options.catalogUrl ?? DEFAULT_DELL_CATALOG_URL;
  const cached = cache.get(source);
  if (cached && !options.forceRefresh && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.entries;
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new OrchestrationError(`Failed to download catalog: ${response.status}`, 'transient', { host: source });
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const decompressed = buffer.slice(0, 2).toString('hex') === '1f8b' ? gunzipSync(buffer) : buffer;
  const xml = parser.parse(decompressed.toString());
  const packages = normalizeCatalog(xml);
  cache.set(source, { entries: packages, fetchedAt: Date.now(), source });
  return packages;
}

function normalizeCatalog(data: any): FirmwareCatalogEntry[] {
  const packages = data?.Manifest?.SoftwareComponent ?? data?.Catalog?.SoftwareComponent ?? [];
  return (Array.isArray(packages) ? packages : [packages]).filter(Boolean).map((pkg: any) => ({
    id: pkg?.Id ?? pkg?.packageID ?? pkg?.Name,
    version: pkg?.version ?? pkg?.Version,
    url: pkg?.path ?? pkg?.Path,
    componentType: pkg?.ComponentType ?? pkg?.ComponentTypeCode ?? pkg?.Type,
    supportedModels: Array.isArray(pkg?.SupportedSystems?.Brand)
      ? pkg.SupportedSystems.Brand.map((brand: any) => brand?.Display?.Name ?? brand?.Name).filter(Boolean)
      : undefined,
    releaseDate: pkg?.releaseDate ?? pkg?.ReleaseDate
  }));
}

export function findLatestFirmware(entries: FirmwareCatalogEntry[], componentType: string, model?: string) {
  return entries
    .filter(entry => entry.componentType?.toLowerCase() === componentType.toLowerCase())
    .filter(entry => !model || entry.supportedModels?.some(m => m?.toLowerCase().includes(model.toLowerCase())))
    .sort((a, b) => new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime())[0];
}
