import type { Readable } from 'node:stream';
import type { ErrorClassification } from '../errors.js';

export type ProtocolType = 'REDFISH' | 'WSMAN' | 'RACADM' | 'IPMI' | 'SSH';

export type DellGeneration = '11G' | '12G' | '13G' | '14G' | '15G' | '16G' | 'UNKNOWN';

export interface Credentials {
  username: string;
  password: string;
  privateKey?: string;
  port?: number;
}

export interface ServerIdentity {
  host: string;
  fqdn?: string;
  model?: string;
  serviceTag?: string;
  generation?: DellGeneration;
  firmwareVersion?: string;
  vcenterId?: string | null;
}

export interface FirmwareComponentRequest {
  id: string;
  name?: string;
  imageUri?: string;
  fileName?: string;
  stream?: Readable;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export type FirmwareUpdateMode =
  | 'SIMPLE_UPDATE'
  | 'INSTALL_FROM_REPOSITORY'
  | 'MULTIPART_UPDATE'
  | 'OS_DRIVER_UPDATE'
  | 'CUSTOM_PROTOCOL';

export interface FirmwareUpdateRequest {
  host: string;
  credentials: Credentials;
  mode: FirmwareUpdateMode;
  components: FirmwareComponentRequest[];
  repositoryUrl?: string;
  applyTime?: 'Immediate' | 'OnReset' | 'AtMaintenanceWindowStart';
  maintenanceWindowStart?: string;
  maintenanceWindowDurationSeconds?: number;
  installUpon?: 'Immediate' | 'OnReset';
  additionalParams?: Record<string, unknown>;
}

export interface FirmwareUpdateResult {
  protocol: ProtocolType;
  taskLocation?: string | null;
  jobId?: string | null;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  messages: string[];
  inventoryChanges?: Array<{ componentId: string; previousVersion?: string; newVersion?: string }>;
  startedAt: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface ProtocolCapability {
  protocol: ProtocolType;
  supported: boolean;
  firmwareVersion?: string;
  managerType?: string;
  generation?: DellGeneration;
  updateModes: FirmwareUpdateMode[];
  raw?: unknown;
}

export interface ProtocolHealth {
  protocol: ProtocolType;
  status: 'healthy' | 'degraded' | 'unreachable';
  latencyMs?: number;
  checkedAt: number;
  details?: string;
  lastErrorClassification?: ErrorClassification;
}

export interface ProtocolClient {
  readonly protocol: ProtocolType;
  readonly priority: number;
  detectCapability(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolCapability>;
  healthCheck(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolHealth>;
  performFirmwareUpdate(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult>;
  close?(): Promise<void>;
}

export interface ProtocolDetectionResult {
  identity: ServerIdentity;
  capabilities: ProtocolCapability[];
  healthiestProtocol?: ProtocolCapability;
}

export interface ProtocolFallbackContext {
  attempt: number;
  error: unknown;
  protocol: ProtocolType;
}
